import { Sparkles, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center shadow-lg mb-3">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="rounded-3xl glass-strong p-6 shadow-xl">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-foreground/80 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

export function Banner({ kind, text }: { kind: "error" | "success" | "info"; text: string }) {
  const cls =
    kind === "error"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : kind === "success"
        ? "bg-success/10 text-success border-success/30"
        : "bg-warning/10 text-warning-foreground border-warning/40";
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Clock;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${cls}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
