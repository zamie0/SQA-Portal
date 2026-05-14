import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { listPortalTools, type PortalTool } from "@/shared/lib/portal-content";
import {
  ArrowUpRight,
  Bot,
  Brain,
  Gauge,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

const toolStyles = {
  "security-scanner": {
    icon: ShieldCheck,
    color: "from-rose-500 to-orange-500",
  },
  stt: {
    icon: RadioTower,
    color: "from-sky-500 to-blue-600",
  },
  orca: {
    icon: Bot,
    color: "from-blue-500 to-cyan-500",
  },
  "qa-genius": {
    icon: Brain,
    color: "from-fuchsia-500 to-violet-600",
  },
  "qe-robot-framework-automation": {
    icon: Sparkles,
    color: "from-violet-500 to-indigo-500",
  },
  "performance-testing": {
    icon: Gauge,
    color: "from-emerald-500 to-teal-500",
  },
} as const;

function toolView(tool: PortalTool) {
  const style = toolStyles[tool.slug as keyof typeof toolStyles] ?? {
    icon: Wrench,
    color: "from-slate-500 to-zinc-600",
  };

  return {
    to: tool.url || "/portal/tools",
    name: tool.name || "Untitled tool",
    desc: tool.description || "No description available.",
    status: tool.isBuiltIn ? "Built-in" : "External",
    ...style,
  };
}

async function ToolsPage() {
  const tools = await listPortalTools();

  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-display">Tools</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Pick a workspace. Each tool is its own focused environment with a context-aware sidebar.
        </p>
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        {tools.length === 0 && (
          <div className="rounded-3xl glass p-6 text-sm text-muted-foreground md:col-span-2">
            No active tools found in the database yet.
          </div>
        )}
        {tools.map(toolView).map((t) => (
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
