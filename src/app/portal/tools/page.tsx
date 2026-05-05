import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Bot, Brain, Sparkles, Gauge, ArrowUpRight } from "lucide-react";

const tools = [
  {
    to: "/tools/orca",
    name: "Orca",
    desc: "Smart test orchestration with AI agents.",
    icon: Bot,
    color: "from-blue-500 to-cyan-500",
    status: "Beta",
  },
  {
    to: "/tools/qa-genius",
    name: "QA Genius",
    desc: "Generate test cases from requirements with AI.",
    icon: Brain,
    color: "from-fuchsia-500 to-violet-600",
    status: "Beta",
  },
  {
    to: "/tools/qe",
    name: "QE Automation Hub",
    desc: "Manage automation projects, runs, RPA flows and results.",
    icon: Sparkles,
    color: "from-violet-500 to-indigo-500",
    status: "Live",
  },
  {
    to: "/tools/performance",
    name: "Performance Testing",
    desc: "Load, stress and scalability testing dashboards.",
    icon: Gauge,
    color: "from-emerald-500 to-teal-500",
    status: "Beta",
  },
] as const;

function ToolsPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-display">Tools</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Pick a workspace. Each tool is its own focused environment with a context-aware sidebar.
        </p>
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        {tools.map((t) => (
          <Link key={t.to} href={t.to} className="rounded-3xl glass glass-hover p-6 block group">
            <div className="flex items-start gap-4">
              <div
                className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${t.color} grid place-items-center text-white shadow-lg`}
              >
                <t.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg group-hover:text-primary transition">
                    {t.name}
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {t.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium">
                  Open tool <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </Shell>
  );
}

export default ToolsPage;
