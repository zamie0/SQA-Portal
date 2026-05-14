"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, RefreshCcw, PlayCircle } from "lucide-react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Button } from "@/shared/components/ui/button";

type ScenarioRun = {
  id: string;
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  jmxFileName: string;
  threads: number;
  rampUp: number;
  loops: number;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: string;
  message?: string;
  reports: Array<{
    fileName: string;
    fileType: string;
    status: string;
    downloadUrl: string;
  }>;
};

export default function PerformanceScenariosPage() {
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/performance/scenarios", { cache: "no-store" });
      const data = (await response.json()) as { runs?: ScenarioRun[]; message?: string };
      if (!response.ok || !data.runs) {
        throw new Error(data.message ?? "Unable to load performance run history.");
      }
      setRuns(data.runs);
    } catch (fetchError) {
      setRuns([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load performance run history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8 relative overflow-hidden">
          <div className="absolute -top-14 right-8 h-40 w-40 rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display">Scenarios</h1>
              <p className="text-muted-foreground mt-2">
                Scenario history for uploaded JMX plans and completed performance runs.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadRuns()}
              disabled={loading}
              className="rounded-xl border-white/70 bg-white/70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh runs
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
              Loading scenario history...
            </div>
          </div>
        ) : runs.length === 0 ? (
          <div className="mt-6 rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
            No reports generated yet.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {runs.map((run) => (
              <section key={run.id} className="rounded-3xl glass p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{run.scenarioName}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{run.projectName}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-foreground">
                    {run.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Metric label="JMX file" value={run.jmxFileName} />
                  <Metric label="Users" value={String(run.threads)} />
                  <Metric label="Ramp-up" value={`${run.rampUp}s`} />
                  <Metric label="Loops" value={String(run.loops)} />
                  <Metric label="Duration" value={formatDuration(run.durationMs)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span>Started {formatDateTime(run.startedAt)}</span>
                  <span>Ended {run.endedAt ? formatDateTime(run.endedAt) : "--"}</span>
                </div>

                {run.message ? <p className="mt-3 text-sm text-muted-foreground">{run.message}</p> : null}

                <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-4">
                  <div className="text-sm font-semibold">Generated report files</div>
                  {run.reports.length === 0 ? (
                    <div className="mt-2 text-sm text-muted-foreground">No report files linked yet.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {run.reports.map((report) => (
                        <div
                          key={`${run.id}-${report.fileName}`}
                          className="flex flex-col gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="text-sm">
                            <div className="font-medium">{report.fileName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {report.fileType} | {report.status}
                            </div>
                          </div>
                          <a
                            href={report.downloadUrl}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] px-4 text-sm font-medium text-white"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Link
                    href="/tools/performance/reports"
                    className="inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium"
                  >
                    View related reports
                  </Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </Shell>
    </RequireAuth>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
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

function formatDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) return "--";
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
