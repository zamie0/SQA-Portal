import type { Project } from "@/shared/lib/mock-data";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Camera, Download, FileText, Video } from "lucide-react";

const tooltipStyle = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.6)",
  borderRadius: 12,
  fontSize: 12,
};

const failureBuckets = [
  { reason: "Timeout", count: 6 },
  { reason: "Assertion", count: 4 },
  { reason: "5xx response", count: 3 },
  { reason: "Selector not found", count: 2 },
  { reason: "Network", count: 1 },
];

export function ResultsTab({ project }: { project: Project }) {
  const data = project.runs.map((r) => ({
    name: r.name.split(" ").slice(-1)[0] || r.name,
    pass: r.passed,
    fail: r.failed,
    skip: r.skipped,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="font-semibold">Execution results</h3>
            <p className="text-xs text-muted-foreground">Per-run pass / fail breakdown</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm font-medium">
              <Download className="h-4 w-4" /> PDF
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm font-medium">
              <Download className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" />
              <XAxis dataKey="name" stroke="oklch(0.5 0.02 260)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pass" stackId="a" fill="oklch(0.68 0.17 155)" />
              <Bar dataKey="fail" stackId="a" fill="oklch(0.62 0.24 25)" />
              <Bar dataKey="skip" stackId="a" fill="oklch(0.85 0.01 260)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl glass p-6">
          <h3 className="font-semibold mb-4">Failure analysis</h3>
          <div className="space-y-3">
            {failureBuckets.map((b) => {
              const pct = (b.count / failureBuckets[0].count) * 100;
              return (
                <div key={b.reason}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{b.reason}</span>
                    <span className="text-muted-foreground">{b.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-destructive/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <h3 className="font-semibold mb-4">Failure artifacts</h3>
          <div className="space-y-2">
            {[
              { icon: Camera, name: "TM-003-export-failure.png", type: "Screenshot" },
              { icon: Video, name: "TM-003-replay.mp4", type: "Video" },
              { icon: FileText, name: "TM-003-trace.log", type: "Log" },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70"
                >
                  <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.type}</div>
                  </div>
                  <button className="text-xs text-primary font-medium">View</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-3xl glass overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-white/60">
          <div className="col-span-4">Run</div>
          <div className="col-span-2">Trigger</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-3">P / F / S</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        {project.runs.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-12 items-center px-5 py-4 text-sm border-b border-white/40 last:border-b-0 hover:bg-white/40"
          >
            <div className="col-span-4">
              <div className="font-medium truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.date}</div>
            </div>
            <div className="col-span-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-white/70 text-muted-foreground">
                {r.trigger}
              </span>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">{r.duration}</div>
            <div className="col-span-3 text-xs">
              <span className="text-success font-medium">{r.passed}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-destructive font-medium">{r.failed}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-muted-foreground font-medium">{r.skipped}</span>
            </div>
            <div className="col-span-1 flex justify-end">
              <StatusBadge status={r.failed > 0 ? "failed" : "passed"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
