import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/tools/performance/reports")({
  head: () => ({ meta: [{ title: "Reports — Performance Testing" }] }),
  component: () => (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Historical performance baselines and exports.
          </p>
        </section>
      </Shell>
    </RequireAuth>
  ),
});
