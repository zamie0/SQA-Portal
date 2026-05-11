import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { AISQATester } from "@/components/performance/AISQATester";
import { ArrowLeft, Bot } from "lucide-react";

export default function SqaTestStudioPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center text-white shadow-lg">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display">SQA Test Studio</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Generate reports, run real-time tests, summarize results, and create structured test
                case sheets.
              </p>
            </div>
          </div>
          <Link
            href="/help/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Copilot
          </Link>
        </div>
      </section>

      <AISQATester />
    </Shell>
  );
}
