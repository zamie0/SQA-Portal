import { Shell } from "@/shared/components/layout/Shell";
import { ShieldCheck } from "lucide-react";

export default function SecurityScannerPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Built-in tool
            </div>
            <h1 className="mt-1 text-3xl font-bold font-display">Security Scanner</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Code quality and security scanning workspace placeholder.
            </p>
          </div>
        </div>
      </section>
    </Shell>
  );
}
