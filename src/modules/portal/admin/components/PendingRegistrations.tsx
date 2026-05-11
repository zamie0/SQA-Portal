import { useState } from "react";
import { Check, Users as UsersIcon, X } from "lucide-react";
import type { PortalUser, UserRole, UserStatus } from "@/shared/state";

export function PendingRegistrations({
  pendingUsers,
  setUserStatus,
  setUserRole,
}: {
  pendingUsers: PortalUser[];
  setUserStatus: (id: string, status: UserStatus) => void;
  setUserRole: (id: string, role: UserRole) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UsersIcon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Pending registrations</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {pendingUsers.length}
        </span>
        {pendingUsers.length === 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            No registrations awaiting approval.
          </span>
        )}
      </div>
      <div className="space-y-2">
        {pendingUsers.map((user) => (
          <PendingUserRow
            key={user.id}
            user={user}
            setUserStatus={setUserStatus}
            setUserRole={setUserRole}
          />
        ))}
      </div>
    </div>
  );
}

function PendingUserRow({
  user,
  setUserStatus,
  setUserRole,
}: {
  user: PortalUser;
  setUserStatus: (id: string, status: UserStatus) => void;
  setUserRole: (id: string, role: UserRole) => void;
}) {
  const [role, setRole] = useState<UserRole>("intern");

  function approve() {
    setUserRole(user.id, role);
    setUserStatus(user.id, "approved");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/60 border border-white/60 p-3 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-white text-xs font-semibold">
          {(user.fullName || user.username).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {user.fullName} - @{user.username}
          </div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
      </div>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value as UserRole)}
        className="auth-input lg:w-32"
      >
        <option value="intern">Intern</option>
        <option value="staff">Staff</option>
      </select>
      <div className="flex items-center gap-2">
        <button
          onClick={approve}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-success text-success-foreground inline-flex items-center gap-1"
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button
          onClick={() => setUserStatus(user.id, "rejected")}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground inline-flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </div>
  );
}
