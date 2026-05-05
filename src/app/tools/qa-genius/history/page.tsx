import { Shell } from "@/components/layout/Shell";
import { RequireAuth } from "@/components/shared/RequireAuth";

export default function QaGeniusHistoryPage() {
  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <h1 className="text-3xl font-bold font-display">History</h1>
          <p className="text-muted-foreground mt-2">Past generation prompts and outputs.</p>
        </section>
      </Shell>
    </RequireAuth>
  );
}
