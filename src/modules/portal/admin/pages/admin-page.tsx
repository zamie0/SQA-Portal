"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import {
  AUTH_EVENT,
  approveReset,
  deleteUser,
  getAllUsers,
  getResetRequests,
  rejectReset,
  setUserStatus,
  type PortalUser,
  type ResetRequest,
} from "@/shared/state";
import { Check, X, ShieldCheck, KeyRound, Users as UsersIcon, Trash2 } from "lucide-react";

function AdminPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [resets, setResets] = useState<ResetRequest[]>([]);

  useEffect(() => {
    const refresh = () => {
      setUsers(getAllUsers());
      setResets(getResetRequests());
    };
    refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const pendingUsers = users.filter((u) => u.status === "pending");
  const otherUsers = users.filter((u) => u.status !== "pending");
  const pendingResets = resets.filter((r) => r.status === "pending");
  const oldResets = resets.filter((r) => r.status !== "pending").slice(-10);

  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Admin panel</h1>
            <p className="text-muted-foreground text-sm">
              Approve registrations, manage users and finalize password resets.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl glass p-6 mb-4">
        <Header
          icon={UsersIcon}
          title="Pending registrations"
          count={pendingUsers.length}
          empty="No registrations awaiting approval."
        />
        <div className="space-y-2 mt-3">
          {pendingUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-2xl bg-white/60 border border-white/60 p-3"
            >
              <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-white text-xs font-semibold">
                {(u.fullName || u.username).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {u.fullName} · @{u.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <button
                onClick={() => setUserStatus(u.id, "approved")}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-success text-success-foreground inline-flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                onClick={() => setUserStatus(u.id, "rejected")}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl glass p-6 mb-4">
        <Header
          icon={KeyRound}
          title="Password reset requests"
          count={pendingResets.length}
          empty="No reset requests pending."
        />
        <div className="space-y-2 mt-3">
          {pendingResets.map((r) => (
            <ResetRow key={r.id} reset={r} />
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
      </section>

      <section className="rounded-3xl glass p-6">
        <Header icon={UsersIcon} title="All users" count={otherUsers.length} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="text-left">
                <th className="py-2 px-2">User</th>
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherUsers.map((u) => (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="py-2 px-2 font-medium">
                    {u.fullName} · @{u.username}
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2 px-2 capitalize">{u.role}</td>
                  <td className="py-2 px-2">
                    <span
                      className={[
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        u.status === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive",
                      ].join(" ")}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.status === "rejected" && (
                        <button
                          onClick={() => setUserStatus(u.id, "approved")}
                          className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success"
                        >
                          Approve
                        </button>
                      )}
                      {u.status === "approved" && u.role !== "admin" && (
                        <button
                          onClick={() => setUserStatus(u.id, "rejected")}
                          className="text-xs px-2 py-1 rounded-lg bg-destructive/10 text-destructive"
                        >
                          Suspend
                        </button>
                      )}
                      {u.role !== "admin" && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          title="Delete user"
                          className="text-xs p-1 rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}

function Header({
  icon: Icon,
  title,
  count,
  empty,
}: {
  icon: typeof UsersIcon;
  title: string;
  count: number;
  empty?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        {count}
      </span>
      {count === 0 && empty && (
        <span className="ml-auto text-xs text-muted-foreground">{empty}</span>
      )}
    </div>
  );
}

function ResetRow({ reset }: { reset: ResetRequest }) {
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
        onClick={() => {
          approveReset(reset.id, pw);
          setPw("");
        }}
        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-success text-success-foreground disabled:opacity-50 inline-flex items-center gap-1"
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        onClick={() => rejectReset(reset.id)}
        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground inline-flex items-center gap-1"
      >
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}

export default AdminPage;
