import { Search, Trash2, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import type { PortalUser, UserRole, UserStatus } from "@/shared/state";
import type { AdminRole } from "./adminOverviewData";
import { useAdminConfirm } from "./useAdminConfirm";

export function AllUsers({
  otherUsers,
  setUserStatus,
  setUserRole,
  deleteUser,
  roles,
}: {
  otherUsers: PortalUser[];
  setUserStatus: (id: string, status: UserStatus) => Promise<void>;
  setUserRole: (id: string, role: UserRole) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  roles: AdminRole[];
}) {
  const confirm = useAdminConfirm();
  const [search, setSearch] = useState("");
  const filteredUsers = otherUsers.filter((user) =>
    [user.fullName, user.username, user.email, user.role, user.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">All users</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {filteredUsers.length}
          </span>
        </div>
        <label className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            className="auth-input w-full pl-9 sm:w-72"
          />
        </label>
      </div>
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
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t border-border/60">
                <td className="py-2 px-2 font-medium">
                  {user.fullName} - @{user.username}
                </td>
                <td className="py-2 px-2 text-muted-foreground">{user.email}</td>
                <td className="py-2 px-2">
                  <RoleSelect user={user} roles={roles} setUserRole={setUserRole} />
                </td>
                <td className="py-2 px-2">
                  <span
                    className={[
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      user.status === "approved"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive",
                    ].join(" ")}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {user.status === "rejected" && (
                      <button
                        onClick={async () => {
                          if (
                            !(await confirm({
                              title: "Approve user",
                              message: `Approve ${user.fullName || user.username}?`,
                              confirmLabel: "Approve",
                            }))
                          )
                            return;
                          void setUserStatus(user.id, "approved");
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success"
                      >
                        Approve
                      </button>
                    )}
                    {user.status === "approved" && user.role !== "admin" && (
                      <button
                        onClick={async () => {
                          if (
                            !(await confirm({
                              title: "Suspend user",
                              message: `Suspend ${user.fullName || user.username}?`,
                              confirmLabel: "Suspend",
                              tone: "danger",
                            }))
                          )
                            return;
                          void setUserStatus(user.id, "rejected");
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-destructive/10 text-destructive"
                      >
                        Suspend
                      </button>
                    )}
                    {user.role !== "admin" && (
                      <button
                        onClick={async () => {
                          if (
                            !(await confirm({
                              title: "Delete user",
                              message: `Delete ${user.fullName || user.username}? This cannot be undone.`,
                              confirmLabel: "Delete",
                              tone: "danger",
                            }))
                          )
                            return;
                          void deleteUser(user.id);
                        }}
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
    </div>
  );
}

function RoleSelect({
  user,
  roles,
  setUserRole,
}: {
  user: PortalUser;
  roles: AdminRole[];
  setUserRole: (id: string, role: UserRole) => Promise<void>;
}) {
  const confirm = useAdminConfirm();
  if (user.role === "admin") return <span className="capitalize">{user.role}</span>;
  const assignableRoles = roles.filter((role) => role.id !== "pending");
  const currentRole = user.role === "pending" ? "member" : user.role;
  return (
    <select
      value={currentRole}
      onChange={async (event) => {
        const nextRole = event.target.value as UserRole;
        if (nextRole === currentRole) return;
        if (
          !(await confirm({
            title: "Change user role",
            message: `Change ${user.fullName || user.username}'s role to ${nextRole.replace(/_/g, " ")}?`,
            confirmLabel: "Change role",
          }))
        )
          return;
        void setUserRole(user.id, nextRole);
      }}
      className="auth-input min-w-28 py-1.5"
    >
      {assignableRoles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name ?? role.id}
        </option>
      ))}
    </select>
  );
}
