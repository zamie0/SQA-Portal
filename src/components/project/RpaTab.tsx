import type { Project } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Bot,
  Play,
  Plus,
  GripVertical,
  Globe,
  Keyboard,
  MousePointerClick,
  Download,
  Save,
  Network,
} from "lucide-react";

const stepIcon = {
  open: Globe,
  input: Keyboard,
  click: MousePointerClick,
  extract: Download,
  save: Save,
  api: Network,
} as const;

const stepColor: Record<string, string> = {
  open: "from-sky-400 to-cyan-500",
  input: "from-violet-400 to-indigo-500",
  click: "from-amber-400 to-orange-500",
  extract: "from-emerald-400 to-teal-500",
  save: "from-rose-400 to-pink-500",
  api: "from-fuchsia-400 to-purple-500",
};

export function RpaTab({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">RPA flows</h3>
          <p className="text-xs text-muted-foreground">
            Visual workflow builder · drag & drop steps
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium">
          <Plus className="h-4 w-4" /> New flow
        </button>
      </div>

      <div className="space-y-4">
        {project.flows.map((f) => (
          <div key={f.id} className="rounded-3xl glass p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-white/60 border border-white/70 grid place-items-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.schedule} · last {f.lastRun}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status} />
                <button className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] text-white grid place-items-center shadow">
                  <Play className="h-4 w-4 fill-white" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white/40 border border-white/60 p-4">
              <div className="flex flex-col gap-2">
                {f.steps.map((step, i) => {
                  const Icon = stepIcon[step.type];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground w-6 text-right">
                        {i + 1}
                      </span>
                      <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-white/70 shadow-sm">
                        <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        <div
                          className={`h-8 w-8 rounded-lg bg-gradient-to-br ${stepColor[step.type]} grid place-items-center text-white shrink-0`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{step.label}</div>
                          <div className="text-[11px] text-muted-foreground capitalize">
                            {step.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/70 text-xs text-muted-foreground hover:bg-white/40">
                  <Plus className="h-3.5 w-3.5" /> Add step
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
