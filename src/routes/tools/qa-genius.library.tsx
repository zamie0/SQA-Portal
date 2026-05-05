import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/tools/qa-genius/library")({
  head: () => ({ meta: [{ title: "Library — QA Genius" }] }),
  component: () => (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Library</h1>
          <p className="text-muted-foreground mt-2">Saved AI-generated test case templates.</p>
        </section>
      </Shell>
    </RequireAuth>
  ),
});
