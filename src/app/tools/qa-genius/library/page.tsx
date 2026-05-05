import { Shell } from "@/components/layout/Shell";
import { RequireAuth } from "@/components/shared/RequireAuth";

export default function QaGeniusLibraryPage() {
  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">Library</h1>
          <p className="text-muted-foreground mt-2">Saved AI-generated test case templates.</p>
        </section>
      </Shell>
    </RequireAuth>
  );
}
