import { useMemo, useRef, useState } from "react";
import type { Project } from "@/shared/lib/mock-data";
import { FileCode2, Play, Upload, FolderOpen, Trash2, Smartphone, Apple } from "lucide-react";
import {
  addRobotScript,
  getState,
  removeScript,
  startRun,
  AUTOMATION_EVENT,
  type RobotScript,
} from "@/shared/lib/automation-runs";
import { useEventTick } from "@/shared/lib/use-storage";
import { RunResultsPanel } from "./RunResultsPanel";

export function ScriptsTab({ project }: { project: Project }) {
  useEventTick(AUTOMATION_EVENT);
  const state = getState(project.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string>(state.scripts[0]?.id ?? "");
  const [selDevice, setSelDevice] = useState<string>(state.devices[0]?.id ?? "");
  const [selApk, setSelApk] = useState<string>("");

  const selected = state.scripts.find((s) => s.id === selectedId);
  const lastRunForScript = useMemo(
    () => state.runs.find((r) => r.scriptId === selectedId),
    [state.runs, selectedId],
  );

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = await addRobotScript(project.id, file);
    setSelectedId(s.id);
    e.target.value = "";
  }

  function handleRun() {
    if (!selected) return;
    startRun(project.id, { scriptId: selected.id, apkId: selApk, deviceId: selDevice });
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar */}
        <div className="rounded-3xl glass p-4 self-start">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-medium mb-3"
          >
            <Upload className="h-3.5 w-3.5" /> Upload .robot
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".robot,.txt"
            className="hidden"
            onChange={onUpload}
          />

          <div className="text-xs font-mono space-y-1 text-foreground/80">
            <div className="flex items-center gap-1.5 font-semibold">
              <FolderOpen className="h-3.5 w-3.5" /> /robot
            </div>
            <div className="space-y-0.5 pl-4">
              {state.scripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition group ${
                    s.id === selectedId ? "bg-foreground text-background" : "hover:bg-white/60"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{s.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScript(project.id, s.id);
                      if (selectedId === s.id) setSelectedId("");
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
              {state.scripts.length === 0 && (
                <div className="text-muted-foreground italic px-2 py-4">No scripts yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Editor + run config */}
        {selected ? (
          <ScriptEditor
            script={selected}
            apks={state.apks}
            devices={state.devices}
            selApk={selApk}
            selDevice={selDevice}
            onSelApk={setSelApk}
            onSelDevice={setSelDevice}
            onRun={handleRun}
          />
        ) : (
          <div className="rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
            Upload or select a .robot script to view it.
          </div>
        )}
      </div>

      {lastRunForScript && <RunResultsPanel projectId={project.id} runId={lastRunForScript.id} />}
    </div>
  );
}

function ScriptEditor({
  script,
  apks,
  devices,
  selApk,
  selDevice,
  onSelApk,
  onSelDevice,
  onRun,
}: {
  script: RobotScript;
  apks: ReturnType<typeof getState>["apks"];
  devices: ReturnType<typeof getState>["devices"];
  selApk: string;
  selDevice: string;
  onSelApk: (v: string) => void;
  onSelDevice: (v: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="rounded-3xl glass p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg truncate">{script.name}</h3>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
              robot
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {script.size} · uploaded {new Date(script.uploaded).toLocaleString()}
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={!selDevice}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow disabled:opacity-40"
        >
          <Play className="h-4 w-4 fill-white" /> Run
        </button>
      </div>

      {/* Run config */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/60 border border-white/70 p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1.5">
            App build (optional)
          </div>
          {apks.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-1">
              No APK uploaded — upload one in Mobile tab.
            </div>
          ) : (
            <select
              value={selApk}
              onChange={(e) => onSelApk(e.target.value)}
              className="w-full text-sm bg-white/70 border border-white/70 rounded-lg px-2 py-1.5"
            >
              <option value="">— none —</option>
              {apks.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.size}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="rounded-2xl bg-white/60 border border-white/70 p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1.5">Device</div>
          <select
            value={selDevice}
            onChange={(e) => onSelDevice(e.target.value)}
            className="w-full text-sm bg-white/70 border border-white/70 rounded-lg px-2 py-1.5"
          >
            <option value="">— select —</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.platform} {d.platformVersion})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Code preview */}
      <div className="rounded-2xl bg-foreground overflow-hidden border border-white/10">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-[11px] text-background/60 font-mono ml-2">{script.name}</div>
        </div>
        <pre className="px-4 py-3 text-background/95 overflow-x-auto whitespace-pre text-xs font-mono max-h-96">
          {script.preview || "(empty)"}
        </pre>
      </div>

      {/* Compatible devices hint */}
      <div className="flex flex-wrap gap-2">
        {devices.map((d) => (
          <span
            key={d.id}
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-white/60 border border-white/70 text-muted-foreground"
          >
            {d.platform === "iOS" ? (
              <Apple className="h-3 w-3" />
            ) : (
              <Smartphone className="h-3 w-3" />
            )}
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
