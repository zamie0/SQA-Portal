import type { Project } from "@/shared/lib/mock-data";
import { CheckCircle2, XCircle, AlertCircle, Flame, AlertTriangle } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.6)",
  borderRadius: 12,
  fontSize: 12,
};

export function OverviewTab({ project }: { project: Project }) {
  const lastRun = project.runs[0];
  const pieData = lastRun
    ? [
        { name: "Passed", value: lastRun.passed, color: "oklch(0.68 0.17 155)" },
        { name: "Failed", value: lastRun.failed, color: "oklch(0.62 0.24 25)" },
        { name: "Skipped", value: lastRun.skipped, color: "oklch(0.85 0.01 260)" },
      ]
    : [];

  const recentFailures = project.testCases.filter((c) => c.status === "failed");

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="rounded-3xl glass p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pass rate
        </h3>
        <div className="mt-2 text-5xl font-bold text-gradient">{project.passRate}%</div>
        <div className="mt-1 text-xs text-muted-foreground">Across {project.cases} cases</div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-[image:var(--gradient-primary)]"
            style={{ width: `${project.passRate}%` }}
          />
        </div>
      </div>
      <div className="rounded-3xl glass p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Last run
        </h3>
        {lastRun && (
          <>
            <div className="mt-2 font-semibold truncate">{lastRun.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lastRun.date} · {lastRun.duration}
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-success font-medium">
                <CheckCircle2 className="h-4 w-4" /> {lastRun.passed}
              </span>
              <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
                <XCircle className="h-4 w-4" /> {lastRun.failed}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                <AlertCircle className="h-4 w-4" /> {lastRun.skipped}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="rounded-3xl glass p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Composition
        </h3>
        <div className="h-32 mt-2">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={32}
                outerRadius={52}
                paddingAngle={3}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pass/fail trend */}
      <div className="lg:col-span-2 rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Pass / fail trend</h3>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={project.trend}>
              <defs>
                <linearGradient id="passG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.17 155)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.68 0.17 155)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.62 0.24 25)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.62 0.24 25)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="oklch(0.5 0.02 260)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="pass"
                stroke="oklch(0.68 0.17 155)"
                fill="url(#passG)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="fail"
                stroke="oklch(0.62 0.24 25)"
                fill="url(#failG)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coverage */}
      <div className="rounded-3xl glass p-6">
        <h3 className="font-semibold mb-4">Coverage</h3>
        <div className="space-y-4">
          {[
            { label: "UI tests", value: project.coverage.ui },
            { label: "API tests", value: project.coverage.api },
            { label: "Mobile tests", value: project.coverage.mobile },
          ].map((c) => (
            <div key={c.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-semibold">{c.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-[image:var(--gradient-primary)]"
                  style={{ width: `${c.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flaky tests */}
      <div className="rounded-3xl glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-4 w-4 text-warning" />
          <h3 className="font-semibold">Flaky tests</h3>
        </div>
        {project.flaky.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flaky tests detected. ✨</p>
        ) : (
          <div className="space-y-3">
            {project.flaky.map((f) => (
              <div key={f.id} className="rounded-xl bg-white/50 border border-white/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{f.id}</div>
                    <div className="text-sm font-medium truncate">{f.title}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground font-medium whitespace-nowrap">
                    {f.failureRate}% fail
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {f.lastFailures} failures in last 10 runs
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent failures */}
      <div className="lg:col-span-2 rounded-3xl glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold">Recent failures</h3>
        </div>
        {recentFailures.length === 0 ? (
          <p className="text-sm text-muted-foreground">All green. 🎉</p>
        ) : (
          <div className="divide-y divide-white/40">
            {recentFailures.map((c) => (
              <div
                key={c.id}
                className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">{c.id}</div>
                  <div className="text-sm font-medium truncate">{c.title}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{c.lastRun}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
