import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function PerformanceScenariosPage() {
  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Scenarios</h1>
          <p className="text-muted-foreground mt-2">Configured load and stress scenarios.</p>
        </section>
      </Shell>
    </RequireAuth>
  );
}
