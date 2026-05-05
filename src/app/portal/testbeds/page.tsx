import { Shell } from "@/components/layout/Shell";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { Server, CircleDot } from "lucide-react";

const beds = [
  { name: "Dev", url: "https://dev.myapp.com", status: "online" },
  { name: "UAT", url: "https://uat.myapp.com", status: "online" },
  { name: "Staging", url: "https://staging.myapp.com", status: "degraded" },
  { name: "Production", url: "https://app.myapp.com", status: "online" },
];

function TestbedsPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Testbeds</h1>
            <p className="text-muted-foreground text-sm">Environments available for execution.</p>
          </div>
        </div>
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        {beds.map((b) => (
          <div key={b.name} className="rounded-2xl glass p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold">{b.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{b.url}</div>
            </div>
            <span
              className={[
                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                b.status === "online"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning-foreground",
              ].join(" ")}
            >
              <CircleDot className="h-3 w-3" /> {b.status}
            </span>
          </div>
        ))}
      </section>
    </Shell>
  );
}

export default TestbedsPage;
