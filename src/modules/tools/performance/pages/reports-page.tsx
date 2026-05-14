"use client";

import { useEffect, useState } from "react";
import { Download, FolderOpen, Loader2, RefreshCcw } from "lucide-react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Button } from "@/shared/components/ui/button";

type ReportItem = {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  sizeBytes: number;
  status: string;
  downloadUrl: string;
  viewUrl: string;
};

type ReportGroup = {
  projectId: string;
  projectName: string;
  reports: ReportItem[];
};

export default function PerformanceReportsPage() {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/performance/reports/overview", { cache: "no-store" });
      const data = (await response.json()) as { groups?: ReportGroup[]; message?: string };
      if (!response.ok || !data.groups) {
        throw new Error(data.message ?? "Unable to load performance reports.");
      }
      setGroups(data.groups);
    } catch (fetchError) {
      setGroups([]);
      setError(
        fetchError instanceof Error ? fetchError.message : "Unable to load performance reports.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8 relative overflow-hidden">
          <div className="absolute -top-14 right-8 h-40 w-40 rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display">Reports</h1>
              <p className="text-muted-foreground mt-2">
                Generated performance reports grouped by project and scenario.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadReports()}
              disabled={loading}
              className="rounded-xl border-white/70 bg-white/70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh reports
            </Button>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-3xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading reports...
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-6 rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
            No reports generated yet.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map((group) => (
              <section key={group.projectId} className="rounded-3xl glass p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{group.projectName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {group.reports.length} report{group.reports.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {group.reports.map((report) => (
                    <div
                      key={`${report.runId}-${report.fileName}`}
                      className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{report.fileName}</div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Scenario {report.scenarioName}</span>
                          <span>Type {report.fileType}</span>
                          <span>Status {report.status}</span>
                          <span>Created {formatDateTime(report.createdAt)}</span>
                          <span>Size {formatFileSize(report.sizeBytes)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={report.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/70 bg-white/80 px-4 text-sm font-medium"
                        >
                          Open
                        </a>
                        <a
                          href={report.downloadUrl}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-medium text-white shadow-lg shadow-primary/15"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Shell>
    </RequireAuth>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
