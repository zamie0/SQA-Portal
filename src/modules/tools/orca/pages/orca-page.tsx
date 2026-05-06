import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Bot, Workflow, Sparkles, Play } from "lucide-react";

function OrcaPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 opacity-20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 grid place-items-center shadow-lg">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Beta
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold font-display">Orca</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Smart test orchestration with autonomous AI agents. Coordinate suites across services
              and environments.
            </p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { name: "Active swarms", v: "3", hint: "running now" },
          { name: "Agents", v: "12", hint: "across pods" },
          { name: "Tasks queued", v: "47", hint: "pending dispatch" },
        ].map((s) => (
          <div key={s.name} className="rounded-3xl glass p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.name}</div>
            <div className="mt-2 text-3xl font-bold font-display">{s.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent orchestrations</h2>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foreground text-background text-xs font-medium">
            <Play className="h-3.5 w-3.5" /> New swarm
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-white/60"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 grid place-items-center text-white">
                <Workflow className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Smoke swarm — checkout flow #{i}</div>
                <div className="text-xs text-muted-foreground">5 agents · UAT · 2m ago</div>
              </div>
              <span className="text-xs font-medium text-success">passing</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/portal/tools"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to all tools
          </Link>
        </div>
      </section>
    </Shell>
  );
}

export default OrcaPage;
