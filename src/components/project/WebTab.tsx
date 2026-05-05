import { useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/mock-data";
import {
  Globe,
  Plus,
  Play,
  Trash2,
  Upload,
  FileCode2,
  Monitor,
  Chrome,
  Settings2,
  Video,
  RefreshCw,
  Layers,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  AUTOMATION_EVENT,
  addWebEnv,
  addWebScript,
  getState,
  removeWebEnv,
  removeWebScript,
  startWebRun,
  updateWebEnv,
  type WebBrowser,
  type WebEnvironment,
} from "@/lib/automation-runs";
import { useEventTick } from "@/lib/use-storage";
import { RunResultsPanel } from "./RunResultsPanel";
import { MiniFilesPanel } from "./MiniFilesPanel";

const BROWSERS: { id: WebBrowser; label: string; tint: string }[] = [
  { id: "Chrome", label: "Chrome", tint: "from-amber-400 to-rose-500" },
  { id: "Edge", label: "Edge", tint: "from-sky-400 to-cyan-500" },
  { id: "Firefox", label: "Firefox", tint: "from-orange-400 to-rose-500" },
  { id: "Safari", label: "Safari", tint: "from-slate-400 to-slate-600" },
];

const SCREEN_SIZES = [
  { label: "1920 × 1080  (Desktop FHD)", w: 1920, h: 1080 },
  { label: "1440 × 900   (Laptop)", w: 1440, h: 900 },
  { label: "1366 × 768   (Common)", w: 1366, h: 768 },
  { label: "1024 × 768   (Tablet)", w: 1024, h: 768 },
  { label: "375  × 812   (Mobile)", w: 375, h: 812 },
];

export function WebTab({ project }: { project: Project }) {
  useEventTick(AUTOMATION_EVENT);
  const state = getState(project.id);
  const scriptInputRef = useRef<HTMLInputElement>(null);

  const [selBrowsers, setSelBrowsers] = useState<WebBrowser[]>(["Chrome"]);
  const [envId, setEnvId] = useState<string>(state.webEnvs[0]?.id ?? "");
  const [scriptId, setScriptId] = useState<string>("");
  const [headless, setHeadless] = useState(true);
  const [size, setSize] = useState(SCREEN_SIZES[0]);
  const [retry, setRetry] = useState(true);
  const [recordVideo, setRecordVideo] = useState(false);
  const [parallel, setParallel] = useState(true);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<WebEnvironment | null>(null);

  const latestRun = useMemo(
    () => state.runs.find((r) => r.kind === "web") ?? state.runs[0],
    [state.runs],
  );

  function toggleBrowser(b: WebBrowser) {
    setSelBrowsers((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : parallel ? [...prev, b] : [b],
    );
  }

  async function onScriptPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = await addWebScript(project.id, file);
    setScriptId(s.id);
    e.target.value = "";
  }

  function handleRun() {
    if (!envId || selBrowsers.length === 0) return;
    startWebRun(project.id, {
      browsers: parallel ? selBrowsers : selBrowsers.slice(0, 1),
      envId,
      scriptId: scriptId || undefined,
      headless,
      width: size.w,
      height: size.h,
      retry,
      recordVideo,
      parallel,
    });
  }

  const canRun = !!envId && selBrowsers.length > 0;
  const env = state.webEnvs.find((e) => e.id === envId);

  return (
    <div className="space-y-4">
      {/* Run console */}
      <div className="rounded-3xl glass-strong p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Web automation environment manager
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick browsers, environment, and script · run with Selenium / Playwright / Cypress
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={!canRun}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[image:var(--gradient-primary)] text-white text-sm font-semibold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 fill-white" />
            Run {selBrowsers.length > 1 && parallel ? `× ${selBrowsers.length}` : ""}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Browsers */}
          <Section
            icon={<Chrome className="h-4 w-4" />}
            title="Browsers"
            hint={parallel ? "Multi-select for parallel runs" : "Single browser"}
          >
            <div className="grid grid-cols-2 gap-2">
              {BROWSERS.map((b) => {
                const active = selBrowsers.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleBrowser(b.id)}
                    className={`relative overflow-hidden rounded-xl px-3 py-3 text-left text-sm font-medium transition border ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-white/70 bg-white/60 text-foreground hover:bg-white"
                    }`}
                  >
                    <div
                      className={`absolute -top-6 -right-6 h-14 w-14 rounded-full bg-gradient-to-br ${b.tint} opacity-30 blur-xl`}
                    />
                    <div className="relative flex items-center gap-2">
                      <Chrome className="h-4 w-4 opacity-80" />
                      {b.label}
                      {active && <Check className="ml-auto h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Environment */}
          <Section
            icon={<Globe className="h-4 w-4" />}
            title="Environment"
            action={
              <button
                onClick={() => {
                  setEditingEnv(null);
                  setShowEnvModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-foreground text-background"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            }
          >
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {state.webEnvs.map((e) => {
                const active = e.id === envId;
                return (
                  <div
                    key={e.id}
                    className={`group flex items-center gap-2 rounded-xl border p-2 transition ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-white/70 bg-white/60 hover:bg-white"
                    }`}
                  >
                    <button onClick={() => setEnvId(e.id)} className="flex-1 text-left min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${envDot(e.name)}`} />
                        {e.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {e.baseUrl}
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setEditingEnv(e);
                        setShowEnvModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => removeWebEnv(project.id, e.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Script */}
          <Section
            icon={<FileCode2 className="h-4 w-4" />}
            title="Script"
            action={
              <button
                onClick={() => scriptInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-foreground text-background"
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
            }
          >
            {state.webScripts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                No scripts yet. Upload .py / .js / .ts / .side
              </p>
            ) : (
              <select
                value={scriptId}
                onChange={(e) => setScriptId(e.target.value)}
                className="w-full text-sm bg-white/70 border border-white/70 rounded-lg px-2 py-2"
              >
                <option value="">— smoke flow (no script) —</option>
                {state.webScripts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.kind}
                  </option>
                ))}
              </select>
            )}
            <input
              ref={scriptInputRef}
              type="file"
              accept=".py,.js,.ts,.side,.feature,.txt"
              className="hidden"
              onChange={onScriptPicked}
            />
          </Section>
        </div>

        {/* Settings strip */}
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <ToggleChip
            icon={<Monitor className="h-3.5 w-3.5" />}
            label="Headless mode"
            value={headless}
            onChange={setHeadless}
          />
          <ToggleChip
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            label="Retry failed tests"
            value={retry}
            onChange={setRetry}
          />
          <ToggleChip
            icon={<Video className="h-3.5 w-3.5" />}
            label="Record video"
            value={recordVideo}
            onChange={setRecordVideo}
          />
          <ToggleChip
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Parallel browsers"
            value={parallel}
            onChange={setParallel}
          />
          <div className="rounded-xl bg-white/60 border border-white/70 px-3 py-2 flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={`${size.w}x${size.h}`}
              onChange={(e) => {
                const next = SCREEN_SIZES.find((s) => `${s.w}x${s.h}` === e.target.value);
                if (next) setSize(next);
              }}
              className="bg-transparent text-xs font-medium flex-1 outline-none"
            >
              {SCREEN_SIZES.map((s) => (
                <option key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Command preview */}
        {env && (
          <div className="mt-4 rounded-xl bg-foreground text-background/90 p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-emerald-300"># Generated execution plan</div>
            {selBrowsers.map((b) => (
              <div key={b}>
                <span className="text-sky-300">$</span> npx playwright test --browser=
                {b.toLowerCase()}
                {headless ? "" : " --headed"} --viewport-size={size.w},{size.h} -e BASE_URL=
                {env.baseUrl}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest results */}
      {latestRun ? (
        <RunResultsPanel projectId={project.id} runId={latestRun.id} />
      ) : (
        <div className="rounded-3xl glass p-8 text-center text-sm text-muted-foreground">
          Configure a run above and click <b>Run</b> to see logs, screenshots, and pass / fail.
        </div>
      )}

      {/* Script library */}
      <div className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <FileCode2 className="h-4 w-4" /> Web script library
          </h3>
          <span className="text-xs text-muted-foreground">{state.webScripts.length} files</span>
        </div>
        {state.webScripts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Upload Selenium (.py), Playwright (.ts/.js), Cypress (.js), or Selenium IDE (.side)
            files.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {state.webScripts.map((s) => (
              <div key={s.id} className="group p-3 rounded-xl bg-white/60 border border-white/70">
                <div className="flex items-start gap-2">
                  <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center text-white shrink-0">
                    <FileCode2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.kind} · {s.size}
                    </div>
                  </div>
                  <button
                    onClick={() => removeWebScript(project.id, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MiniFilesPanel
        projectId={project.id}
        title="Project files"
        accept=".py,.js,.ts,.side,.feature,.json,.yaml,.yml"
      />

      {showEnvModal && (
        <EnvModal
          initial={editingEnv}
          onClose={() => setShowEnvModal(false)}
          onSave={(data) => {
            if (editingEnv) {
              updateWebEnv(project.id, editingEnv.id, data);
            } else {
              const e = addWebEnv(project.id, data);
              setEnvId(e.id);
            }
            setShowEnvModal(false);
          }}
        />
      )}
    </div>
  );
}

function envDot(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("prod")) return "bg-rose-500";
  if (n.includes("stag")) return "bg-amber-500";
  if (n.includes("uat")) return "bg-sky-500";
  if (n.includes("dev")) return "bg-emerald-500";
  return "bg-muted-foreground";
}

function Section({
  icon,
  title,
  hint,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/50 border border-white/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            {icon}
            {title}
          </div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ToggleChip({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition border ${
        value
          ? "bg-primary/10 border-primary/40 text-foreground"
          : "bg-white/60 border-white/70 text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={value ? "text-primary" : ""}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span
        className={`relative h-4 w-7 rounded-full transition ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${value ? "left-3.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function EnvModal({
  initial,
  onClose,
  onSave,
}: {
  initial: WebEnvironment | null;
  onClose: () => void;
  onSave: (data: { name: string; baseUrl: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "Dev");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "https://dev.myapp.com");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl glass-strong p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/60"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="font-semibold text-lg mb-4">
          {initial ? "Edit environment" : "New environment"}
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-white/70 border border-white/70 rounded-lg px-2 py-1.5"
              placeholder="Dev / UAT / Staging / Production"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full mt-1 bg-white/70 border border-white/70 rounded-lg px-2 py-1.5 font-mono text-xs"
              placeholder="https://..."
            />
          </div>
        </div>
        <button
          onClick={() => onSave({ name: name.trim() || "Env", baseUrl: baseUrl.trim() })}
          className="mt-5 w-full px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-semibold shadow"
        >
          {initial ? "Save changes" : "Add environment"}
        </button>
      </div>
    </div>
  );
}
