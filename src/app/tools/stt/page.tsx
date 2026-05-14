import { Shell } from "@/shared/components/layout/Shell";
import { RadioTower } from "lucide-react";

export default function SttPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
            <RadioTower className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Built-in tool
            </div>
            <h1 className="mt-1 text-3xl font-bold font-display">STT</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Video Streaming Test Tool workspace placeholder.
            </p>
          </div>
        </div>
      </section>
    </Shell>
  );
}
