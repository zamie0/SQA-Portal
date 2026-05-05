import { Shell } from "@/components/layout/Shell";
import { RequireAuth } from "@/components/shared/RequireAuth";

export default function OrcaAgentsPage() {
  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Agents</h1>
          <p className="text-muted-foreground mt-2">
            Autonomous test agents available across pods.
          </p>
        </section>
      </Shell>
    </RequireAuth>
  );
}
