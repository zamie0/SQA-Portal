"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/state";
import { AuthLayout, Banner, Field } from "@/features/auth/components";

function ForgotPage() {
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) {
      setMsg({ kind: "error", text: "Enter your username or email." });
      return;
    }
    const ok = requestPasswordReset(id);
    if (ok) {
      setMsg({
        kind: "success",
        text: "📩 Password reset request sent. An admin will review it shortly.",
      });
      setId("");
    } else {
      setMsg({ kind: "error", text: "No account matches that username or email." });
    }
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll forward your request to an admin">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username or Email">
          <input className="auth-input" value={id} onChange={(e) => setId(e.target.value)} />
        </Field>
        {msg && <Banner kind={msg.kind} text={msg.text} />}
        <button
          type="submit"
          className="w-full rounded-xl bg-[image:var(--gradient-primary)] text-white font-medium py-2.5 shadow-md hover:opacity-95 transition"
        >
          Reset Password
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

export default ForgotPage;
