"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn, User, Lock } from "lucide-react";
import { login } from "@/shared/state";
import { AuthLayout, Banner, Field } from "@/modules/auth/components";

function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !pw) {
      setMsg({ kind: "error", text: "Enter your username/email and password." });
      return;
    }
    const res = await login(id, pw).catch(() => null);
    if (!res) {
      setMsg({ kind: "error", text: "Unable to reach the login server." });
      return;
    }
    if (res.ok) {
      setMsg({ kind: "success", text: "Login successful. Redirecting…" });
      setTimeout(() => router.push("/"), 400);
    } else if (res.reason === "pending") {
      setMsg({ kind: "info", text: "Account pending admin approval." });
    } else if (res.reason === "rejected") {
      setMsg({ kind: "error", text: "Account was rejected. Contact an admin." });
    } else {
      setMsg({ kind: "error", text: "Invalid username, email or password." });
    }
  }

  return (
    <AuthLayout title="SQA Portal" subtitle="Sign in to your workspace">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username or Email">
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
              className="auth-input pl-10"
            />
          </div>
        </Field>
        <Field label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              className="auth-input pl-10"
            />
          </div>
        </Field>

        {msg && <Banner kind={msg.kind} text={msg.text} />}

        <button
          type="submit"
          className="w-full rounded-xl bg-[image:var(--gradient-primary)] text-white font-medium py-2.5 shadow-md hover:opacity-95 transition"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </span>
        </button>

        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="text-primary font-medium hover:underline">
            Forgot password?
          </Link>
          <Link href="/register" className="text-muted-foreground hover:text-foreground">
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

export default LoginPage;
