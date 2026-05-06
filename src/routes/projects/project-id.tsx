import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { Shell } from "@/shared/components/layout/Shell";
import { getProject, type Project } from "@/shared/lib/mock-data";
import {
  getUserProject,
  getProjectTabs,
  defaultTabsFor,
  ALL_TABS,
  type ProjectTabId,
  type UserProject,
} from "@/shared/lib/user-projects";
import { useEventTick } from "@/shared/lib/use-storage";
import { useState } from "react";
import {
  ArrowLeft,
  Play,
  Calendar,
  BarChart3,
  FileCode2,
  Bot,
  ListChecks,
  Network,
  Smartphone,
  Globe,
  Zap,
  MessageSquare,
  Settings as SettingsIcon,
  TrendingUp,
  FolderOpen,
} from "lucide-react";
import { OverviewTab } from "@/modules/projects/components/OverviewTab";
import { CasesTab } from "@/modules/projects/components/CasesTab";
import { ApiTab } from "@/modules/projects/components/ApiTab";
import { ScriptsTab } from "@/modules/projects/components/ScriptsTab";
import { MobileTab } from "@/modules/projects/components/MobileTab";
import { WebTab } from "@/modules/projects/components/WebTab";
import { ExecutionTab } from "@/modules/projects/components/ExecutionTab";
import { ResultsTab } from "@/modules/projects/components/ResultsTab";
import { RpaTab } from "@/modules/projects/components/RpaTab";
import { DiscussionTab } from "@/modules/projects/components/DiscussionTab";
import { SettingsTab } from "@/modules/projects/components/SettingsTab";
import { FilesTab } from "@/modules/projects/components/FilesTab";
import { CustomTabContent } from "@/modules/projects/components/CustomTabContent";

type ProjectLike = { kind: "mock"; project: Project } | { kind: "user"; project: UserProject };

export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ params }) => {
    const mock = getProject(params.projectId);
    if (mock) return { kind: "mock" as const, mock };
    // user projects load on the client; just return id for the component to resolve
    return { kind: "user" as const, mock: null, id: params.projectId };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.mock?.name ?? "Project"} — QE Hub` },
      {
        name: "description",
        content: loaderData?.mock?.description ?? "QE Hub project workspace.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <Shell>
        <div className="rounded-3xl glass p-10 text-center">
          <h1 className="text-2xl font-bold">Couldn't load project</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  },
  notFoundComponent: () => (
    <Shell>
      <div className="rounded-3xl glass p-10 text-center">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Link to="/projects" className="text-primary mt-3 inline-block">
          ← Back to projects
        </Link>
      </div>
    </Shell>
  ),
  component: ProjectDetail,
});

const TAB_META: Record<ProjectTabId, { label: string; icon: typeof Play }> = {
  overview: { label: "Overview", icon: BarChart3 },
  cases: { label: "Test Cases", icon: ListChecks },
  api: { label: "API Testing", icon: Network },
  scripts: { label: "Scripts", icon: FileCode2 },
  rpa: { label: "RPA Builder", icon: Bot },
  mobile: { label: "Mobile", icon: Smartphone },
  web: { label: "Web & Suites", icon: Globe },
  execution: { label: "Execution", icon: Zap },
  results: { label: "Results", icon: TrendingUp },
  files: { label: "Files", icon: FolderOpen },
  discussion: { label: "Discussion", icon: MessageSquare },
  settings: { label: "Settings", icon: SettingsIcon },
};

function ProjectDetail() {
  const data = Route.useLoaderData();
  useEventTick("qe-hub.project-tabs-changed");
  useEventTick("qe-hub.user-projects-changed");
  const [tab, setTab] = useState<ProjectTabId>("overview");

  const resolved: ProjectLike | null =
    data.kind === "mock"
      ? { kind: "mock", project: data.mock! }
      : (() => {
          if (typeof window === "undefined") return null;
          const u = getUserProject((data as { id: string }).id);
          return u ? { kind: "user", project: u } : null;
        })();

  if (!resolved) {
    return (
      <Shell>
        <div className="rounded-3xl glass p-10 text-center">
          <h1 className="text-2xl font-bold">Project not found</h1>
          <Link to="/projects" className="text-primary mt-3 inline-block">
            ← Back to projects
          </Link>
        </div>
      </Shell>
    );
  }

  const project = resolved.project;
  const isUser = resolved.kind === "user";
  const isRpa = project.type === "RPA";
  const projectId = project.id;

  const fallbackTabs = isUser
    ? (project as UserProject).tabs
    : defaultTabsFor(project.type).filter((t) => {
        if (t === "scripts" && isRpa) return false;
        if (t === "rpa" && !isRpa) return false;
        return true;
      });

  const enabledTabs = getProjectTabs(projectId, fallbackTabs);
  const activeTab = enabledTabs.includes(tab) ? tab : (enabledTabs[0] ?? "overview");

  const tabsList = enabledTabs.map((id) => ({ id, ...TAB_META[id] }));

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-7 mb-5 relative overflow-hidden">
        <div
          className={`absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br ${project.color} opacity-25 blur-3xl`}
        />
        <div className="relative">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> All projects
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {isUser && (resolved.project as UserProject).photo ? (
                <img
                  src={(resolved.project as UserProject).photo!}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div
                  className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${project.color} grid place-items-center text-white text-xl font-bold shadow-lg`}
                >
                  {project.initials}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/60 border border-white/70">
                    {project.type}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/60 border border-white/70 text-muted-foreground">
                    {project.members} members
                  </span>
                  {isUser && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">
                      Your project
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                  {project.description || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/schedule"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
              >
                <Calendar className="h-4 w-4" /> Schedule
              </Link>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg">
                <Play className="h-4 w-4 fill-white" /> Run all
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl glass mb-5 overflow-x-auto">
        {tabsList.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Render tab content. For user-created projects, mock-typed tabs render placeholders. */}
      {isUser ? (
        activeTab === "settings" ? (
          <UserSettingsTab
            project={resolved.project as UserProject}
            enabled={enabledTabs}
            fallback={fallbackTabs}
          />
        ) : activeTab === "files" ? (
          <FilesTab projectId={projectId} />
        ) : (
          <CustomTabContent
            projectId={projectId}
            tabId={activeTab}
            label={TAB_META[activeTab].label}
          />
        )
      ) : (
        <>
          {activeTab === "overview" && <OverviewTab project={project as Project} />}
          {activeTab === "cases" && <CasesTab project={project as Project} />}
          {activeTab === "api" && <ApiTab project={project as Project} />}
          {activeTab === "scripts" && <ScriptsTab project={project as Project} />}
          {activeTab === "rpa" && <RpaTab project={project as Project} />}
          {activeTab === "mobile" && <MobileTab project={project as Project} />}
          {activeTab === "web" && <WebTab project={project as Project} />}
          {activeTab === "execution" && <ExecutionTab project={project as Project} />}
          {activeTab === "results" && <ResultsTab project={project as Project} />}
          {activeTab === "files" && <FilesTab projectId={projectId} />}
          {activeTab === "discussion" && <DiscussionTab project={project as Project} />}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <SettingsTab project={project as Project} />
              <TabsToggle
                projectId={projectId}
                enabled={enabledTabs}
                fallback={fallbackTabs}
                type={project.type}
              />
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function UserSettingsTab({
  project,
  enabled,
  fallback,
}: {
  project: UserProject;
  enabled: ProjectTabId[];
  fallback: ProjectTabId[];
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-3xl glass p-6">
        <h3 className="font-semibold mb-4">Project info</h3>
        <div className="space-y-2 text-sm">
          <Row label="Name" value={project.name} />
          <Row label="Type" value={project.type} />
          <Row label="Created" value={new Date(project.createdAt).toLocaleString()} />
          <Row label="Members" value={String(project.members)} />
        </div>
      </div>
      <TabsToggle
        projectId={project.id}
        enabled={enabled}
        fallback={fallback}
        type={project.type}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function TabsToggle({
  projectId,
  enabled,
  fallback,
  type,
}: {
  projectId: string;
  enabled: ProjectTabId[];
  fallback: ProjectTabId[];
  type: "Test Automation" | "RPA";
}) {
  const [current, setCurrent] = useState<ProjectTabId[]>(enabled);
  const visible = ALL_TABS.filter((t) => {
    if (type === "RPA" && t.nonRpaOnly) return false;
    if (type !== "RPA" && t.rpaOnly) return false;
    return true;
  });

  function toggle(id: ProjectTabId) {
    if (id === "overview" || id === "settings") return;
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    setCurrent(next);
    void import("@/shared/lib/user-projects").then(({ setProjectTabs }) =>
      setProjectTabs(projectId, next),
    );
  }

  function reset() {
    setCurrent(fallback);
    void import("@/shared/lib/user-projects").then(({ setProjectTabs }) =>
      setProjectTabs(projectId, fallback),
    );
  }

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Workspace tabs</h3>
          <p className="text-xs text-muted-foreground">
            Show or hide tabs in this project's workspace.
          </p>
        </div>
        <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg glass">
          Reset
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {visible.map((t) => {
          const checked = current.includes(t.id);
          const locked = t.id === "overview" || t.id === "settings";
          return (
            <button
              key={t.id}
              disabled={locked}
              onClick={() => toggle(t.id)}
              className={[
                "text-left rounded-xl border p-3 text-sm transition",
                checked
                  ? "border-primary bg-primary/5"
                  : "border-white/70 bg-white/50 hover:bg-white",
                locked ? "opacity-70 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {checked ? "On" : "Off"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              {locked && <p className="text-[10px] text-muted-foreground mt-1">Always visible</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
