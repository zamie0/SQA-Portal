import { useState } from "react";
import type { Project } from "@/lib/mock-data";
import { useEventTick } from "@/lib/use-storage";
import {
  AUTOMATION_EVENT,
  clearRuns,
  deleteRun,
  getState,
  type RunStatus,
} from "@/lib/automation-runs";
import {
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Square as SquareIcon,
  Clock,
} from "lucide-react";
import { RunResultsPanel } from "./RunResultsPanel";

const statusMeta: Record<RunStatus, { color: string; icon: typeof Clock; label: string }> = {
  queued: { color: "text-muted-foreground", icon: Clock, label: "Queued" },
  running: { color: "text-primary", icon: Loader2, label: "Running" },
  passed: { color: "text-success", icon: CheckCircle2, label: "Passed" },
  failed: { color: "text-destructive", icon: XCircle, label: "Failed" },
  stopped: { color: "text-warning-foreground", icon: SquareIcon, label: "Stopped" },
};

export function ExecutionTab({ project }: { project: Project }) {
  useEventTick(AUTOMATION_EVENT);
  const state = getState(project.id);
  const [selectedId, setSelectedId] = useState<string>(state.runs[0]?.id ?? "");
  const selected = state.runs.find((r) => r.id === selectedId) ?? state.runs[0];

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      {/* Run history */}
      <div className="rounded-3xl glass p-4 self-start">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Run history
          </h3>
          {state.runs.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all run history?")) clearRuns(project.id);
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              Clear
            </button>
          )}
        </div>

        {state.runs.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No runs yet. Trigger a run from the <b>Mobile</b> or <b>Scripts</b> tab.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {state.runs.map((r) => {
              const meta = statusMeta[r.status];
              const Icon = meta.icon;
              const active = (selected?.id ?? "") === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left rounded-xl p-2.5 border transition group ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-white/60 border-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${active ? "" : meta.color} ${r.status === "running" ? "animate-spin" : ""}`}
                    />
                    <span className="text-xs font-medium truncate flex-1">{r.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRun(project.id, r.id);
                        if (selectedId === r.id) setSelectedId("");
                      }}
                      className={`opacity-0 group-hover:opacity-100 ${active ? "hover:text-rose-300" : "hover:text-destructive"}`}
                      aria-label="Delete run"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div
                    className={`text-[10px] mt-1 flex items-center gap-2 ${active ? "text-background/70" : "text-muted-foreground"}`}
                  >
                    <span>{new Date(r.startedAt).toLocaleTimeString()}</span>
                    <span>·</span>
                    <span className="text-emerald-500">{r.passed}P</span>
                    <span className="text-rose-500">{r.failed}F</span>
                    {r.durationMs && <span>· {(r.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected run detail */}
      {selected ? (
        <RunResultsPanel projectId={project.id} runId={selected.id} />
      ) : (
        <div className="rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
          Select a run to view its logs and screenshots.
        </div>
      )}
    </div>
  );
}
