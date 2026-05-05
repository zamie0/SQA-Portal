// localStorage-backed store for APK builds, robot scripts, devices,
// and simulated Appium + Robot Framework run history (per project).

export type RunStatus = "queued" | "running" | "passed" | "failed" | "stopped";

export interface ApkBuild {
  id: string;
  name: string;
  size: string;
  platform: "Android" | "iOS";
  uploaded: string;
  version: string;
}

export interface RobotScript {
  id: string;
  name: string;
  size: string;
  uploaded: string;
  preview: string; // first ~2KB of file content
}

export interface DeviceConfig {
  id: string;
  name: string;
  platform: "Android" | "iOS";
  deviceName: string;
  platformVersion: string;
  automationName: string;
}

export interface RunLog {
  ts: string;
  level: "info" | "ok" | "warn" | "err";
  msg: string;
}

export interface RunScreenshot {
  step: string;
  caption: string;
  status: "pass" | "fail";
}

export interface AutomationRun {
  id: string;
  name: string;
  apkId?: string;
  apkName?: string;
  scriptId?: string;
  scriptName?: string;
  deviceId?: string;
  deviceName?: string;
  /** Web run metadata */
  kind?: "mobile" | "web";
  browser?: string;
  envName?: string;
  envUrl?: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  passed: number;
  failed: number;
  total: number;
  logs: RunLog[];
  screenshots: RunScreenshot[];
}

// ---- Web automation types ----
export type WebBrowser = "Chrome" | "Edge" | "Firefox" | "Safari";
export type WebEnvKind = "Dev" | "UAT" | "Staging" | "Production";

export interface WebEnvironment {
  id: string;
  name: WebEnvKind | string;
  baseUrl: string;
}

export interface WebScript {
  id: string;
  name: string;
  size: string;
  uploaded: string;
  /** "py" | "js" | "ts" | "side" | etc. */
  kind: string;
  preview: string;
}

export interface WebRunConfig {
  browsers: WebBrowser[];
  envId: string;
  scriptId?: string;
  headless: boolean;
  width: number;
  height: number;
  retry: boolean;
  recordVideo: boolean;
  parallel: boolean;
}

export interface ProjectAutomationState {
  apks: ApkBuild[];
  scripts: RobotScript[];
  devices: DeviceConfig[];
  runs: AutomationRun[];
  webEnvs: WebEnvironment[];
  webScripts: WebScript[];
}

const KEY = (projectId: string) => `qe-hub.automation.${projectId}`;
const EVT = "qe-hub.automation-changed";

const defaultDevices: DeviceConfig[] = [
  {
    id: "dev-emu",
    name: "Pixel 8 Emulator",
    platform: "Android",
    deviceName: "emulator-5554",
    platformVersion: "14",
    automationName: "UiAutomator2",
  },
  {
    id: "dev-iphone",
    name: "iPhone 15 Simulator",
    platform: "iOS",
    deviceName: "iPhone 15",
    platformVersion: "17.4",
    automationName: "XCUITest",
  },
];

const defaultWebEnvs: WebEnvironment[] = [
  { id: "env-dev", name: "Dev", baseUrl: "https://dev.myapp.com" },
  { id: "env-uat", name: "UAT", baseUrl: "https://uat.myapp.com" },
  { id: "env-staging", name: "Staging", baseUrl: "https://staging.myapp.com" },
  { id: "env-prod", name: "Production", baseUrl: "https://myapp.com" },
];

function emptyState(): ProjectAutomationState {
  return {
    apks: [],
    scripts: [],
    devices: defaultDevices,
    runs: [],
    webEnvs: defaultWebEnvs,
    webScripts: [],
  };
}

export function getState(projectId: string): ProjectAutomationState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(KEY(projectId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<ProjectAutomationState>;
    return {
      apks: parsed.apks ?? [],
      scripts: parsed.scripts ?? [],
      devices: parsed.devices?.length ? parsed.devices : defaultDevices,
      runs: parsed.runs ?? [],
      webEnvs: parsed.webEnvs?.length ? parsed.webEnvs : defaultWebEnvs,
      webScripts: parsed.webScripts ?? [],
    };
  } catch {
    return emptyState();
  }
}

function setState(projectId: string, next: ProjectAutomationState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(projectId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export const AUTOMATION_EVENT = EVT;

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function addApk(projectId: string, file: File, platform: "Android" | "iOS"): ApkBuild {
  const apk: ApkBuild = {
    id: `apk-${Date.now()}`,
    name: file.name,
    size: fmtSize(file.size),
    platform,
    uploaded: new Date().toISOString(),
    version: "1.0.0",
  };
  const s = getState(projectId);
  setState(projectId, { ...s, apks: [apk, ...s.apks] });
  return apk;
}

export function removeApk(projectId: string, id: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, apks: s.apks.filter((a) => a.id !== id) });
}

export async function addRobotScript(projectId: string, file: File): Promise<RobotScript> {
  const text = await file.text();
  const script: RobotScript = {
    id: `rf-${Date.now()}`,
    name: file.name,
    size: fmtSize(file.size),
    uploaded: new Date().toISOString(),
    preview: text.slice(0, 2048),
  };
  const s = getState(projectId);
  setState(projectId, { ...s, scripts: [script, ...s.scripts] });
  return script;
}

export function removeScript(projectId: string, id: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, scripts: s.scripts.filter((x) => x.id !== id) });
}

export function addDevice(projectId: string, d: Omit<DeviceConfig, "id">): DeviceConfig {
  const dev: DeviceConfig = { ...d, id: `dev-${Date.now()}` };
  const s = getState(projectId);
  setState(projectId, { ...s, devices: [...s.devices, dev] });
  return dev;
}

export function removeDevice(projectId: string, id: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, devices: s.devices.filter((d) => d.id !== id) });
}

// ---- Web environment + script mutators ----
export function addWebEnv(projectId: string, env: Omit<WebEnvironment, "id">): WebEnvironment {
  const e: WebEnvironment = { ...env, id: `env-${Date.now()}` };
  const s = getState(projectId);
  setState(projectId, { ...s, webEnvs: [...s.webEnvs, e] });
  return e;
}

export function updateWebEnv(projectId: string, id: string, patch: Partial<WebEnvironment>) {
  const s = getState(projectId);
  setState(projectId, {
    ...s,
    webEnvs: s.webEnvs.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
}

export function removeWebEnv(projectId: string, id: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, webEnvs: s.webEnvs.filter((e) => e.id !== id) });
}

function detectKind(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".py")) return "Selenium (Python)";
  if (n.endsWith(".ts")) return "Playwright (TS)";
  if (n.endsWith(".js")) return "Playwright / Cypress (JS)";
  if (n.endsWith(".side")) return "Selenium IDE";
  if (n.endsWith(".feature")) return "Cucumber";
  return "Script";
}

export async function addWebScript(projectId: string, file: File): Promise<WebScript> {
  const text = await file.text().catch(() => "");
  const script: WebScript = {
    id: `web-${Date.now()}`,
    name: file.name,
    size: fmtSize(file.size),
    uploaded: new Date().toISOString(),
    kind: detectKind(file.name),
    preview: text.slice(0, 2048),
  };
  const s = getState(projectId);
  setState(projectId, { ...s, webScripts: [script, ...s.webScripts] });
  return script;
}

export function removeWebScript(projectId: string, id: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, webScripts: s.webScripts.filter((x) => x.id !== id) });
}

// ---- simulated executor ----
function ts(n: number): string {
  const sec = (n / 1000).toFixed(3).padStart(7, "0");
  return `00:${sec}`;
}

export function startRun(
  projectId: string,
  opts: { apkId?: string; scriptId?: string; deviceId?: string; name?: string },
): string {
  const s = getState(projectId);
  const apk = s.apks.find((a) => a.id === opts.apkId);
  const script = s.scripts.find((x) => x.id === opts.scriptId);
  const device = s.devices.find((d) => d.id === opts.deviceId) ?? s.devices[0];

  const run: AutomationRun = {
    id: `run-${Date.now()}`,
    name: (() => {
      if (opts.name) return opts.name;
      const joined = [apk?.name, script?.name].filter(Boolean).join(" · ");
      return joined || "Manual run";
    })(),
    apkId: apk?.id,
    apkName: apk?.name,
    scriptId: script?.id,
    scriptName: script?.name,
    deviceId: device?.id,
    deviceName: device?.name,
    status: "running",
    startedAt: new Date().toISOString(),
    passed: 0,
    failed: 0,
    total: 0,
    logs: [
      { ts: ts(0), level: "info", msg: "▶ Starting Appium server on http://127.0.0.1:4723" },
      {
        ts: ts(120),
        level: "info",
        msg: `▶ Loading device: ${device?.deviceName ?? "(none)"} (${device?.platform ?? "?"} ${device?.platformVersion ?? ""})`,
      },
      ...(apk
        ? [{ ts: ts(380), level: "info" as const, msg: `▶ Installing ${apk.name} (${apk.size})` }]
        : []),
      ...(script
        ? [{ ts: ts(620), level: "info" as const, msg: `▶ robot ${script.name}` }]
        : [
            {
              ts: ts(620),
              level: "warn" as const,
              msg: "⚠ No .robot script selected — running smoke suite",
            },
          ]),
    ],
    screenshots: [],
  };

  setState(projectId, { ...s, runs: [run, ...s.runs] });
  scheduleSimulation(projectId, run.id);
  return run.id;
}

function scheduleSimulation(projectId: string, runId: string) {
  if (typeof window === "undefined") return;

  const steps: Array<{ delay: number; log: RunLog; shot?: RunScreenshot; bump?: "pass" | "fail" }> =
    [
      {
        delay: 800,
        log: { ts: ts(900), level: "info", msg: "  ↳ Launching app activity .MainActivity" },
      },
      {
        delay: 1100,
        log: { ts: ts(2000), level: "ok", msg: "✓ Login With Valid Credentials passed (4.2s)" },
        shot: { step: "Login screen", caption: "Login With Valid Credentials", status: "pass" },
        bump: "pass",
      },
      {
        delay: 1100,
        log: { ts: ts(3100), level: "ok", msg: "✓ Navigate To Dashboard passed (2.8s)" },
        shot: { step: "Dashboard", caption: "Navigate To Dashboard", status: "pass" },
        bump: "pass",
      },
      {
        delay: 1200,
        log: {
          ts: ts(4300),
          level: "warn",
          msg: "  ⚠ Element 'export-btn' not visible, retry 1/2",
        },
      },
      {
        delay: 900,
        log: {
          ts: ts(5200),
          level: "err",
          msg: "✗ Export Report failed: timeout waiting for element",
        },
        shot: { step: "Export modal", caption: "Export Report", status: "fail" },
        bump: "fail",
      },
      {
        delay: 1000,
        log: { ts: ts(6200), level: "ok", msg: "✓ Logout passed (1.4s)" },
        shot: { step: "Logout", caption: "Logout", status: "pass" },
        bump: "pass",
      },
    ];

  let cum = 0;
  steps.forEach((step) => {
    cum += step.delay;
    setTimeout(() => {
      const s = getState(projectId);
      const idx = s.runs.findIndex((r) => r.id === runId);
      if (idx === -1) return;
      const r = s.runs[idx];
      if (r.status !== "running") return;
      const next: AutomationRun = {
        ...r,
        logs: [...r.logs, step.log],
        screenshots: step.shot ? [...r.screenshots, step.shot] : r.screenshots,
        passed: r.passed + (step.bump === "pass" ? 1 : 0),
        failed: r.failed + (step.bump === "fail" ? 1 : 0),
        total: r.total + (step.bump ? 1 : 0),
      };
      const newRuns = [...s.runs];
      newRuns[idx] = next;
      setState(projectId, { ...s, runs: newRuns });
    }, cum);
  });

  // finalize
  cum += 600;
  setTimeout(() => {
    const s = getState(projectId);
    const idx = s.runs.findIndex((r) => r.id === runId);
    if (idx === -1) return;
    const r = s.runs[idx];
    if (r.status !== "running") return;
    const finishedAt = new Date().toISOString();
    const durationMs = new Date(finishedAt).getTime() - new Date(r.startedAt).getTime();
    const final: AutomationRun = {
      ...r,
      status: r.failed > 0 ? "failed" : "passed",
      finishedAt,
      durationMs,
      logs: [
        ...r.logs,
        {
          ts: ts(7000),
          level: r.failed > 0 ? "err" : "ok",
          msg: `Run summary: ${r.passed} passed · ${r.failed} failed (${(durationMs / 1000).toFixed(1)}s)`,
        },
      ],
    };
    const newRuns = [...s.runs];
    newRuns[idx] = final;
    setState(projectId, { ...s, runs: newRuns });
  }, cum);
}

export function stopRun(projectId: string, runId: string) {
  const s = getState(projectId);
  const idx = s.runs.findIndex((r) => r.id === runId);
  if (idx === -1) return;
  const r = s.runs[idx];
  if (r.status !== "running") return;
  const finishedAt = new Date().toISOString();
  const newRuns = [...s.runs];
  newRuns[idx] = {
    ...r,
    status: "stopped",
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(r.startedAt).getTime(),
    logs: [...r.logs, { ts: ts(0), level: "warn", msg: "■ Run stopped by user" }],
  };
  setState(projectId, { ...s, runs: newRuns });
}

export function deleteRun(projectId: string, runId: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, runs: s.runs.filter((r) => r.id !== runId) });
}

export function clearRuns(projectId: string) {
  const s = getState(projectId);
  setState(projectId, { ...s, runs: [] });
}

// ---- Web run starter (one run per browser; supports parallel) ----
export function startWebRun(projectId: string, cfg: WebRunConfig): string[] {
  const s = getState(projectId);
  const env = s.webEnvs.find((e) => e.id === cfg.envId) ?? s.webEnvs[0];
  const script = s.webScripts.find((x) => x.id === cfg.scriptId);
  const browsers = cfg.browsers.length ? cfg.browsers : (["Chrome"] as WebBrowser[]);
  const ids: string[] = [];

  browsers.forEach((browser, i) => {
    const id = `run-${Date.now()}-${i}`;
    const initialLogs: RunLog[] = [
      {
        ts: ts(0),
        level: "info",
        msg: `▶ Launching ${browser} (${cfg.headless ? "headless" : "headed"}) @ ${cfg.width}×${cfg.height}`,
      },
      {
        ts: ts(140),
        level: "info",
        msg: `▶ Target environment: ${env?.name ?? "—"} → ${env?.baseUrl ?? "—"}`,
      },
      ...(script
        ? [{ ts: ts(280), level: "info" as const, msg: `▶ Running ${script.kind}: ${script.name}` }]
        : [
            {
              ts: ts(280),
              level: "warn" as const,
              msg: "⚠ No script selected — running smoke flow",
            },
          ]),
      ...(cfg.recordVideo
        ? [{ ts: ts(320), level: "info" as const, msg: "● Recording video to artifacts/" }]
        : []),
      ...(cfg.retry
        ? [{ ts: ts(360), level: "info" as const, msg: "↻ Retry on failure: enabled (max 2)" }]
        : []),
    ];
    const run: AutomationRun = {
      id,
      name: `${browser} · ${env?.name ?? ""}${script ? ` · ${script.name}` : ""}`,
      kind: "web",
      browser,
      envName: env?.name,
      envUrl: env?.baseUrl,
      scriptId: script?.id,
      scriptName: script?.name,
      status: "running",
      startedAt: new Date().toISOString(),
      passed: 0,
      failed: 0,
      total: 0,
      logs: initialLogs,
      screenshots: [],
    };
    const cur = getState(projectId);
    setState(projectId, { ...cur, runs: [run, ...cur.runs] });
    scheduleSimulation(projectId, id);
    ids.push(id);
  });

  return ids;
}
