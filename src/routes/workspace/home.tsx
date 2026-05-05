import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  FolderKanban,
  Server,
  Wrench,
  Bot,
  Brain,
  Sparkles,
  Gauge,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SQA Portal" },
      {
        name: "description",
        content: "Unified workspace for QA, automation and performance testing.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PortalDashboard />
    </RequireAuth>
  ),
});

function PortalDashboard() {
  const user = useAuth();
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Welcome back, {user?.fullName?.split(" ")[0] || user?.username}
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-gradient">SQA Portal</span> — Quality at scale
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Manage projects, testbeds and the full automation toolchain from a single glassy command
            center.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/portal/tools"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
            >
              Open tools <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/portal/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass text-sm font-medium"
            >
              Browse projects
            </Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PortalCard
          to="/portal/projects"
          icon={FolderKanban}
          label="Projects"
          hint="Plans & releases"
        />
        <PortalCard to="/portal/testbeds" icon={Server} label="Testbeds" hint="Environments" />
        <PortalCard to="/portal/tools" icon={Wrench} label="Tools" hint="QA & automation" />
        {user?.role === "admin" && (
          <PortalCard
            to="/portal/admin"
            icon={ShieldCheck}
            label="Admin"
            hint="Approvals & users"
          />
        )}
      </section>

      <section className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Tools</h2>
            <p className="text-xs text-muted-foreground">Pick a workspace to dive in.</p>
          </div>
          <Link
            to="/portal/tools"
            className="text-sm text-primary font-medium inline-flex items-center gap-1"
          >
            See all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ToolPreview
            to="/tools/orca"
            icon={Bot}
            name="Orca"
            desc="Smart test orchestration & AI agents."
            color="from-blue-500 to-cyan-500"
          />
          <ToolPreview
            to="/tools/qa-genius"
            icon={Brain}
            name="QA Genius"
            desc="AI-assisted test case generation."
            color="from-fuchsia-500 to-violet-600"
          />
          <ToolPreview
            to="/tools/qe"
            icon={Sparkles}
            name="QE Automation Hub"
            desc="Automation projects, runs & RPA."
            color="from-violet-500 to-indigo-500"
          />
          <ToolPreview
            to="/tools/performance"
            icon={Gauge}
            name="Performance Testing"
            desc="Load, stress & scalability tests."
            color="from-emerald-500 to-teal-500"
          />
        </div>
      </section>
    </Shell>
  );
}

function PortalCard({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: typeof FolderKanban;
  label: string;
  hint: string;
}) {
  return (
    <Link to={to} className="rounded-3xl glass p-5 glass-hover group block">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="h-9 w-9 rounded-xl bg-white/60 border border-white/70 grid place-items-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold font-display group-hover:text-primary transition">
        {label}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </Link>
  );
}

function ToolPreview({
  to,
  icon: Icon,
  name,
  desc,
  color,
}: {
  to: string;
  icon: typeof Bot;
  name: string;
  desc: string;
  color: string;
}) {
  return (
    <Link to={to} className="rounded-2xl glass-hover glass p-5 block group">
      <div
        className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} grid place-items-center text-white shadow-lg`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-semibold group-hover:text-primary transition">{name}</div>
      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</div>
    </Link>
  );
}
