"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Download,
  FileUp,
  FolderOpen,
  Gauge,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Sparkles,
  TerminalSquare,
  Trash2,
  Users,
} from "lucide-react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

type RunStatus = "completed" | "failed" | "setup_required";

type RunSummary = {
  samples: number;
  failures: number;
  errorRate: number;
  averageMs: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughput: number | null;
};

type ProjectRun = {
  id: string;
  startedAt: string;
  status: RunStatus;
  fileName: string;
  scenarioName?: string;
  threads: number;
  rampUp: number;
  loops: number;
  message?: string;
  stdout?: string;
  stderr?: string;
  command?: string[];
  summary?: RunSummary;
};

type UploadedJmxRef = {
  fileId: string;
  fileName: string;
  scenarioId: string;
  scenarioName: string;
  createdAt: string;
};

type PerformanceProject = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastFileName?: string;
  uploadedJmx?: UploadedJmxRef;
  lastConfig: {
    jmeterPath: string;
    threads: number;
    rampUp: number;
    loops: number;
  };
  runs: ProjectRun[];
};

type HubApiResponse = {
  status: RunStatus;
  scenarioName?: string;
  message?: string;
  stdout?: string;
  stderr?: string;
  command?: string[];
  summary?: RunSummary;
  resultPath?: string;
  reportFileName?: string;
};

type FeedbackState = {
  tone: "error" | "success" | "info";
  text: string;
} | null;

type NumericConfigField = "threads" | "rampUp" | "loops";

type StoredReportFile = {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  downloadUrl: string;
  fileType?: string;
  status?: string;
  scenarioName?: string;
  viewUrl?: string;
};

const STORAGE_KEY = "sqa.performance-testing-hub.projects";

const DEFAULT_PROJECTS: PerformanceProject[] = [
  {
    id: "checkout-core",
    name: "Checkout Core",
    description: "High-traffic payment and order confirmation flows for release validation.",
    createdAt: "2026-05-01T09:00:00.000Z",
    lastConfig: { jmeterPath: "", threads: 40, rampUp: 20, loops: 2 },
    runs: [],
  },
  {
    id: "identity-gateway",
    name: "Identity Gateway",
    description: "Authentication APIs and token refresh endpoints under burst traffic.",
    createdAt: "2026-05-03T09:00:00.000Z",
    lastConfig: { jmeterPath: "", threads: 25, rampUp: 15, loops: 1 },
    runs: [],
  },
  {
    id: "catalog-search",
    name: "Catalog Search",
    description: "Search and listing requests tuned for ramp and response-time analysis.",
    createdAt: "2026-05-06T09:00:00.000Z",
    lastConfig: { jmeterPath: "", threads: 60, rampUp: 30, loops: 3 },
    runs: [],
  },
];

function PerformancePage() {
  const [projects, setProjects] = useState<PerformanceProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [runningProjectId, setRunningProjectId] = useState<string | null>(null);
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [reportFiles, setReportFiles] = useState<StoredReportFile[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    const storedProjects = readProjects();
    setProjects(storedProjects);
    setSelectedProjectId(storedProjects[0]?.id ?? "");
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    persistProjects(projects);
    void syncProjectsToBackend(projects);
  }, [projects]);

  useEffect(() => {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projects[0].id);
      return;
    }

    if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id ?? "");
    }
  }, [projects, selectedProjectId]);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  const selectedUpload = selectedProject?.uploadedJmx ?? null;
  const latestRun = selectedProject?.runs[0] ?? null;

  const loadProjectReports = useCallback(async (projectId: string) => {
    setReportsLoading(true);
    setReportsError(null);

    try {
      const response = await fetch(
        `/api/performance/results?projectId=${encodeURIComponent(projectId)}`,
        {
          cache: "no-store",
        },
      );
      const data = (await response.json()) as
        | { results: StoredReportFile[] }
        | { message?: string };
      const errorMessage = "message" in data ? data.message : undefined;

      if (!response.ok || !("results" in data)) {
        throw new Error(errorMessage ?? "Unable to load CSV result files.");
      }

      setReportFiles(data.results);
    } catch (error) {
      setReportFiles([]);
      setReportsError(error instanceof Error ? error.message : "Unable to load CSV result files.");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  async function syncProjectsToBackend(currentProjects: PerformanceProject[]) {
    if (currentProjects.length === 0) return;

    await fetch("/api/performance/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projects: currentProjects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
        })),
      }),
    }).catch(() => null);
  }

  useEffect(() => {
    if (!selectedProject) {
      setReportFiles([]);
      setReportsError(null);
      return;
    }

    void loadProjectReports(selectedProject.id);
  }, [loadProjectReports, selectedProject]);

  const metrics = useMemo(() => {
    const runs = projects.flatMap((project) => project.runs);
    const summaries = runs
      .map((run) => run.summary)
      .filter((summary): summary is RunSummary => Boolean(summary));
    const totalSamples = summaries.reduce((sum, summary) => sum + summary.samples, 0);
    const totalFailures = summaries.reduce((sum, summary) => sum + summary.failures, 0);
    const averageLatency =
      summaries.length > 0
        ? Math.round(
            summaries.reduce((sum, summary) => sum + summary.averageMs, 0) / summaries.length,
          )
        : null;
    const successRate =
      totalSamples > 0 ? (((totalSamples - totalFailures) / totalSamples) * 100).toFixed(1) : null;

    return {
      totalTestsRun: runs.length,
      projects: projects.length,
      averageLatency,
      successRate,
    };
  }, [projects]);

  function refreshProjects() {
    const storedProjects = readProjects();
    setProjects(storedProjects);
    setFeedback({ tone: "info", text: "Project data refreshed from local storage." });
  }

  function updateProject(
    projectId: string,
    updater: (project: PerformanceProject) => PerformanceProject,
  ) {
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? updater(project) : project)),
    );
  }

  function updateProjectConfig(projectId: string, field: NumericConfigField, value: number) {
    const clampedValue = clampConfigValue(field, value);
    updateProject(projectId, (project) => ({
      ...project,
      lastConfig: {
        ...project.lastConfig,
        [field]: clampedValue,
      },
    }));
  }

  async function onUploadFile(projectId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".jmx")) {
      setFeedback({ tone: "error", text: "Only .jmx files are accepted for performance runs." });
      return;
    }

    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    setUploadingProjectId(projectId);
    setFeedback({ tone: "info", text: `Uploading ${file.name}...` });

    try {
      const formData = new FormData();
      formData.append("projectId", project.id);
      formData.append("projectName", project.name);
      formData.append("projectDescription", project.description);
      formData.append("plan", file);

      const response = await fetch("/api/performance/uploads", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as
        | UploadedJmxRef
        | {
            message?: string;
            scenarioId?: string;
            scenarioName?: string;
            fileId?: string;
            fileName?: string;
            createdAt?: string;
          };

      if (
        !response.ok ||
        !("fileId" in data) ||
        typeof data.fileId !== "string" ||
        typeof data.fileName !== "string" ||
        typeof data.scenarioId !== "string" ||
        typeof data.scenarioName !== "string" ||
        typeof data.createdAt !== "string"
      ) {
        throw new Error(("message" in data && data.message) || "Unable to upload the JMX file.");
      }

      const uploadedJmx: UploadedJmxRef = {
        fileId: data.fileId,
        fileName: data.fileName,
        scenarioId: data.scenarioId,
        scenarioName: data.scenarioName,
        createdAt: data.createdAt,
      };

      updateProject(projectId, (current) => ({
        ...current,
        lastFileName: uploadedJmx.fileName,
        uploadedJmx,
      }));

      setFeedback({
        tone: "success",
        text: `${uploadedJmx.fileName} uploaded and linked to scenario "${uploadedJmx.scenarioName}".`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to upload the JMX file.",
      });
    } finally {
      setUploadingProjectId(null);
    }
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newProjectName.trim()) {
      setFeedback({ tone: "error", text: "Project name is required before creating a project." });
      return;
    }

    if (editingProjectId) {
      updateProject(editingProjectId, (project) => ({
        ...project,
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || "Custom performance workspace.",
      }));
      setDialogOpen(false);
      setEditingProjectId(null);
      setNewProjectName("");
      setNewProjectDescription("");
      setFeedback({ tone: "success", text: "Project details were updated." });
      return;
    }

    const projectId = makeId(newProjectName);
    const newProject: PerformanceProject = {
      id: projectId,
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || "Custom performance workspace.",
      createdAt: new Date().toISOString(),
      lastConfig: { jmeterPath: "", threads: 10, rampUp: 10, loops: 1 },
      runs: [],
    };

    setProjects((current) => [newProject, ...current]);
    setSelectedProjectId(projectId);
    setDialogOpen(false);
    setNewProjectName("");
    setNewProjectDescription("");
    setFeedback({ tone: "success", text: `${newProject.name} was added to the hub.` });
  }

  function openCreateDialog() {
    setEditingProjectId(null);
    setNewProjectName("");
    setNewProjectDescription("");
    setDialogOpen(true);
  }

  function openEditDialog(project: PerformanceProject) {
    setEditingProjectId(project.id);
    setNewProjectName(project.name);
    setNewProjectDescription(project.description);
    setDialogOpen(true);
  }

  function deleteProject(project: PerformanceProject) {
    const confirmed = window.confirm(`Delete "${project.name}" and its saved runs?`);
    if (!confirmed) return;

    setProjects((current) => {
      const remaining = current.filter((item) => item.id !== project.id);
      if (selectedProjectId === project.id) {
        setSelectedProjectId(remaining[0]?.id ?? "");
      }
      return remaining;
    });
    void fetch("/api/performance/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    }).catch(() => null);
    setFeedback({ tone: "success", text: `${project.name} was deleted.` });
  }

  async function runTest() {
    if (!selectedProject) return;

    const upload = selectedProject.uploadedJmx;
    if (!upload) {
      setFeedback({
        tone: "error",
        text:
          selectedProject.lastFileName && !selectedProject.uploadedJmx
            ? `Re-upload ${selectedProject.lastFileName} before running again.`
            : "Upload a .jmx file before starting the test.",
      });
      return;
    }

    setRunningProjectId(selectedProject.id);
    setFeedback({ tone: "info", text: `Running ${selectedProject.name} with ${upload.fileName}...` });

    const formData = new FormData();
    formData.append("projectId", selectedProject.id);
    formData.append("projectName", selectedProject.name);
    formData.append("uploadedFileId", upload.fileId);
    formData.append("threads", String(selectedProject.lastConfig.threads));
    formData.append("rampUp", String(selectedProject.lastConfig.rampUp));
    formData.append("loops", String(selectedProject.lastConfig.loops));
    formData.append("jmeterPath", selectedProject.lastConfig.jmeterPath.trim());

    try {
      const response = await fetch("/api/performance/hub-run", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as HubApiResponse;

      const run: ProjectRun = {
        id: makeId(`${selectedProject.id}-${Date.now()}`),
        startedAt: new Date().toISOString(),
        status: result.status,
        fileName: upload.fileName,
        scenarioName: "scenarioName" in result ? String((result as { scenarioName?: string }).scenarioName ?? "") : undefined,
        threads: selectedProject.lastConfig.threads,
        rampUp: selectedProject.lastConfig.rampUp,
        loops: selectedProject.lastConfig.loops,
        message: result.message,
        stdout: result.stdout,
        stderr: result.stderr,
        command: result.command,
        summary: result.summary,
      };

      updateProject(selectedProject.id, (project) => ({
        ...project,
        lastFileName: upload.fileName,
        runs: [run, ...project.runs].slice(0, 8),
      }));

      setFeedback({
        tone: response.ok ? "success" : "error",
        text:
          response.ok && result.summary
            ? `${selectedProject.name} finished. Avg response ${result.summary.averageMs}ms.`
            : (result.message ?? "The performance run finished with warnings."),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to run the performance test.";

      updateProject(selectedProject.id, (project) => ({
        ...project,
        runs: [
          {
            id: makeId(`${selectedProject.id}-${Date.now()}`),
            startedAt: new Date().toISOString(),
            status: "failed" as const,
            fileName: upload.fileName,
            scenarioName: upload.scenarioName,
            threads: project.lastConfig.threads,
            rampUp: project.lastConfig.rampUp,
            loops: project.lastConfig.loops,
            message,
          },
          ...project.runs,
        ].slice(0, 8),
      }));

      setFeedback({ tone: "error", text: message });
    } finally {
      await loadProjectReports(selectedProject.id);
      setRunningProjectId(null);
    }
  }

  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_55%)]" />
          <div className="absolute -top-16 right-10 h-44 w-44 rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/15 bg-slate-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-200">
                    Performance / Hub
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-primary/25 bg-primary/10 px-3 py-1 text-primary"
                  >
                    Python runner + JMeter
                  </Badge>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-lg shadow-primary/25">
                    <Gauge className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-display">
                      Performance Testing Hub
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm md:text-base text-muted-foreground">
                      Run automated load tests, analyze performance metrics, and ensure your
                      applications scale under pressure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={refreshProjects}
                  className="h-11 rounded-xl border-white/60 bg-white/60 px-4 shadow-sm backdrop-blur-xl"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  type="button"
                  onClick={openCreateDialog}
                  className="h-11 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-white shadow-lg shadow-primary/20"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </div>
            </div>

            {feedback && (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm",
                  feedback.tone === "error" &&
                    "border-destructive/20 bg-destructive/10 text-destructive",
                  feedback.tone === "success" && "border-success/20 bg-success/10 text-success",
                  feedback.tone === "info" && "border-white/50 bg-white/65 text-foreground",
                )}
              >
                {feedback.text}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={BarChart3}
            label="Total Tests Run"
            value={String(metrics.totalTestsRun)}
            hint="All saved project runs"
          />
          <MetricCard
            icon={FolderOpen}
            label="Projects"
            value={String(metrics.projects)}
            hint="Workspaces in this hub"
          />
          <MetricCard
            icon={Activity}
            label="Avg Response"
            value={metrics.averageLatency ? `${metrics.averageLatency} ms` : "--"}
            hint="Average across completed runs"
          />
          <MetricCard
            icon={Users}
            label="Success Rate"
            value={metrics.successRate ? `${metrics.successRate}%` : "--"}
            hint="Weighted by JMeter samples"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl glass p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Projects</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a workspace, attach a JMX plan, tune load parameters, and rerun safely.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-white/70 bg-white/60 px-3 py-1 text-muted-foreground"
              >
                {projects.length} active
              </Badge>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {projects.map((project) => {
                const projectSummary = project.runs[0]?.summary;
                const isActive = project.id === selectedProject?.id;

                return (
                  <div
                    key={project.id}
                    className={cn(
                      "rounded-3xl border p-5 text-left transition-all",
                      isActive
                        ? "border-primary/35 bg-slate-950 text-white shadow-lg shadow-primary/15"
                        : "border-white/70 bg-white/55 hover:bg-white/75",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedProjectId(project.id)}
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow"
                        aria-label={`Open ${project.name}`}
                      >
                        <Sparkles className="h-5 w-5" />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(project)}
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl border transition",
                            isActive
                              ? "border-white/15 bg-white/10 text-slate-100 hover:bg-white/15"
                              : "border-white/70 bg-white/70 text-muted-foreground hover:text-foreground",
                          )}
                          aria-label={`Edit ${project.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProject(project)}
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-xl border transition",
                            isActive
                              ? "border-white/15 bg-white/10 text-slate-100 hover:bg-destructive/20 hover:text-destructive-foreground"
                              : "border-white/70 bg-white/70 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                          )}
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-white/20 px-2.5 py-1 text-[11px]",
                            isActive
                              ? "bg-white/10 text-slate-200"
                              : "bg-white/70 text-muted-foreground",
                          )}
                        >
                          {project.runs.length} run{project.runs.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className="mt-4 block w-full text-left"
                    >
                      <div className="text-lg font-semibold">{project.name}</div>
                      <p
                        className={cn(
                          "mt-1 text-sm",
                          isActive ? "text-slate-300" : "text-muted-foreground",
                        )}
                      >
                        {project.description}
                      </p>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <ProjectMiniStat
                          label="Threads"
                          value={String(project.lastConfig.threads)}
                          active={isActive}
                        />
                        <ProjectMiniStat
                          label="Avg"
                          value={projectSummary ? `${projectSummary.averageMs}ms` : "--"}
                          active={isActive}
                        />
                        <ProjectMiniStat
                          label="Errors"
                          value={projectSummary ? `${projectSummary.errorRate}%` : "--"}
                          active={isActive}
                        />
                      </div>

                      <div
                        className={cn(
                          "mt-4 flex items-center justify-between text-xs",
                          isActive ? "text-slate-300" : "text-muted-foreground",
                        )}
                      >
                        <span>Created {formatDate(project.createdAt)}</span>
                        <span className="font-medium">
                          {project.lastFileName ? project.lastFileName : "No JMX uploaded"}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl glass p-6">
            {selectedProject ? (
              <ProjectWorkbench
                project={selectedProject}
                selectedUpload={selectedUpload}
                latestRun={latestRun}
                reportFiles={reportFiles}
                reportsLoading={reportsLoading}
                reportsError={reportsError}
                isRunning={runningProjectId === selectedProject.id}
                isUploading={uploadingProjectId === selectedProject.id}
                onFileUpload={onUploadFile}
                onConfigChange={updateProjectConfig}
                onJMeterPathChange={(value) =>
                  updateProject(selectedProject.id, (project) => ({
                    ...project,
                    lastConfig: {
                      ...project.lastConfig,
                      jmeterPath: value,
                    },
                  }))
                }
                onRefreshResults={() => loadProjectReports(selectedProject.id)}
                onRun={runTest}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-white/40 p-10 text-center text-sm text-muted-foreground">
                Create a project to start uploading JMX plans and running tests.
              </div>
            )}
          </div>
        </section>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-3xl border-white/70 bg-white/90 sm:max-w-xl">
            <form onSubmit={createProject}>
              <DialogHeader>
                <DialogTitle>
                  {editingProjectId ? "Edit performance project" : "Create performance project"}
                </DialogTitle>
                <DialogDescription>
                  {editingProjectId
                    ? "Update the project name and description for this workspace."
                    : "Add a workspace for a service, system flow, or release candidate you want to load test."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Project name
                  </label>
                  <Input
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    placeholder="Checkout Performance Regression"
                    className="h-11 rounded-xl border-white/70 bg-white/70"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Description
                  </label>
                  <Textarea
                    value={newProjectDescription}
                    onChange={(event) => setNewProjectDescription(event.target.value)}
                    placeholder="Short note about what this project covers."
                    className="min-h-28 rounded-xl border-white/70 bg-white/70"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingProjectId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[image:var(--gradient-primary)] text-white shadow-lg"
                >
                  {editingProjectId ? "Save Changes" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Shell>
    </RequireAuth>
  );
}

function ProjectWorkbench({
  project,
  selectedUpload,
  latestRun,
  reportFiles,
  reportsLoading,
  reportsError,
  isRunning,
  isUploading,
  onFileUpload,
  onConfigChange,
  onJMeterPathChange,
  onRefreshResults,
  onRun,
}: {
  project: PerformanceProject;
  selectedUpload: UploadedJmxRef | null;
  latestRun: ProjectRun | null;
  reportFiles: StoredReportFile[];
  reportsLoading: boolean;
  reportsError: string | null;
  isRunning: boolean;
  isUploading: boolean;
  onFileUpload: (projectId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onConfigChange: (projectId: string, field: NumericConfigField, value: number) => void;
  onJMeterPathChange: (value: string) => void;
  onRefreshResults: () => Promise<void>;
  onRun: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Open Project</div>
            <h2 className="mt-2 text-2xl font-bold font-display">{project.name}</h2>
            <p className="mt-2 text-sm text-slate-300">{project.description}</p>
          </div>
          <Badge className="border-white/10 bg-white/10 text-slate-100">
            {project.runs.length} saved run{project.runs.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">JMX Upload</div>
              <p className="mt-1 text-xs text-slate-400">
                Upload one JMeter plan file. The API only accepts `.jmx` files and numeric load
                inputs.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 shadow">
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Upload .jmx"}
              <input
                type="file"
                accept=".jmx"
                className="hidden"
                onChange={(event) => onFileUpload(project.id, event)}
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            {selectedUpload ? (
              <span>
                {selectedUpload.fileName}
                <span className="ml-2 text-slate-400">Scenario: {selectedUpload.scenarioName}</span>
              </span>
            ) : project.lastFileName ? (
              <span>
                Last uploaded file: {project.lastFileName}
                <span className="ml-2 text-slate-400">Re-upload required after refresh.</span>
              </span>
            ) : (
              <span>No JMX file uploaded yet.</span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">JMeter Path</span>
              <input
                type="text"
                value={project.lastConfig.jmeterPath}
                onChange={(event) => onJMeterPathChange(event.target.value)}
                placeholder="Optional: C:\\apache-jmeter\\bin\\jmeter.bat"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Leave blank to use the system PATH, or provide the full path to `jmeter.bat`,
              `jmeter.cmd`, `jmeter.exe`, or `jmeter`.
            </p>
          </div>
          <DarkNumberField
            label="Threads / Users"
            value={project.lastConfig.threads}
            min={1}
            max={500}
            onChange={(value) => onConfigChange(project.id, "threads", value)}
          />
          <DarkNumberField
            label="Ramp-up Period"
            value={project.lastConfig.rampUp}
            min={1}
            max={3600}
            onChange={(value) => onConfigChange(project.id, "rampUp", value)}
          />
          <DarkNumberField
            label="Loop Count"
            value={project.lastConfig.loops}
            min={1}
            max={1000}
            onChange={(value) => onConfigChange(project.id, "loops", value)}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Safe mode: the runner only invokes Python and JMeter with validated arguments.
          </div>
          <Button
            type="button"
            onClick={onRun}
            disabled={isRunning || isUploading || !selectedUpload}
            className="h-11 rounded-xl bg-[image:var(--gradient-primary)] px-5 text-white shadow-lg shadow-primary/25 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {isRunning ? "Running Test..." : "Run Test"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <RunSummaryPanel latestRun={latestRun} />
        <RunHistoryPanel runs={project.runs} />
        <ProjectResultsPanel
          projectName={project.name}
          reportFiles={reportFiles}
          loading={reportsLoading}
          error={reportsError}
          onRefresh={onRefreshResults}
        />
      </div>
    </div>
  );
}

function RunSummaryPanel({ latestRun }: { latestRun: ProjectRun | null }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TerminalSquare className="h-4 w-4 text-primary" />
        Latest Output
      </div>

      {!latestRun ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/50 p-6 text-sm text-muted-foreground">
          Run a project to see the JMeter log, command output, and result summary here.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{latestRun.fileName}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(latestRun.startedAt)} | {latestRun.threads} threads |{" "}
                {latestRun.rampUp}s ramp-up | {latestRun.loops} loops
              </div>
            </div>
            <StatusPill status={latestRun.status} />
          </div>

          {latestRun.summary ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ResultMetric label="Avg Response" value={`${latestRun.summary.averageMs} ms`} />
              <ResultMetric label="p95" value={`${latestRun.summary.p95Ms} ms`} />
              <ResultMetric
                label="Throughput"
                value={
                  latestRun.summary.throughput !== null
                    ? `${latestRun.summary.throughput} req/s`
                    : "--"
                }
              />
              <ResultMetric
                label="Success Rate"
                value={`${(100 - latestRun.summary.errorRate).toFixed(1)}%`}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
              {latestRun.message ??
                "A structured summary was not generated for this run. Check the log output below."}
            </div>
          )}

          {latestRun.command && latestRun.command.length > 0 && (
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-200">
              <div className="mb-2 uppercase tracking-[0.2em] text-slate-400">Command</div>
              <code className="break-all">{latestRun.command.join(" ")}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RunHistoryPanel({ runs }: { runs: ProjectRun[] }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart3 className="h-4 w-4 text-primary" />
        Recent Runs
      </div>

      {runs.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/50 p-6 text-sm text-muted-foreground">
          No runs have been saved for this project yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{run.fileName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(run.startedAt)} | {run.threads} threads | {run.loops} loops
                  </div>
                </div>
                <StatusPill status={run.status} />
              </div>

              {run.summary && (
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <HistoryMetric label="Avg" value={`${run.summary.averageMs}ms`} />
                  <HistoryMetric label="p95" value={`${run.summary.p95Ms}ms`} />
                  <HistoryMetric label="Samples" value={String(run.summary.samples)} />
                  <HistoryMetric label="Errors" value={`${run.summary.errorRate}%`} />
                </div>
              )}

              {!run.summary && run.message && (
                <p className="mt-3 text-sm text-muted-foreground">{run.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectResultsPanel({
  projectName,
  reportFiles,
  loading,
  error,
  onRefresh,
}: {
  projectName: string;
  reportFiles: StoredReportFile[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Test Results</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated report files for {projectName}, saved under
            `src/app/tools/performance/reports`.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="h-10 rounded-xl border-white/70 bg-white/70 px-4"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh results
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/50 p-6 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading CSV results...
          </div>
        </div>
      ) : reportFiles.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/50 p-6 text-sm text-muted-foreground">
          No test results yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reportFiles.map((file) => (
            <div
              key={file.fileName}
              className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{file.fileName}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{file.fileType ?? "CSV"}</span>
                  {file.scenarioName ? <span>Scenario {file.scenarioName}</span> : null}
                  {file.status ? <span>Status {file.status}</span> : null}
                  <span>Created {formatDateTime(file.createdAt)}</span>
                  <span>Size {formatFileSize(file.sizeBytes)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {file.viewUrl ? (
                  <a
                    href={file.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 text-sm font-medium text-foreground"
                  >
                    Open
                  </a>
                ) : null}
                <a
                  href={file.downloadUrl}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-medium text-white shadow-lg shadow-primary/15"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/88 p-5 text-white shadow-lg shadow-slate-950/15">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
          <Icon className="h-4 w-4 text-slate-100" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-bold font-display">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{hint}</div>
    </div>
  );
}

function ProjectMiniStat({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        active ? "border-white/10 bg-white/5" : "border-white/70 bg-white/55",
      )}
    >
      <div
        className={cn(
          "text-[11px] uppercase tracking-[0.16em]",
          active ? "text-slate-400" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function DarkNumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full bg-transparent text-lg font-semibold outline-none"
      />
    </label>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: RunStatus }) {
  const label =
    status === "completed"
      ? "Completed"
      : status === "setup_required"
        ? "Setup required"
        : "Failed";

  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        status === "completed" && "bg-success/15 text-success",
        status === "failed" && "bg-destructive/15 text-destructive",
        status === "setup_required" && "bg-amber-100 text-amber-900",
      )}
    >
      {label}
    </span>
  );
}

function readProjects() {
  if (typeof window === "undefined") return DEFAULT_PROJECTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROJECTS;
    const parsed = JSON.parse(raw) as PerformanceProject[];
    return Array.isArray(parsed) && parsed.length > 0 ? hydrateProjects(parsed) : DEFAULT_PROJECTS;
  } catch {
    return DEFAULT_PROJECTS;
  }
}

function persistProjects(projects: PerformanceProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function clampConfigValue(field: NumericConfigField, value: number) {
  const fallback = field === "loops" ? 1 : 10;
  const numeric = Number.isFinite(value) ? Math.round(value) : fallback;

  if (field === "threads") return Math.min(500, Math.max(1, numeric));
  if (field === "rampUp") return Math.min(3600, Math.max(1, numeric));
  return Math.min(1000, Math.max(1, numeric));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId(seed: string) {
  const normalized = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8);
  return `${normalized.replace(/^-+|-+$/g, "") || "project"}-${suffix}`;
}

function hydrateProjects(projects: PerformanceProject[]) {
  return projects.map((project) => ({
    ...project,
    uploadedJmx: project.uploadedJmx
      ? {
          fileId: project.uploadedJmx.fileId,
          fileName: project.uploadedJmx.fileName,
          scenarioId: project.uploadedJmx.scenarioId,
          scenarioName: project.uploadedJmx.scenarioName,
          createdAt: project.uploadedJmx.createdAt,
        }
      : undefined,
    lastConfig: {
      jmeterPath: project.lastConfig?.jmeterPath ?? "",
      threads: project.lastConfig?.threads ?? 10,
      rampUp: project.lastConfig?.rampUp ?? 10,
      loops: project.lastConfig?.loops ?? 1,
    },
  }));
}

export default PerformancePage;
