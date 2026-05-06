import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";

export const Route = createFileRoute("/tools/orca/swarms")({
  head: () => ({ meta: [{ title: "Swarms — Orca" }] }),
  component: () => (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Swarms</h1>
          <p className="text-muted-foreground mt-2">
            Coordinated agent groups running test suites.
          </p>
        </section>
      </Shell>
    </RequireAuth>
  ),
});
