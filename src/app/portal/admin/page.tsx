"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { AdminSidebar } from "@/app/portal/admin/admin-components";
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
} from "@/state";
import {
  Activity,
  BookOpen,
  Box,
  Check,
  Database,
  FileText,
  Image,
  Key,
  KeyRound,
  Layers,
  Plus,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
  X,
} from "lucide-react";

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
                Approve registrations, manage users and finalize password resets.
              </p>
            </div>
          </div>
        </section>

        <AdminSidebar users={users} resets={resets} setUserStatus={setUserStatus} deleteUser={deleteUser} approveReset={approveReset} rejectReset={rejectReset} />


      </Shell>
    </RequireAuth>
  );
}

export default AdminPage;
