import { KeyRound, Check, X } from "lucide-react";
import { useState } from "react";
import type { ResetRequest } from "@/shared/state";
import { useAdminConfirm } from "./useAdminConfirm";

export function PasswordResetRequests({
  pendingResets,
  oldResets,
  approveReset,
  rejectReset,
}: {
  pendingResets: ResetRequest[];
  oldResets: ResetRequest[];
  approveReset: (id: string, pw: string) => Promise<void>;
  rejectReset: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Password reset requests</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {pendingResets.length}
        </span>
        {pendingResets.length === 0 && (
          <span className="ml-auto text-xs text-muted-foreground">No reset requests pending.</span>
        )}
      </div>
      <div className="space-y-2 mt-3">
        {pendingResets.map((r) => (
          <ResetRow key={r.id} reset={r} approveReset={approveReset} rejectReset={rejectReset} />
        ))}
        {oldResets.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              Recent history ({oldResets.length})
            </summary>
            <div className="mt-2 space-y-1">
              {oldResets.map((r) => (
                <div
                  key={r.id}
                  className="text-xs px-3 py-2 rounded-lg bg-muted/40 flex justify-between"
                >
                  <span>@{r.username}</span>
                  <span className={r.status === "approved" ? "text-success" : "text-destructive"}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ResetRow({
  reset,
  approveReset,
  rejectReset,
}: {
  reset: ResetRequest;
  approveReset: (id: string, pw: string) => Promise<void>;
  rejectReset: (id: string) => Promise<void>;
}) {
  const confirm = useAdminConfirm();
  const [pw, setPw] = useState("");
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl bg-white/60 border border-white/60 p-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">@{reset.username}</div>
        <div className="text-xs text-muted-foreground">
          Requested {new Date(reset.createdAt).toLocaleString()}
        </div>
      </div>
      <input
        type="text"
        placeholder="New temporary password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="auth-input sm:w-56"
      />
      <button
        disabled={pw.length < 4}
        onClick={async () => {
          if (
            !(await confirm({
              title: "Approve password reset",
              message: `Approve password reset for @${reset.username}?`,
              confirmLabel: "Approve",
            }))
          )
            return;
          void approveReset(reset.id, pw);
          setPw("");
        }}
        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-success text-success-foreground disabled:opacity-50 inline-flex items-center gap-1"
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        onClick={async () => {
          if (
            !(await confirm({
              title: "Reject password reset",
              message: `Reject password reset for @${reset.username}?`,
              confirmLabel: "Reject",
              tone: "danger",
            }))
          )
            return;
          void rejectReset(reset.id);
        }}
        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground inline-flex items-center gap-1"
      >
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}
