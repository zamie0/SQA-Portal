import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function PerformanceReportsPage() {
  return (
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
  );
}
