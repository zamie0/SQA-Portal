"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { AdminSidebar } from "@/modules/portal/admin/components";
import {
  AUTH_EVENT,
  approveReset,
  deleteUser,
  getAllUsers,
  getResetRequests,
  rejectReset,
  setUserRole,
  setUserStatus,
  type PortalUser,
  type ResetRequest,
} from "@/shared/state";
import { ShieldCheck } from "lucide-react";

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

        <AdminSidebar
          users={users}
          resets={resets}
          setUserStatus={setUserStatus}
          setUserRole={setUserRole}
          deleteUser={deleteUser}
          approveReset={approveReset}
          rejectReset={rejectReset}
        />
      </Shell>
    </RequireAuth>
  );
}

export default AdminPage;
