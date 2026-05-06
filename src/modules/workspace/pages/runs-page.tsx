import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { projects } from "@/shared/lib/mock-data";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Clock, Play, Filter } from "lucide-react";

function RunsPage() {
  const all = projects.flatMap((p) => p.runs.map((r) => ({ ...r, project: p })));

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-5">
        <h1 className="text-3xl font-bold">Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every execution across all projects, in chronological order.
        </p>
      </div>

      <div className="rounded-3xl glass p-4 mb-5 flex flex-wrap items-center gap-2">
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background text-xs font-medium">
          <Filter className="h-3.5 w-3.5" /> All projects
        </button>
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium">
          Today
        </button>
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium">
          This week
        </button>
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium">
          Failed only
        </button>
      </div>

      <div className="space-y-3">
        {all.map((r) => {
          const total = r.passed + r.failed + r.skipped;
          const pct = total ? Math.round((r.passed / total) * 100) : 0;
          const status = r.failed > 0 ? "failed" : "passed";
          return (
            <div
              key={r.project.id + r.id}
              className="rounded-3xl glass p-5 flex flex-wrap items-center gap-4"
            >
              <div
                className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${r.project.color} grid place-items-center text-white text-xs font-bold shadow`}
              >
                {r.project.initials}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-white/70">
                    {r.project.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-white/70">
                    {r.trigger}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {r.date} · {r.duration}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gradient">{pct}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    pass
                  </div>
                </div>
                <StatusBadge status={status} />
                <button className="h-10 w-10 rounded-xl bg-[image:var(--gradient-primary)] text-white grid place-items-center shadow">
                  <Play className="h-4 w-4 fill-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export default RunsPage;
