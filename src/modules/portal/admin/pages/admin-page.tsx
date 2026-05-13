"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { AdminConfirmProvider, AdminSidebar } from "@/modules/portal/admin/components";
import {
  emptyAdminOverview,
  type AdminOverview,
} from "@/modules/portal/admin/components/adminOverviewData";
import {
  AUTH_EVENT,
  approveReset,
  deleteUser,
  getAuthSnapshot,
  rejectReset,
  setUserRole,
  setUserStatus,
  type PortalUser,
  type ResetRequest,
} from "@/shared/state";
import { useAuth } from "@/shared/state";
import { ShieldCheck } from "lucide-react";

function AdminPage() {
  const currentUser = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [adminData, setAdminData] = useState<AdminOverview>(emptyAdminOverview);

  const refresh = useCallback(async () => {
    const [snapshot, overview] = await Promise.all([
      getAuthSnapshot().catch(() => ({ users: [], resets: [] })),
      fetch("/api/admin/overview")
        .then((response) => (response.ok ? response.json() : emptyAdminOverview))
        .catch(() => emptyAdminOverview),
    ]);
    setUsers(snapshot.users);
    setResets(snapshot.resets);
    setAdminData(overview);
  }, []);

  const onAdminMutate = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: currentUser?.id ?? null, ...payload }),
      });
      if (!response.ok) throw new Error(await response.text());
      await refresh();
    },
    [currentUser?.id, refresh],
  );

  useEffect(() => {
    let active = true;
    const refreshIfActive = async () => {
      const [snapshot, overview] = await Promise.all([
        getAuthSnapshot().catch(() => ({ users: [], resets: [] })),
        fetch("/api/admin/overview")
          .then((response) => (response.ok ? response.json() : emptyAdminOverview))
          .catch(() => emptyAdminOverview),
      ]);
      if (!active) return;
      setUsers(snapshot.users);
      setResets(snapshot.resets);
      setAdminData(overview);
    };
    void refreshIfActive();
    window.addEventListener(AUTH_EVENT, refreshIfActive);
    window.addEventListener("storage", refreshIfActive);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, refreshIfActive);
      window.removeEventListener("storage", refreshIfActive);
    };
  }, []);

  return (
    <RequireAuth admin>
      <Shell>
        <section className="rounded-3xl glass-strong p-8 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display">Admin panel</h1>
              <p className="text-muted-foreground text-sm">
                Approve users, assign roles, manage accounts and finalize password resets.
              </p>
            </div>
          </div>
        </section>

        <AdminConfirmProvider>
          <AdminSidebar
            users={users}
            resets={resets}
            adminData={adminData}
            setUserStatus={setUserStatus}
            setUserRole={setUserRole}
            deleteUser={deleteUser}
            approveReset={approveReset}
            rejectReset={rejectReset}
            onAdminMutate={onAdminMutate}
          />
        </AdminConfirmProvider>
      </Shell>
    </RequireAuth>
  );
}

export default AdminPage;
