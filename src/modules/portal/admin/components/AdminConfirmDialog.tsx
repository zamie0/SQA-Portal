"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminConfirmContext, type ConfirmOptions } from "./AdminConfirmContext";

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export function AdminConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  function confirm(options: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const tone = pending?.options.tone ?? "default";

  return (
    <AdminConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                  tone === "danger"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
                ].join(" ")}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">
                  {pending.options.title ?? "Confirm action"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {pending.options.message}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                {pending.options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                  tone === "danger"
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-primary hover:bg-primary/90",
                ].join(" ")}
              >
                {pending.options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminConfirmContext.Provider>
  );
}
