import { useEffect, useRef } from "react";
import { useEventTick } from "@/shared/lib/use-storage";
import {
  AUTOMATION_EVENT,
  getState,
  stopRun,
  type AutomationRun,
  type RunStatus,
} from "@/shared/lib/automation-runs";
import { Square, CheckCircle2, XCircle, Clock, Image as ImageIcon, Camera } from "lucide-react";

const statusStyle: Record<RunStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/15 text-primary",
  passed: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  stopped: "bg-warning text-warning-foreground",
};

const levelColor: Record<string, string> = {
  info: "text-background/70",
  ok: "text-emerald-300",
  warn: "text-amber-300",
  err: "text-rose-300",
};

export function RunResultsPanel({ projectId, runId }: { projectId: string; runId: string }) {
  useEventTick(AUTOMATION_EVENT);
  const run: AutomationRun | undefined = getState(projectId).runs.find((r) => r.id === runId);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [run?.logs.length]);

  if (!run) return null;

  const duration = run.durationMs
    ? `${(run.durationMs / 1000).toFixed(1)}s`
    : run.status === "running"
      ? "running…"
      : "—";

  return (
    <div className="rounded-3xl glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{run.name}</h3>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${statusStyle[run.status]}`}
            >
              {run.status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {run.deviceName ?? "no device"} · started {new Date(run.startedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Stat icon={CheckCircle2} label="Passed" value={run.passed} color="text-success" />
          <Stat icon={XCircle} label="Failed" value={run.failed} color="text-destructive" />
          <Stat icon={Clock} label="Duration" value={duration} />
          {run.status === "running" && (
            <button
              onClick={() => stopRun(projectId, run.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        {/* Logs */}
        <div className="bg-foreground p-4 font-mono text-xs lg:border-r border-white/10">
          <div ref={logRef} className="h-72 overflow-y-auto">
            {run.logs.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-background/40 shrink-0">{l.ts}</span>
                <span className={levelColor[l.level] ?? "text-background/80"}>{l.msg}</span>
              </div>
            ))}
            {run.status === "running" && (
              <div className="text-background/50 italic mt-2 inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
                streaming…
              </div>
            )}
          </div>
        </div>

        {/* Screenshots */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Screenshots</h4>
            <span className="text-xs text-muted-foreground">({run.screenshots.length})</span>
          </div>
          {run.screenshots.length === 0 ? (
            <div className="h-72 grid place-items-center text-xs text-muted-foreground">
              No screenshots captured yet.
            </div>
          ) : (
            <div className="h-72 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {run.screenshots.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border border-white/70 bg-white/60"
                >
                  <div
                    className={`aspect-[9/16] grid place-items-center text-white text-xs font-medium ${
                      s.status === "pass"
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                        : "bg-gradient-to-br from-rose-400 to-rose-600"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                      <ImageIcon className="h-6 w-6 opacity-80" />
                      <span>{s.step}</span>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 text-[11px]">
                    <div className="font-medium truncate">{s.caption}</div>
                    <div className={s.status === "pass" ? "text-success" : "text-destructive"}>
                      {s.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: typeof Clock;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
