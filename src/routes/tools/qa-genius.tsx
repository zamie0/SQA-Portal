import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Brain, Wand2, FileText, Send } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/tools/qa-genius")({
  head: () => ({ meta: [{ title: "QA Genius — SQA Portal" }] }),
  component: () => (
    <RequireAuth>
      <Page />
    </RequireAuth>
  ),
});

function Page() {
  const [prompt, setPrompt] = useState("");
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 opacity-20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display">QA Genius</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Turn requirements into structured test cases in seconds. Powered by AI suggestions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
            <Wand2 className="h-4 w-4 text-primary" /> Generate from requirement
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste a user story or requirement…"
            className="w-full h-40 rounded-2xl border border-border bg-white/60 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-3 flex justify-end">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium">
              <Send className="h-4 w-4" /> Generate cases
            </button>
          </div>
        </div>
        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" /> Recent suggestions
          </div>
          <div className="space-y-2 text-sm">
            {["Login validation edge cases", "Checkout payment retry", "Search empty-state UX"].map(
              (t) => (
                <div key={t} className="rounded-xl bg-white/60 border border-white/60 p-3">
                  {t}
                </div>
              ),
            )}
          </div>
          <div className="mt-4">
            <Link
              to="/portal/tools"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to all tools
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
