import { Users as UsersIcon, Trash2 } from "lucide-react";
import type { PortalUser, UserStatus } from "@/shared/state";

export function AllUsers({
  otherUsers,
  setUserStatus,
  deleteUser,
}: {
  otherUsers: PortalUser[];
  setUserStatus: (id: string, status: UserStatus) => void;
  deleteUser: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UsersIcon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">All users</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {otherUsers.length}
        </span>
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
    </div>
  );
}
