import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { projects, trendData } from "@/lib/mock-data";
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Activity,
  Bot,
  FlaskConical,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/tools/qe")({
  head: () => ({
    meta: [
      { title: "QE Automation Hub — SQA Portal" },
      {
        name: "description",
        content: "Live overview of automation projects, runs and pass-rate trends.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <QEDashboard />
    </RequireAuth>
  ),
});

function QEDashboard() {
  const totalCases = projects.reduce((s, p) => s + p.cases, 0);
  const avgPass = Math.round(projects.reduce((s, p) => s + p.passRate, 0) / projects.length);
  const totalRuns = projects.reduce((s, p) => s + p.runs.length, 0);
  const totalFlows = projects.reduce((s, p) => s + p.flows.length, 0);

  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            QE Automation Hub
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
            Your <span className="text-gradient">automation control room</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Orchestrate test suites, RPA bots and CI runs across every project — all from one glassy
            command center.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
            >
              View projects <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm font-medium">
              + New project
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active projects"
          value={projects.length.toString()}
          icon={FlaskConical}
          hint="across QE & RPA"
        />
        <StatCard
          label="Test cases"
          value={totalCases.toLocaleString()}
          icon={CheckCircle2}
          hint={`${avgPass}% pass rate`}
        />
        <StatCard
          label="Runs (7d)"
          value={totalRuns.toString()}
          icon={Activity}
          hint="3 scheduled today"
        />
        <StatCard label="RPA flows" value={totalFlows.toString()} icon={Bot} hint="2 running now" />
      </section>

      <section className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-3xl glass p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold">Pass rate trend</h2>
              <p className="text-xs text-muted-foreground">Last 7 days · all projects</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" /> Pass
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Fail
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.17 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.68 0.17 155)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.24 25)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.62 0.24 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" />
                <XAxis dataKey="day" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pass"
                  stroke="oklch(0.68 0.17 155)"
                  strokeWidth={2}
                  fill="url(#gPass)"
                />
                <Area
                  type="monotone"
                  dataKey="fail"
                  stroke="oklch(0.62 0.24 25)"
                  strokeWidth={2}
                  fill="url(#gFail)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <h2 className="text-lg font-semibold mb-4">Recent activity</h2>
          <div className="space-y-3">
            {projects.flatMap((p) =>
              p.runs.slice(0, 1).map((r) => (
                <div
                  key={p.id + r.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 border border-white/60"
                >
                  <div
                    className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${p.color} grid place-items-center text-white text-xs font-bold`}
                  >
                    {p.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {r.date} · {r.duration}
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" /> {r.passed}
                      </span>
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" /> {r.failed}
                      </span>
                    </div>
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your projects</h2>
          <Link
            to="/projects"
            className="text-sm text-primary font-medium inline-flex items-center gap-1"
          >
            See all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/projects/$projectId"
              params={{ projectId: p.id }}
              className="rounded-2xl glass-hover glass p-5 block group"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${p.color} grid place-items-center text-white font-bold shadow-lg`}
                >
                  {p.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate group-hover:text-primary transition">
                    {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.type}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{p.cases} cases</span>
                <span className="font-semibold text-success">{p.passRate}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-[image:var(--gradient-primary)]"
                  style={{ width: `${p.passRate}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Sparkles;
  hint: string;
}) {
  return (
    <div className="rounded-3xl glass p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="h-9 w-9 rounded-xl bg-white/60 border border-white/70 grid place-items-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold font-display">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
