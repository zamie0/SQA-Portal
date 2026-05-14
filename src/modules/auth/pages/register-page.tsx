"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/shared/state";
import { AuthLayout, Banner, Field } from "@/modules/auth/components";

function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [msg, setMsg] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { username, fullName, email, password, confirm } = form;
    if (!username || !fullName || !email || !password) {
      setMsg({ kind: "error", text: "All fields are required." });
      return;
    }
    if (password.length < 6) {
      setMsg({ kind: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "error", text: "Passwords do not match." });
      return;
    }
    const res = await register({ username, fullName, email, password }).catch(() => null);
    if (!res) {
      setMsg({ kind: "error", text: "Unable to reach the registration server." });
      return;
    }
    if (!res.ok) {
      setMsg({
        kind: "error",
        text:
          res.reason === "username-taken"
            ? "Username already in use."
            : "Email already registered.",
      });
      return;
    }
    setMsg({
      kind: "success",
      text: "✅ Account created. Awaiting admin approval before you can sign in.",
    });
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <AuthLayout title="SQA Portal" subtitle="Create your account">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Username">
          <input
            className="auth-input"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
          />
        </Field>
        <Field label="Full Name">
          <input
            className="auth-input"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            className="auth-input"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password">
            <input
              type="password"
              className="auth-input"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </Field>
          <Field label="Confirm">
            <input
              type="password"
              className="auth-input"
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
            />
          </Field>
        </div>

        {msg && <Banner kind={msg.kind} text={msg.text} />}

        <button
          type="submit"
          className="w-full rounded-xl bg-[image:var(--gradient-primary)] text-white font-medium py-2.5 shadow-md hover:opacity-95 transition"
        >
          Register
        </button>

        <div className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            ← Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
