import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/tools/orca/logs")({
  head: () => ({ meta: [{ title: "Logs — Orca" }] }),
  component: () => (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Logs</h1>
          <p className="text-muted-foreground mt-2">
            Stream of agent activity and dispatched tasks.
          </p>
        </section>
      </Shell>
    </RequireAuth>
  ),
});
