import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useEffect, useState } from "react";
import { GraduationCap, CheckCircle2, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { tutorialSteps } from "@/lib/help-content";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/help/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial — QE Automation Hub" },
      {
        name: "description",
        content:
          "Step-by-step walkthrough: create a project, add cases, run tests, and review results.",
      },
    ],
  }),
  component: TutorialPage,
});

const STORAGE_KEY = "qe-hub:tutorial-progress";

function TutorialPage() {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDone(new Set(parsed.done ?? []));
        setActive(parsed.active ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ done: [...done], active }));
    } catch {}
  }, [done, active]);

  const step = tutorialSteps[active];

  const completed = done.size;
  const total = tutorialSteps.length;
  const percent = Math.round((completed / total) * 100);

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setDone(new Set());
    setActive(0);
  };

  const Icon = step.icon;

  return (
    <Shell>
      {/* Hero */}
      <div className="rounded-3xl glass-strong p-6 mb-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300 to-sky-400 opacity-25 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-bold">Get started in 7 steps</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                A guided walkthrough from creating your first project to scheduling nightly runs.
              </p>
            </div>
          </div>

          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              {completed} of {total} steps complete
            </span>
            <span className="font-semibold text-foreground">{percent}%</span>
          </div>

          <div className="h-2 rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar */}
        <aside className="rounded-3xl glass p-3 h-fit lg:sticky lg:top-24">
          <ol className="space-y-1">
            {tutorialSteps.map((s, i) => {
              const isActive = i === active;
              const isDone = done.has(s.id);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActive(i)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition",
                      isActive
                        ? "bg-foreground text-background"
                        : "hover:bg-white/60 text-foreground/80",
                    ].join(" ")}
                  >
                    <span className="h-7 w-7 grid place-items-center rounded-full text-xs font-semibold shrink-0 bg-white/70">
                      {isDone ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : i + 1}
                    </span>

                    <span className="truncate">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Content */}
        <section className="rounded-3xl glass-strong p-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-foreground">
              <Icon className="h-6 w-6" />
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Step {active + 1} of {total}
              </div>
              <h2 className="text-2xl font-bold">{step.title}</h2>
            </div>
          </div>

          <p className="text-muted-foreground">{step.summary}</p>

          <div className="mt-5 space-y-3">
            {step.detail.map((line, idx) => (
              <div key={idx} className="flex gap-3 rounded-2xl bg-white/50 border p-4">
                <span className="h-6 w-6 grid place-items-center rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 text-white text-xs font-bold">
                  {idx + 1}
                </span>

                <div className="text-sm">
                  <ReactMarkdown>{line}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-7 flex justify-between pt-5 border-t">
            <button
              onClick={() => toggleDone(step.id)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/70"
            >
              {done.has(step.id) ? "Marked complete" : "Mark as complete"}
            </button>

            <div className="flex gap-2">
              {/* 👈 Previous (ONLY if not first step) */}
              {active > 0 && (
                <button
                  onClick={() => setActive((a) => a - 1)}
                  className="px-4 py-2.5 rounded-xl glass text-sm flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
              )}

              {/* 👉 Next (ONLY if not last step) */}
              {active < total - 1 && (
                <button
                  onClick={() => {
                    setDone((prev) => new Set(prev).add(step.id));
                    setActive((a) => a + 1);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 text-white text-sm flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
