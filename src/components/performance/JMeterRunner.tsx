"use client";

import { Activity, ClipboardCheck, Loader2, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type JMeterMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type JMeterSummary = {
  samples: number;
  failures: number;
  errorRate: number;
  averageMs: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughput: number | null;
};

export type JMeterResult = {
  status: "completed" | "failed" | "setup_required";
  message?: string;
  detail?: string;
  planPath?: string;
  resultPath?: string;
  derivedPlan?: {
    category: string;
    testType: string;
    protocol: string;
    users: number;
    rampUp: number;
    duration: number;
    method: JMeterMethod;
    assertions: string[];
    validations: string[];
    notes: string[];
  };
  summary?: JMeterSummary;
};

export function JMeterRunner({
  initialUrl = "https://example.com/",
  runToken = 0,
  instruction = "",
  agentMode = false,
  onRunStart,
  onResult,
}: {
  initialUrl?: string;
  runToken?: number;
  instruction?: string;
  agentMode?: boolean;
  onRunStart?: () => void;
  onResult?: (result: JMeterResult) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [method, setMethod] = useState<JMeterMethod>("GET");
  const [users, setUsers] = useState(10);
  const [rampUp, setRampUp] = useState(10);
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JMeterResult | null>(null);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const runTest = useCallback(
    async (targetUrl = url) => {
      setRunning(true);
      setResult(null);
      onRunStart?.();
      try {
        const response = await fetch("/api/performance/jmeter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "SQA Test Studio real-time test",
            url: targetUrl,
            method,
            users,
            rampUp,
            duration,
            instruction,
          }),
        });
        const data = (await response.json()) as JMeterResult;
        setResult(data);
        onResult?.(data);
      } catch (error) {
        const failedResult: JMeterResult = {
          status: "failed",
          message: error instanceof Error ? error.message : "Unable to run JMeter test",
        };
        setResult(failedResult);
        onResult?.(failedResult);
      } finally {
        setRunning(false);
      }
    },
    [duration, instruction, method, onResult, onRunStart, rampUp, url, users],
  );

  useEffect(() => {
    if (runToken > 0) void runTest(initialUrl);
  }, [initialUrl, runTest, runToken]);

  return (
    <div className="space-y-4">
      {!agentMode && (
        <>
          <div className="grid gap-3 md:grid-cols-[120px_1fr]">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as JMeterMethod)}
              className="rounded-xl bg-white/70 border border-white/70 px-3 py-3 text-sm font-medium outline-none focus:border-primary"
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/health"
              className="rounded-xl bg-white/70 border border-white/70 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Users", value: users, setValue: setUsers, min: 1 },
              { label: "Ramp-up", value: rampUp, setValue: setRampUp, min: 1 },
              { label: "Duration", value: duration, setValue: setDuration, min: 5 },
            ].map((field) => (
              <label
                key={field.label}
                className="rounded-xl bg-white/50 border border-white/60 p-3"
              >
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {field.label}
                </span>
                <input
                  type="number"
                  min={field.min}
                  value={field.value}
                  onChange={(e) => field.setValue(Number(e.target.value))}
                  className="mt-1 w-full bg-transparent text-lg font-semibold outline-none"
                />
              </label>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { label: "Plan", icon: ClipboardCheck },
            { label: "Run", icon: PlayCircle },
            { label: "Analyze", icon: Activity },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-white/60 border border-white/70 px-3 py-2 text-xs font-medium flex items-center gap-2"
            >
              <item.icon className="h-3.5 w-3.5 text-primary" />
              {item.label}
            </div>
          ))}
        </div>
        {agentMode ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/60 px-4 py-2.5 text-sm font-medium">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Running from Studio prompt
              </>
            ) : result ? (
              "Last run completed"
            ) : (
              "Waiting for Studio run"
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => runTest()}
            disabled={running || !url.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-40"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Run JMeter
          </button>
        )}
      </div>

      {result && <JMeterResultPanel result={result} />}
    </div>
  );
}

function JMeterResultPanel({ result }: { result: JMeterResult }) {
  if (result.status !== "completed" || !result.summary) {
    return (
      <div className="rounded-xl border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-900">
        <div className="font-semibold">
          {result.status === "setup_required" ? "JMeter setup required" : "JMeter run failed"}
        </div>
        <p className="mt-1">{result.message ?? "The performance test could not be completed."}</p>
        {result.detail && <p className="mt-1 text-amber-900/70">{result.detail}</p>}
      </div>
    );
  }

  const summary = result.summary;
  const plan = result.derivedPlan;
  const isHealthy = summary.errorRate === 0 && summary.p95Ms < 1000;
  const statusLabel = isHealthy ? "Looks stable" : "Needs review";
  const takeaway = isHealthy
    ? `The endpoint handled ${summary.samples} samples with no errors. p95 latency stayed at ${summary.p95Ms}ms.`
    : `The run completed, but ${summary.errorRate}% errors or ${summary.p95Ms}ms p95 latency may need investigation.`;
  const recommendation = isHealthy
    ? "Next: increase users or duration to validate behavior under higher load."
    : "Next: check failed requests, server logs, and slow dependencies before increasing load.";

  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-success">Concise performance report</div>
          <div className="mt-0.5 text-muted-foreground">
            {statusLabel}
            {plan ? ` · ${plan.testType}` : ""}
          </div>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-foreground">
          {summary.errorRate}% errors
        </span>
      </div>
      <p className="mt-3 text-foreground">{takeaway}</p>
      {plan && (
        <div className="mt-3 rounded-xl bg-white/60 p-3">
          <div className="text-xs font-semibold">Derived JMeter plan</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.category} · {plan.method} · {plan.users} users · {plan.rampUp}s ramp-up ·{" "}
            {plan.duration}s duration
          </p>
          {plan.notes.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{plan.notes.join(" ")}</p>
          )}
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Avg" value={`${summary.averageMs}ms`} />
        <Metric label="p95" value={`${summary.p95Ms}ms`} />
        <Metric label="Samples" value={String(summary.samples)} />
      </div>
      <p className="mt-3 text-muted-foreground">{recommendation}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/60 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
