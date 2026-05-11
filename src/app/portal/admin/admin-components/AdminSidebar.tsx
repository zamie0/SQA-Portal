"use client";

import { useState, type ComponentType } from "react";
import {
  Activity,
  BookOpen,
  Box,
  Database,
  FileText,
  Image,
  Key,
  KeyRound,
  Layers,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { PendingRegistrations, PasswordResetRequests, AllUsers, Groups, Activities, GalleryImages, GuideDocuments, Guides, ProjectDocuments, Projects, ReportDocuments, Reports, SonarQubeConfigs, SonarQubeIssues, SonarQubeScans, TestbedColors, Testbeds, Tools, AuthTokens } from "./index";

type AdminMenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
};

const menuItems: AdminMenuItem[] = [
  { id: "groups", label: "Groups", icon: Users, category: "Authentication and Authorization" },
  { id: "activities", label: "Activities", icon: Activity, category: "Core" },
  { id: "gallery-images", label: "Gallery images", icon: Image, category: "Core" },
  { id: "guide-documents", label: "Guide documents", icon: FileText, category: "Core" },
  { id: "guides", label: "Guides", icon: BookOpen, category: "Core" },
  { id: "project-documents", label: "Project documents", icon: FileText, category: "Core" },
  { id: "projects", label: "Projects", icon: Layers, category: "Core" },
  { id: "report-documents", label: "Report documents", icon: FileText, category: "Core" },
  { id: "reports", label: "Reports", icon: FileText, category: "Core" },
  { id: "sonar-qube-configs", label: "Sonar qube configs", icon: Database, category: "Core" },
  { id: "sonar-qube-issues", label: "Sonar qube issues", icon: FileText, category: "Core" },
  { id: "sonar-qube-scans", label: "Sonar qube scans", icon: Activity, category: "Core" },
  { id: "testbed-colors", label: "Testbed colors", icon: Layers, category: "Core" },
  { id: "testbeds", label: "Testbeds", icon: Box, category: "Core" },
  { id: "tools", label: "Tools", icon: Wrench, category: "Core" },
  { id: "auth-tokens", label: "Auth tokens", icon: Key, category: "Knox" },
  { id: "pending-registrations", label: "Pending registrations", icon: Users, category: "User Management" },
  { id: "password-reset-requests", label: "Password reset requests", icon: KeyRound, category: "User Management" },
  { id: "all-users", label: "All users", icon: Users, category: "User Management" },
];

const categories = [
  "Authentication and Authorization",
  "Core",
  "Knox",
  "User Management",
] as const;

function renderContent(id: string, users: any[], resets: any[], setUserStatus: any, deleteUser: any, approveReset: any, rejectReset: any) {
  switch (id) {
    case "groups":
      return <Groups />;
    case "activities":
      return <Activities />;
    case "gallery-images":
      return <GalleryImages />;
    case "pending-registrations":
      return <PendingRegistrations pendingUsers={users.filter((u: any) => u.status === "pending")} setUserStatus={setUserStatus} />;
    case "password-reset-requests":
      return <PasswordResetRequests pendingResets={resets.filter((r: any) => r.status === "pending")} oldResets={resets.filter((r: any) => r.status !== "pending").slice(-10)} approveReset={approveReset} rejectReset={rejectReset} />;
    case "all-users":
      return <AllUsers otherUsers={users.filter((u: any) => u.status !== "pending")} setUserStatus={setUserStatus} deleteUser={deleteUser} />;
    case "guide-documents":
      return <GuideDocuments />;
    case "report-documents":
      return <ReportDocuments />;
    case "projects":
      return <Projects />;
    case "tools":
      return <Tools />;
    case "auth-tokens":
      return <AuthTokens />;
    case "guides":
      return <Guides />;

    case "sonar-qube-configs":
      return <SonarQubeConfigs />;
    case "sonar-qube-issues":
      return <SonarQubeIssues />;
    case "sonar-qube-scans":
      return <SonarQubeScans />;
    case "testbed-colors":
      return <TestbedColors />;
    case "testbeds":
      return <Testbeds />;
    default:
      return (
        <div className="rounded-3xl border border-border/70 bg-white/80 p-6 text-sm text-muted-foreground">
          Select an item from the sidebar to view details.
        </div>
      );
  }
}

export function AdminSidebar({ users, resets, setUserStatus, deleteUser, approveReset, rejectReset }: { users: any[], resets: any[], setUserStatus: any, deleteUser: any, approveReset: any, rejectReset: any }) {
  const [selectedId, setSelectedId] = useState(menuItems[0].id);
  const selected = menuItems.find((item) => item.id === selectedId) ?? menuItems[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl glass p-6 space-y-6">
        <div>
          <input
            type="search"
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
              {menuItems.filter((item) => item.category === category).map((item) => {
                const Icon = item.icon;
                const active = item.id === selectedId;
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
                    <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
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
            <p className="text-sm text-muted-foreground mt-1">Details and management tools for the selected item.</p>
          </div>
          <button className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:bg-white">
            History
          </button>
        </div>

        <div className="mt-6">{renderContent(selectedId, users, resets, setUserStatus, deleteUser, approveReset, rejectReset)}</div>
      </section>
    </div>
  );
}
