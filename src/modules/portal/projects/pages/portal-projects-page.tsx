import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { FolderKanban } from "lucide-react";

function ProjectsPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center">
            <FolderKanban className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Projects</h1>
            <p className="text-muted-foreground text-sm">
              Portfolio of QA initiatives and releases.
            </p>
          </div>
        </div>
      </section>
      <section className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl glass p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Initiative</div>
            <div className="mt-1 font-semibold">Project Atlas {i}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Plan, design and track quality work across releases. Connect tools and testbeds to see
              live progress.
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[image:var(--gradient-primary)]"
                style={{ width: `${30 + i * 10}%` }}
              />
            </div>
          </div>
        ))}
      </section>
    </Shell>
  );
}

export default ProjectsPage;
