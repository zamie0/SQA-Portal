"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import {
  changeUserEmail,
  changeUserPassword,
  getAllUsers,
  type PortalUser,
  useAuth,
  useEventTick,
} from "@/shared/state";
import { Bell, KeyRound, Mail, Save, Shield, UserCog, Users } from "lucide-react";

const notificationDefaults = [
  "Registration approvals",
  "Password reset requests",
  "Failed automation runs",
  "Weekly QA summary",
];

function SettingsPage() {
  const authTick = useEventTick("sqa.auth.changed");
  const user = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [emailForm, setEmailForm] = useState({ email: "", confirmEmail: "", password: "" });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [enabledNotifications, setEnabledNotifications] = useState<string[]>([
    "Registration approvals",
    "Failed automation runs",
  ]);

  useEffect(() => {
    let active = true;
    void getAllUsers()
      .then((next) => {
        if (active) setUsers(next);
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => {
      active = false;
    };
  }, [authTick]);

  async function saveEmail() {
    if (!user) return;
    if (emailForm.email !== emailForm.confirmEmail) {
      setEmailMessage("New email and confirmation do not match.");
      return;
    }
    const result = await changeUserEmail(user.id, emailForm.email, emailForm.password).catch(
      () => null,
    );
    if (!result) {
      setEmailMessage("Unable to change email.");
      return;
    }
    if (!result.ok) {
      setEmailMessage(
        result.reason === "bad-password"
          ? "Password is incorrect."
          : result.reason === "email-taken"
            ? "Email is already used by another account."
            : "Unable to change email.",
      );
      return;
    }
    setEmailForm({ email: "", confirmEmail: "", password: "" });
    setEmailMessage("Email changed.");
  }

  async function savePassword() {
    if (!user) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }
    const result = await changeUserPassword(
      user.id,
      passwordForm.oldPassword,
      passwordForm.newPassword,
    ).catch(() => null);
    if (!result) {
      setPasswordMessage("Unable to change password.");
      return;
    }
    if (!result.ok) {
      setPasswordMessage(
        result.reason === "bad-password"
          ? "Old password is incorrect."
          : "Unable to change password.",
      );
      return;
    }
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordMessage("Password changed.");
  }

  function toggleNotification(label: string) {
    setEnabledNotifications((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  return (
    <RequireAuth>
      <Shell>
        <div className="rounded-3xl glass-strong p-6 mb-5">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account details, security, notifications and team roles.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="rounded-3xl glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Email</h2>
            </div>
            <div className="space-y-3">
              <ReadonlyField label="Current email" value={user?.email ?? ""} />
              <Field
                label="New email"
                type="email"
                value={emailForm.email}
                onChange={(value) => setEmailForm((current) => ({ ...current, email: value }))}
              />
              <Field
                label="Confirm new email"
                type="email"
                value={emailForm.confirmEmail}
                onChange={(value) =>
                  setEmailForm((current) => ({ ...current, confirmEmail: value }))
                }
              />
              <Field
                label="Password"
                type="password"
                value={emailForm.password}
                onChange={(value) => setEmailForm((current) => ({ ...current, password: value }))}
              />
              <ActionRow message={emailMessage} onClick={saveEmail} label="Change email" />
            </div>
          </section>

          <section className="rounded-3xl glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Password</h2>
            </div>
            <div className="space-y-3">
              <Field
                label="Old password"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, oldPassword: value }))
                }
              />
              <Field
                label="New password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, newPassword: value }))
                }
              />
              <Field
                label="Confirm new password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, confirmPassword: value }))
                }
              />
              <ActionRow message={passwordMessage} onClick={savePassword} label="Change password" />
            </div>
          </section>

          <section className="rounded-3xl glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <div className="space-y-2">
              {notificationDefaults.map((item) => {
                const enabled = enabledNotifications.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleNotification(item)}
                    className="w-full flex items-center justify-between py-3 border-b border-white/50 last:border-b-0 text-left"
                  >
                    <span className="text-sm">{item}</span>
                    <span
                      className={`h-6 w-11 rounded-full transition ${enabled ? "bg-primary" : "bg-muted"} relative`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-5" : "left-0.5"}`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Team roles</h2>
            </div>
            <div className="space-y-2">
              {users.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-white/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] text-white grid place-items-center text-xs font-bold shrink-0">
                      {(account.fullName || account.username).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{account.fullName}</div>
                      <div className="text-xs text-muted-foreground truncate">{account.email}</div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${roleClass(account.role)}`}
                  >
                    {account.role}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl glass p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Account access</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <AccessCard icon={UserCog} label="Role" value={user?.role ?? "User"} />
              <AccessCard icon={Shield} label="Status" value={user?.status ?? "Active"} />
              <AccessCard
                icon={KeyRound}
                label="Last login"
                value={
                  user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Not recorded"
                }
              />
            </div>
          </section>
        </div>
      </Shell>
    </RequireAuth>
  );
}

function roleClass(role: string) {
  if (role === "admin") return "bg-primary/15 text-primary";
  if (role === "project_manager") return "bg-success/15 text-success";
  if (role === "project_leader") return "bg-warning/15 text-warning";
  if (role === "member") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="auth-input"
      />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="auth-input bg-white/40 text-muted-foreground">{value}</div>
    </div>
  );
}

function ActionRow({
  message,
  onClick,
  label,
}: {
  message: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="text-xs text-muted-foreground">{message}</span>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
      >
        <Save className="h-3.5 w-3.5" /> {label}
      </button>
    </div>
  );
}

function AccessCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/50 border border-white/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-lg font-bold capitalize">{value}</div>
    </div>
  );
}

export default SettingsPage;
