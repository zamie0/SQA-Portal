import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — SQA Portal" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !pw) {
      setMsg({ kind: "error", text: "Enter your username/email and password." });
      return;
    }
    const res = login(id, pw);
    if (res.ok) {
      setMsg({ kind: "success", text: "✅ Login success. Redirecting…" });
      setTimeout(() => navigate({ to: "/" }), 400);
    } else if (res.reason === "pending") {
      setMsg({ kind: "info", text: "⏳ Account pending admin approval." });
    } else if (res.reason === "rejected") {
      setMsg({ kind: "error", text: "❌ Account was rejected. Contact an admin." });
    } else {
      setMsg({ kind: "error", text: "❌ Invalid username, email or password." });
    }
  }

  return (
    <AuthLayout title="SQA Portal" subtitle="Sign in to your workspace">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username or Email">
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
            className="auth-input"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
            className="auth-input"
          />
        </Field>

        {msg && <Banner kind={msg.kind} text={msg.text} />}

        <button
          type="submit"
          className="w-full rounded-xl bg-[image:var(--gradient-primary)] text-white font-medium py-2.5 shadow-md hover:opacity-95 transition"
        >
          Login
        </button>

        <div className="flex items-center justify-between text-xs">
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Forgot password?
          </Link>
          <Link to="/register" className="text-muted-foreground hover:text-foreground">
            Don't have an account? <span className="text-primary font-medium">Register now</span>
          </Link>
        </div>

        <div className="mt-3 rounded-xl bg-muted/60 border border-border p-3 text-[11px] text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">Demo admin</div>
          <div>
            Username: <code className="font-mono">adminpower</code>
          </div>
          <div>
            Password: <code className="font-mono">adminpowertocontrol</code>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

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
