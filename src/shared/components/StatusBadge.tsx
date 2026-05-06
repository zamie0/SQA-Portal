import type { RunStatus } from "@/shared/lib/mock-data";
import { CheckCircle2, XCircle, Loader2, MinusCircle } from "lucide-react";

const map: Record<RunStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  passed: {
    label: "Passed",
    cls: "bg-success/15 text-success border-success/30",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
    Icon: XCircle,
  },
  running: {
    label: "Running",
    cls: "bg-primary/10 text-primary border-primary/30",
    Icon: Loader2,
  },
  skipped: {
    label: "Skipped",
    cls: "bg-muted text-muted-foreground border-border",
    Icon: MinusCircle,
  },
};

export function StatusBadge({ status }: { status: RunStatus }) {
  const { label, cls, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}
