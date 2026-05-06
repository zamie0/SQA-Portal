import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";

export const Route = createFileRoute("/tools/orca/agents")({
  head: () => ({ meta: [{ title: "Agents — Orca" }] }),
  component: () => (
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
  ),
});
