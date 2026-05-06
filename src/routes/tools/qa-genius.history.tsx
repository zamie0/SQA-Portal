import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";

export const Route = createFileRoute("/tools/qa-genius/history")({
  head: () => ({ meta: [{ title: "History — QA Genius" }] }),
  component: () => (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">History</h1>
          <p className="text-muted-foreground mt-2">Past generation prompts and outputs.</p>
        </section>
      </Shell>
    </RequireAuth>
  ),
});
