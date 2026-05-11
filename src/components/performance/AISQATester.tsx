"use client";

import { AlertTriangle, Bot, CheckCircle2, Loader2, PlayCircle, Wand2 } from "lucide-react";
import { useState } from "react";

type JMeterResult = {
  status: "completed" | "failed" | "setup_required";
  message?: string;
  detail?: string;
  derivedPlan?: {
    category: string;
    testType: string;
    protocol: string;
    users: number;
    rampUp: number;
    duration: number;
    method: string;
    requestAnalysis?: {
      targetUrl: string;
      path: string;
      bodyFormat: "none" | "json" | "form" | "raw";
      bodyPreview: string;
      detectedFields: string[];
      headers: Record<string, string>;
    };
    verificationStatus?: "metrics_collected" | "login_not_verified";
    verificationMessage?: string;
    assertions: string[];
    validations: string[];
    notes: string[];
  };
  summary?: {
    samples: number;
    failures: number;
    errorRate: number;
    averageMs: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
    throughput: number | null;
  };
};

export function AISQATester() {
  const [website, setWebsite] = useState("");
  const [instruction, setInstruction] = useState("");
  const [submitted, setSubmitted] = useState<{ website: string; instruction: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JMeterResult | null>(null);
  const [robotScript, setRobotScript] = useState("");

  async function submitPrompt() {
    const nextPrompt = {
      website: normalizeWebsite(website),
      instruction: instruction.trim(),
    };
    setSubmitted(nextPrompt);
    setResult(null);
    setRunning(true);

    try {
      const response = await fetch("/api/performance/jmeter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "SQA Test Studio JMeter run",
          url: nextPrompt.website,
          method: "GET",
          instruction: nextPrompt.instruction,
        }),
      });
      const data = (await response.json()) as JMeterResult;
      setResult(data);
    } catch (error) {
      setResult({
        status: "failed",
        message: error instanceof Error ? error.message : "Unable to call JMeter API",
      });
    } finally {
      setRunning(false);
    }
  }

  function createRobotScript() {
    const nextPrompt = {
      website: normalizeWebsite(website),
      instruction: instruction.trim(),
    };
    setSubmitted(nextPrompt);
    setRobotScript(buildRobotScript(nextPrompt.website, nextPrompt.instruction));
  }

  return (
    <section className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wand2 className="h-4 w-4 text-primary" /> Test prompt
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[320px_1fr]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Website
          </span>
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://your-website.com"
            className="w-full rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Testing instruction
          </span>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Describe what you want the system to test..."
            className="h-28 w-full resize-none rounded-2xl border border-white/70 bg-white/60 p-4 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submitPrompt}
          disabled={!website.trim() || !instruction.trim() || running}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow disabled:opacity-40"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Run JMeter API
        </button>
        <button
          type="button"
          onClick={createRobotScript}
          disabled={!website.trim() || !instruction.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-white shadow disabled:opacity-40"
        >
          <Bot className="h-4 w-4" /> Create Robot Test Script
        </button>
      </div>

      {submitted && (
        <div className="mt-5 rounded-2xl bg-white/60 border border-white/70 p-4 text-sm">
          <div className="font-semibold">Submitted prompt</div>
          <p className="mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">Website:</span> {submitted.website}
          </p>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">Instruction:</span>{" "}
            {submitted.instruction}
          </p>
        </div>
      )}

      {running && (
        <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" /> JMeter API is running
          </div>
          <p className="mt-1 text-muted-foreground">
            The backend is generating a JMeter plan from your instruction and executing it.
          </p>
        </div>
      )}

      {result && <JMeterResultPanel result={result} />}

      {robotScript && (
        <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-primary" /> Robot Framework script
          </div>
          <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-foreground p-4 text-xs text-background">
            <code>{robotScript}</code>
          </pre>
        </div>
      )}
    </section>
  );
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function JMeterResultPanel({ result }: { result: JMeterResult }) {
  if (result.status !== "completed" || !result.summary) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          {result.status === "setup_required" ? "JMeter setup required" : "JMeter run failed"}
        </div>
        <p className="mt-1">{result.message ?? "The JMeter API could not complete the run."}</p>
        {result.detail && <p className="mt-1 text-amber-900/70">{result.detail}</p>}
      </div>
    );
  }

  const { summary, derivedPlan } = result;
  const loginNotVerified = derivedPlan?.verificationStatus === "login_not_verified";

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 text-sm ${
        loginNotVerified
          ? "border-amber-300/50 bg-amber-50/70 text-amber-950"
          : "border-success/30 bg-success/10"
      }`}
    >
      <div
        className={`flex items-center gap-2 font-semibold ${
          loginNotVerified ? "text-amber-900" : "text-success"
        }`}
      >
        {loginNotVerified ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {loginNotVerified ? "Login result not verified" : "JMeter performance run completed"}
      </div>
      <p className="mt-1 text-muted-foreground">
        {derivedPlan?.verificationMessage ??
          "This means the JMeter request finished and metrics were collected."}
      </p>

      {derivedPlan && (
        <div className="mt-3 rounded-xl bg-white/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Derived JMeter plan
          </div>
          <p className="mt-1 font-medium">
            {derivedPlan.testType} · {derivedPlan.category} · {derivedPlan.method}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {derivedPlan.users} users · {derivedPlan.rampUp}s ramp-up · {derivedPlan.duration}s
            duration
          </p>
          {derivedPlan.requestAnalysis && (
            <div className="mt-3 rounded-xl border border-white/70 bg-white/70 p-3 text-xs">
              <div className="font-semibold text-foreground">Detected JMeter request</div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <span className="font-medium text-foreground">URL:</span>{" "}
                  <span className="break-all text-muted-foreground">
                    {derivedPlan.requestAnalysis.targetUrl}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Body:</span>{" "}
                  <span className="text-muted-foreground">
                    {derivedPlan.requestAnalysis.bodyFormat}
                  </span>
                </div>
              </div>
              {derivedPlan.requestAnalysis.detectedFields.length > 0 && (
                <p className="mt-2 text-muted-foreground">
                  Fields: {derivedPlan.requestAnalysis.detectedFields.join(", ")}
                </p>
              )}
              {derivedPlan.requestAnalysis.bodyFormat !== "none" && (
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-foreground/90 p-3 text-[11px] text-background">
                  <code>{derivedPlan.requestAnalysis.bodyPreview}</code>
                </pre>
              )}
            </div>
          )}
          {derivedPlan.validations.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Validates: {derivedPlan.validations.join(", ")}
            </p>
          )}
          {derivedPlan.notes.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 text-xs text-amber-900">
              <div className="font-semibold">Important notes</div>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {derivedPlan.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Metric label="Samples" value={String(summary.samples)} />
        <Metric label="Average" value={`${summary.averageMs}ms`} />
        <Metric label="p95" value={`${summary.p95Ms}ms`} />
        <Metric label="HTTP Errors" value={`${summary.errorRate}%`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function buildRobotScript(website: string, instruction: string) {
  return `*** Settings ***
Documentation    Generated by SQA Test Studio from the user's prompt.
Library    SeleniumLibrary

*** Variables ***
\${BASE_URL}    ${website}
\${BROWSER}     Chrome
\${INSTRUCTION}    ${instruction.replace(/\s+/g, " ").trim()}

*** Test Cases ***
Prompt Driven Web Smoke Test
    [Documentation]    \${INSTRUCTION}
    Open Browser    \${BASE_URL}    \${BROWSER}
    Maximize Browser Window
    Page Should Not Contain    Application error
    Capture Page Screenshot
    Close Browser
`;
}
