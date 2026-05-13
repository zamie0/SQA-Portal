<<<<<<< Updated upstream
import Page from "@/modules/tools/qa-genius/pages/qa-genius-page";
=======
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/Shell";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertTriangle,
  Brain,
  ClipboardCopy,
  Code2,
  Eraser,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type TestType = "Functional" | "API" | "Security" | "Performance" | "Automation";
type Priority = "Low" | "Medium" | "High";

type GeneratedTestCase = {
  id: string;
  title: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: string;
};

const testTypes: TestType[] = ["Functional", "API", "Security", "Performance", "Automation"];
const priorities: Priority[] = ["Low", "Medium", "High"];

const featureCards = [
  {
    title: "Test Case Generator",
    description: "Draft positive, negative, and edge-case coverage from business requirements.",
    icon: FileCheck2,
    color: "from-fuchsia-500 to-violet-600",
  },
  {
    title: "Security Test Cases",
    description: "Create abuse scenarios for access control, validation, and sensitive data flows.",
    icon: ShieldCheck,
    color: "from-rose-500 to-orange-500",
  },
  {
    title: "Robot Framework",
    description: "Prepare automation-ready cases that can evolve into Robot Framework suites.",
    icon: Code2,
    color: "from-violet-500 to-indigo-500",
  },
  {
    title: "API Testing",
    description: "Shape endpoint checks for payloads, response codes, contracts, and failures.",
    icon: Network,
    color: "from-sky-500 to-cyan-500",
  },
] as const;

function formatResultsForCopy(results: GeneratedTestCase[]) {
  return results
    .map(
      (result) =>
        [
          `ID: ${result.id}`,
          `Title: ${result.title}`,
          `Preconditions: ${result.preconditions}`,
          `Steps:\n${result.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
          `Expected Result: ${result.expectedResult}`,
          `Priority: ${result.priority}`,
        ].join("\n"),
    )
    .join("\n\n");
}

function isGeneratedTestCase(value: unknown): value is GeneratedTestCase {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GeneratedTestCase>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.preconditions === "string" &&
    Array.isArray(candidate.steps) &&
    candidate.steps.every((step) => typeof step === "string") &&
    typeof candidate.expectedResult === "string" &&
    typeof candidate.priority === "string"
  );
}

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "QA Genius could not generate test cases. Please try again.";
}

function QAGeniusPage() {
  const [requirement, setRequirement] = useState("");
  const [testType, setTestType] = useState<TestType>("Functional");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [maxCases, setMaxCases] = useState(3);
  const [results, setResults] = useState<GeneratedTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Results");
  const [errorMessage, setErrorMessage] = useState("");

  const hasResults = results.length > 0;

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      const message = "Please add a requirement before generating test cases.";
      setErrorMessage(message);
      toast.error("Requirement needed", { description: message });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setErrorMessage("");
    setCopyLabel("Copy Results");

    try {
      const response = await fetch("/api/tools/qa-genius/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requirement,
          testType,
          priority,
          maxTestCases: maxCases,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "QA Genius could not generate test cases. Please try again.",
        );
      }

      const data = (await response.json()) as { testCases?: unknown };
      if (!Array.isArray(data.testCases) || !data.testCases.every(isGeneratedTestCase)) {
        throw new Error("QA Genius returned an unexpected response. Please try again.");
      }

      setResults(data.testCases);
      toast.success("Test cases generated", {
        description: `${data.testCases.length} QA test case${
          data.testCases.length === 1 ? "" : "s"
        } ready for review.`,
      });
    } catch (error) {
      const message = readErrorMessage(error);
      setErrorMessage(message);
      toast.error("Generation failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!hasResults) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatResultsForCopy(results));
      setCopyLabel("Copied");
      toast.success("Results copied");
      window.setTimeout(() => setCopyLabel("Copy Results"), 1400);
    } catch {
      const message = "Browser clipboard access failed. Please select and copy manually.";
      setErrorMessage(message);
      toast.error("Copy failed", { description: message });
    }
  };

  const handleClear = () => {
    setRequirement("");
    setTestType("Functional");
    setPriority("Medium");
    setMaxCases(3);
    setResults([]);
    setIsLoading(false);
    setCopyLabel("Copy Results");
    setErrorMessage("");
  };

  return (
    <Shell>
      <Toaster />
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 opacity-20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center shadow-lg">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> MVP workspace
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold font-display">QA Genius</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Generate test cases, security scenarios, and automation scripts from requirements.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/60 border border-white/70 px-4 py-3 text-sm text-muted-foreground md:max-w-xs">
            <LockKeyhole className="h-4 w-4 text-primary shrink-0" />
            Gemini-powered generation is connected through the SQA Portal backend.
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {featureCards.map((feature) => (
          <div key={feature.title} className="rounded-3xl glass p-5">
            <div
              className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${feature.color} grid place-items-center text-white shadow-lg`}
            >
              <feature.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <WandIcon />
            <h2 className="text-lg font-semibold">Generator</h2>
          </div>

          <label className="block text-sm font-medium mb-2" htmlFor="requirement">
            Requirement, URS, or user story
          </label>
          <textarea
            id="requirement"
            value={requirement}
            onChange={(event) => setRequirement(event.target.value)}
            placeholder="Paste a requirement, URS clause, acceptance criteria, or user story..."
            className="min-h-44 w-full resize-y rounded-2xl border border-white/70 bg-white/70 p-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div className="mt-5 grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="test-type">
                Test type
              </label>
              <select
                id="test-type"
                value={testType}
                onChange={(event) => setTestType(event.target.value as TestType)}
                className="w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {testTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className="w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="max-cases">
                Max test cases
              </label>
              <input
                id="max-cases"
                type="number"
                min={1}
                max={20}
                value={maxCases}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setMaxCases(Number.isFinite(value) ? Math.min(Math.max(value, 1), 20) : 1);
                }}
                className="w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm font-medium transition hover:bg-white/80"
            >
              <Eraser className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:opacity-95 disabled:pointer-events-none disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generate Test Cases
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">QA Genius needs a retry</div>
                <p className="mt-1 text-destructive/85">{errorMessage}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl glass p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Generated Results</h2>
              <p className="text-sm text-muted-foreground">
                AI-generated output appears here after generation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!hasResults}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition disabled:pointer-events-none disabled:opacity-40"
            >
              <ClipboardCopy className="h-4 w-4" />
              {copyLabel}
            </button>
          </div>

          {isLoading ? (
            <div className="grid min-h-80 place-items-center rounded-2xl border border-white/70 bg-white/50 p-8 text-center">
              <div>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm font-medium">Generating test cases with Gemini...</p>
              </div>
            </div>
          ) : hasResults ? (
            <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/50">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-white/70 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Preconditions</th>
                      <th className="px-4 py-3 font-semibold">Steps</th>
                      <th className="px-4 py-3 font-semibold">Expected Result</th>
                      <th className="px-4 py-3 font-semibold">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/70">
                    {results.map((result) => (
                      <tr key={result.id} className="align-top">
                        <td className="px-4 py-3 font-semibold text-primary">{result.id}</td>
                        <td className="px-4 py-3 font-medium">{result.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{result.preconditions}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <ol className="list-decimal space-y-1 pl-4">
                            {result.steps.map((step, index) => (
                              <li key={`${result.id}-step-${index}`}>{step}</li>
                            ))}
                          </ol>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{result.expectedResult}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {result.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-white/80 bg-white/40 p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center text-white shadow-lg">
                  <Brain className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold">No test cases generated yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add a requirement, choose the output settings, and generate the first mock result.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
>>>>>>> Stashed changes

function WandIcon() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-white shadow">
      <Sparkles className="h-4 w-4" />
    </span>
  );
}

export default QAGeniusPage;
