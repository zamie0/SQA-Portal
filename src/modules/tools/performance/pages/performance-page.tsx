import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Gauge, Activity, Timer, Zap } from "lucide-react";

function Page() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center shadow-lg">
            <Gauge className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display">Performance Testing</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Run load, stress and scalability tests with live metrics and historical baselines.
            </p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { name: "Throughput", v: "2.4k", hint: "req/sec", icon: Activity },
          { name: "p95 latency", v: "184ms", hint: "last 5m", icon: Timer },
          { name: "Error rate", v: "0.12%", hint: "↓ 0.04%", icon: Zap },
        ].map((s) => (
          <div key={s.name} className="rounded-3xl glass p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.name}</div>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-bold font-display">{s.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl glass p-6">
        <h2 className="text-lg font-semibold mb-3">Scenarios</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            "Login burst — 500 VU / 60s",
            "Checkout soak — 200 VU / 1h",
            "Search spike — 1k VU / 2m",
            "API ramp — 0→2k VU / 10m",
          ].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-white/50 border border-white/60 p-4 flex items-center justify-between"
            >
              <span className="text-sm font-medium">{n}</span>
              <button className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background">
                Run
              </button>
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

export default Page;
