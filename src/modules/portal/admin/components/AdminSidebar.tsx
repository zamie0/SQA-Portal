"use client";

import { useState, type ComponentType } from "react";
import { Activity, Database, FileText, Key, KeyRound, Layers, Users, Wrench } from "lucide-react";
import { PendingRegistrations, PasswordResetRequests, AllUsers } from "./index";
import {
  AdminOverviewCards,
  AuditLogsView,
  PermissionsView,
  ProjectMembersView,
  ProjectsAdminView,
  ProjectToolsView,
  RolesView,
  SonarQubeConfigsView,
  SonarQubeIssuesView,
  SonarQubeScansView,
  ToolsAdminView,
  type AdminMutate,
} from "./AdminResourceViews";
import type { AdminOverview } from "./adminOverviewData";
import type { PortalUser, ResetRequest, UserRole, UserStatus } from "@/shared/state";

type AdminMenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
};

const menuItems: AdminMenuItem[] = [
  { id: "overview", label: "Overview", icon: Database, category: "Overview" },
  {
    id: "pending-registrations",
    label: "Pending registrations",
    icon: Users,
    category: "User Management",
  },
  {
    id: "password-reset-requests",
    label: "Password reset requests",
    icon: KeyRound,
    category: "User Management",
  },
  { id: "all-users", label: "All users", icon: Users, category: "User Management" },
  { id: "roles", label: "Roles", icon: Key, category: "Access Control" },
  { id: "permissions", label: "Permissions", icon: KeyRound, category: "Access Control" },
  { id: "projects", label: "Projects", icon: Layers, category: "Project Control" },
  { id: "project-members", label: "Project members", icon: Users, category: "Project Control" },
  { id: "tools", label: "Tools", icon: Wrench, category: "Tools" },
  { id: "project-tools", label: "Project tools", icon: Wrench, category: "Tools" },
  { id: "sonar-qube-configs", label: "SonarQube configs", icon: Database, category: "SonarQube" },
  { id: "sonar-qube-scans", label: "SonarQube scans", icon: Activity, category: "SonarQube" },
  { id: "sonar-qube-issues", label: "SonarQube issues", icon: FileText, category: "SonarQube" },
  { id: "audit-logs", label: "Audit logs", icon: Activity, category: "System" },
];

const categories = [
  "Overview",
  "User Management",
  "Access Control",
  "Project Control",
  "Tools",
  "SonarQube",
  "System",
] as const;

type AdminSidebarProps = {
  users: PortalUser[];
  resets: ResetRequest[];
  adminData: AdminOverview;
  setUserStatus: (id: string, status: UserStatus) => Promise<void>;
  setUserRole: (id: string, role: UserRole) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  approveReset: (id: string, password: string) => Promise<void>;
  rejectReset: (id: string) => Promise<void>;
  onAdminMutate: AdminMutate;
};

function renderContent(
  id: string,
  users: PortalUser[],
  resets: ResetRequest[],
  adminData: AdminOverview,
  setUserStatus: AdminSidebarProps["setUserStatus"],
  setUserRole: AdminSidebarProps["setUserRole"],
  deleteUser: AdminSidebarProps["deleteUser"],
  approveReset: AdminSidebarProps["approveReset"],
  rejectReset: AdminSidebarProps["rejectReset"],
  onAdminMutate: AdminSidebarProps["onAdminMutate"],
) {
  switch (id) {
    case "overview":
      return <AdminOverviewCards data={adminData} />;
    case "pending-registrations":
      return (
        <PendingRegistrations
          pendingUsers={users.filter((u) => u.status === "pending")}
          setUserStatus={setUserStatus}
          setUserRole={setUserRole}
          roles={adminData.roles}
        />
      );
    case "password-reset-requests":
      return (
        <PasswordResetRequests
          pendingResets={resets.filter((r) => r.status === "pending")}
          oldResets={resets.filter((r) => r.status !== "pending").slice(-10)}
          approveReset={approveReset}
          rejectReset={rejectReset}
        />
      );
    case "all-users":
      return (
        <AllUsers
          otherUsers={users.filter((u) => u.status !== "pending")}
          setUserStatus={setUserStatus}
          setUserRole={setUserRole}
          deleteUser={deleteUser}
          roles={adminData.roles}
        />
      );
    case "roles":
      return <RolesView data={adminData} onMutate={onAdminMutate} />;
    case "permissions":
      return <PermissionsView data={adminData} />;
    case "projects":
      return <ProjectsAdminView data={adminData} onMutate={onAdminMutate} />;
    case "project-members":
      return <ProjectMembersView data={adminData} onMutate={onAdminMutate} />;
    case "tools":
      return <ToolsAdminView data={adminData} onMutate={onAdminMutate} />;
    case "project-tools":
      return <ProjectToolsView data={adminData} onMutate={onAdminMutate} />;
    case "sonar-qube-configs":
      return <SonarQubeConfigsView data={adminData} />;
    case "sonar-qube-issues":
      return <SonarQubeIssuesView data={adminData} />;
    case "sonar-qube-scans":
      return <SonarQubeScansView data={adminData} />;
    case "audit-logs":
      return <AuditLogsView data={adminData} />;
    default:
      return (
        <div className="rounded-3xl border border-border/70 bg-white/80 p-6 text-sm text-muted-foreground">
          Select an item from the sidebar to view details.
        </div>
      );
  }
}

export function AdminSidebar({
  users,
  resets,
  adminData,
  setUserStatus,
  setUserRole,
  deleteUser,
  approveReset,
  rejectReset,
  onAdminMutate,
}: AdminSidebarProps) {
  const [selectedId, setSelectedId] = useState(menuItems[0].id);
  const [query, setQuery] = useState("");
  const pendingUsers = users.filter((user) => user.status === "pending").length;
  const selected = menuItems.find((item) => item.id === selectedId) ?? menuItems[0];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = menuItems.filter((item) =>
    [item.label, item.category].join(" ").toLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl glass p-6 space-y-6">
        <div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing to filter..."
            className="w-full rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {categories.map((category) => (
          <div key={category} className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">
              {category}
            </div>
            <div className="space-y-2">
              {menuItems
                .filter((item) => visibleItems.includes(item))
                .filter((item) => item.category === category)
                .map((item) => {
                  const Icon = item.icon;
                  const active = item.id === selectedId;
                  const count = item.id === "pending-registrations" ? pendingUsers : 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={
                        "group flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition " +
                        (active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 bg-white/70 text-foreground hover:bg-white")
                      }
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </span>
                      {count > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </aside>

      <section className="rounded-3xl glass p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
              {selected.category}
            </div>
            <h2 className="text-2xl font-semibold">{selected.label}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Details and management tools for the selected item.
            </p>
          </div>
          <button className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-white">
            Live data
          </button>
        </div>

        <div className="mt-6">
          {renderContent(
            selectedId,
            users,
            resets,
            adminData,
            setUserStatus,
            setUserRole,
            deleteUser,
            approveReset,
            rejectReset,
            onAdminMutate,
          )}
        </div>
      </section>
    </div>
  );
}
