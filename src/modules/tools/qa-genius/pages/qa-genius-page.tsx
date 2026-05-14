"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  ClipboardCopy,
  Code2,
  Download,
  Eraser,
  FileCheck2,
  FileText,
  Loader2,
  Network,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Shell } from "@/shared/components/layout/Shell";
import { Toaster } from "@/shared/components/ui/sonner";

type TestType = "Functional" | "API" | "Security" | "Performance" | "Automation";
type Priority = "Low" | "Medium" | "High";

type GeneratedTestCase = {
  id?: string;
  title?: string;
  scenario?: string;
  description?: string;
  preconditions?: string;
  steps?: string[];
  testSteps?: string[];
  expectedResult?: unknown;
  priority?: string;
  category?: string;
};

type NormalizedTestCase = {
  id: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string[];
  expectedResults: string[];
  priority: string;
  category: string;
};

const testTypes: TestType[] = ["Functional", "API", "Security", "Performance", "Automation"];
const priorities: Priority[] = ["Low", "Medium", "High"];
const maxCaseOptions = [3, 5, 8, 10, 15, 20];

const featureCards = [
  {
    title: "Functional Coverage",
    description: "Generate positive, negative, edge, and workflow-focused test cases.",
    icon: FileCheck2,
    color: "from-fuchsia-500 to-violet-600",
  },
  {
    title: "Security Scenarios",
    description: "Identify access, validation, abuse, and sensitive-data risks.",
    icon: ShieldCheck,
    color: "from-rose-500 to-orange-500",
  },
  {
    title: "Robot-Ready Steps",
    description: "Produce clear ordered actions that can be adapted into Robot Framework.",
    icon: Code2,
    color: "from-violet-500 to-indigo-500",
  },
  {
    title: "API Validation",
    description: "Create contract, response, payload, and failure-mode scenarios.",
    icon: Network,
    color: "from-sky-500 to-cyan-500",
  },
] as const;

function normalizeSteps(value: unknown) {
  if (Array.isArray(value)) {
    const steps = value
      .map((step) => (typeof step === "string" ? step : String(step ?? "")))
      .map((step) => step.trim())
      .filter(Boolean);

    return steps.length > 0 ? steps : ["Review the requirement and execute the relevant flow."];
  }

  if (typeof value === "string" && value.trim()) {
    const steps = value
      .split(/\r?\n|(?:^|\s)\d+\.\s+/)
      .map((step) => step.trim())
      .filter(Boolean);

    return steps.length > 0 ? steps : [value.trim()];
  }

  return ["Review the requirement and execute the relevant flow."];
}

function normalizeLines(value: unknown, fallback: string) {
  if (Array.isArray(value)) {
    const lines = value
      .map((line) => (typeof line === "string" ? line : String(line ?? "")))
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines : [fallback];
  }

  if (typeof value === "string" && value.trim()) {
    const lines = value
      .split(/\r?\n|(?:^|\s)\d+\.\s+/)
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines : [value.trim()];
  }

  return [fallback];
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTestCases(
  testCases: unknown[],
  selectedType: TestType,
  selectedPriority: Priority,
) {
  return testCases
    .filter((item): item is GeneratedTestCase => !!item && typeof item === "object")
    .map((item, index): NormalizedTestCase => {
      const steps = normalizeSteps(item.steps ?? item.testSteps);
      return {
        id: normalizeText(item.id, `TC-${String(index + 1).padStart(3, "0")}`),
        title: normalizeText(
          item.title ?? item.scenario,
          `Generated ${selectedType} test case ${index + 1}`,
        ),
        description: normalizeText(
          item.description,
          `AI-generated ${selectedType.toLowerCase()} scenario derived from the provided requirement.`,
        ),
        preconditions: normalizeText(
          item.preconditions,
          "Relevant test data and access are available.",
        ),
        steps,
        expectedResults: normalizeLines(
          item.expectedResult,
          "The system behaves according to the requirement and quality expectations.",
        ),
        priority: normalizeText(item.priority, selectedPriority),
        category: normalizeText(item.category, selectedType),
      };
    });
}

function formatResultsForCopy(results: NormalizedTestCase[]) {
  return results
    .map((result) =>
      [
        `TC ID: ${result.id}`,
        `Test Scenario: ${result.title}`,
        `Objective: ${result.description}`,
        `Preconditions: ${result.preconditions}`,
        `Test Procedure:\n${result.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
        `Expected Results:\n${result.expectedResults
          .map((expected, index) => `${index + 1}. ${expected}`)
          .join("\n")}`,
        `Priority: ${result.priority}`,
        `Category: ${result.category}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatResultsForCsv(results: NormalizedTestCase[]) {
  const headers = ["TC ID", "Test Scenario", "Objective", "Test Procedure", "Expected Results"];
  const rows = results.map((result) => [
    result.id,
    result.title,
    result.description,
    result.steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    result.expectedResults.map((expected, index) => `${index + 1}. ${expected}`).join("\n"),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "QA Genius could not generate test cases. Please try again.";
}

function getFilePrefix(file: File) {
  return `\n\nUploaded requirement source: ${file.name} (${file.type || "unknown type"}, ${Math.ceil(
    file.size / 1024,
  )} KB)\n`;
}

export default function QAGeniusPage() {
  const [requirement, setRequirement] = useState("");
  const [testType, setTestType] = useState<TestType>("Functional");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [maxCases, setMaxCases] = useState(5);
  const [results, setResults] = useState<NormalizedTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Results");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasResults = results.length > 0;

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;

    setErrorMessage("");
    setUploadedFileName(file.name);

    const readableTypes = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
      "application/xml",
      "text/xml",
    ];
    const readableExtensions = [".txt", ".md", ".csv", ".json", ".xml"];
    const isReadable =
      readableTypes.includes(file.type) ||
      readableExtensions.some((extension) => file.name.toLowerCase().endsWith(extension));

    if (!isReadable) {
      const message =
        "File attached. For PDF, DOC, and DOCX files, paste the key requirement text into the box so QA Genius can generate accurate test cases.";
      setRequirement((current) => `${current}${getFilePrefix(file)}${message}`);
      toast.info("Document attached", { description: message });
      return;
    }

    try {
      const text = await file.text();
      setRequirement((current) => `${current}${getFilePrefix(file)}${text.trim()}`);
      toast.success("Requirement file loaded", {
        description: `${file.name} was added to the generator input.`,
      });
    } catch {
      const message =
        "QA Genius could not read that file. Please paste the requirement text instead.";
      setErrorMessage(message);
      toast.error("File upload failed", { description: message });
    }
  };

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      const message = "Add a requirement or upload a readable requirement file before generating.";
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
          type: testType,
          testType,
          priority,
          maxCases,
          maxTestCases: maxCases,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "QA Genius could not generate test cases. Please try again.");
      }

      const data = (await response.json()) as { testCases?: unknown };
      if (!Array.isArray(data.testCases)) {
        throw new Error("QA Genius returned an unexpected response. Please try again.");
      }

      const normalized = normalizeTestCases(data.testCases, testType, priority);
      if (normalized.length === 0) {
        throw new Error(
          "QA Genius did not return any test cases. Please add more requirement detail.",
        );
      }

      setResults(normalized);
      toast.success("Test cases generated", {
        description: `${normalized.length} AI-generated test case${
          normalized.length === 1 ? "" : "s"
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
    if (!hasResults) return;

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

  const handleExportCsv = () => {
    if (!hasResults) return;

    const csv = formatResultsForCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qa-genius-${testType.toLowerCase()}-test-cases.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleClear = () => {
    setRequirement("");
    setTestType("Functional");
    setPriority("Medium");
    setMaxCases(5);
    setResults([]);
    setIsLoading(false);
    setCopyLabel("Copy Results");
    setErrorMessage("");
    setUploadedFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <RequireAuth>
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
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered SQA workspace
                </div>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold font-display">QA Genius</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  Generate functional test cases, negative scenarios, edge cases, API validations,
                  security checks, and Robot Framework-ready steps from requirements.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/60 border border-white/70 px-4 py-3 text-sm text-muted-foreground md:max-w-xs">
              Enterprise SQA prompt alignment is handled by the Gemini backend. This page sends
              requirements and renders structured results.
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

        <section className="space-y-6">
          <div className="rounded-3xl glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-white shadow">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold">Generator</h2>
            </div>

            <label className="block text-sm font-medium mb-2" htmlFor="requirement">
              Requirement, URS, user story, or extracted document text
            </label>
            <textarea
              id="requirement"
              value={requirement}
              onChange={(event) => setRequirement(event.target.value)}
              placeholder="Paste a requirement, acceptance criteria, URS clause, API contract, security rule, or upload a readable file..."
              className="min-h-48 w-full resize-y rounded-2xl border border-white/70 bg-white/70 p-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            <div className="mt-4 rounded-2xl border border-dashed border-white/80 bg-white/45 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 border border-white/80">
                    <UploadCloud className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Upload requirement file</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      TXT, MD, CSV, JSON, and XML are read directly. PDF/DOC/DOCX can be attached,
                      then paste the important requirement text for best results.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
                >
                  <Paperclip className="h-4 w-4" />
                  Choose File
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.xml,.pdf,.doc,.docx,text/plain,text/markdown,text/csv,application/json,application/xml,text/xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => void handleFileUpload(event.target.files?.[0])}
                className="hidden"
              />
              {uploadedFileName ? (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{uploadedFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/10"
                    aria-label="Remove uploaded file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>

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
                <select
                  id="max-cases"
                  value={maxCases}
                  onChange={(event) => setMaxCases(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {maxCaseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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
                onClick={() => void handleGenerate()}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:opacity-95 disabled:pointer-events-none disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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
                  Structured AI-generated test cases appear as a formal QA test case table.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={!hasResults}
                  className="inline-flex items-center justify-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm font-medium transition hover:bg-white/80 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  disabled={!hasResults}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition disabled:pointer-events-none disabled:opacity-40"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  {copyLabel}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid min-h-96 place-items-center rounded-2xl border border-white/70 bg-white/50 p-8 text-center">
                <div>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium">
                    Generating enterprise SQA test cases...
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    QA Genius is analyzing the requirement and structuring the output.
                  </p>
                </div>
              </div>
            ) : hasResults ? (
              <div className="w-full max-w-full overflow-x-scroll overflow-y-visible rounded-2xl border border-slate-200 bg-white/60 pb-4">
                <table className="w-[1800px] min-w-[1800px] table-fixed border-collapse text-left text-sm">
                  <tbody>
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-emerald-800 bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        Test Flow: Generated QA Test Cases
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-emerald-800 bg-emerald-500 px-4 py-2 text-sm font-bold text-white"
                      >
                        Part A - {testType} Test Cases
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white">
                      <th className="w-[120px] border border-slate-700 px-3 py-3 align-top font-bold break-words whitespace-normal">
                        TC ID
                      </th>
                      <th className="w-[320px] border border-slate-700 px-3 py-3 align-top font-bold break-words whitespace-normal">
                        Test Scenario
                      </th>
                      <th className="w-[360px] border border-slate-700 px-3 py-3 align-top font-bold break-words whitespace-normal">
                        Objective
                      </th>
                      <th className="w-[520px] border border-slate-700 px-3 py-3 align-top font-bold break-words whitespace-normal">
                        Test Procedure
                      </th>
                      <th className="w-[520px] border border-slate-700 px-3 py-3 align-top font-bold break-words whitespace-normal">
                        Expected Results
                      </th>
                    </tr>
                    {results.map((result, rowIndex) => (
                      <tr
                        key={result.id}
                        className={rowIndex % 2 === 0 ? "bg-white/90" : "bg-slate-50/90"}
                      >
                        <td className="border border-slate-300 px-3 py-3 align-top font-semibold text-slate-900 break-words whitespace-normal">
                          {result.id}
                        </td>
                        <td className="border border-slate-300 px-3 py-3 align-top font-medium text-slate-900 break-words whitespace-normal">
                          {result.title}
                        </td>
                        <td className="border border-slate-300 px-3 py-3 align-top text-slate-800 break-words whitespace-normal">
                          {result.description}
                        </td>
                        <td className="border border-slate-300 px-3 py-3 align-top text-slate-800 break-words whitespace-normal">
                          <ol className="list-decimal space-y-1 pl-5">
                            {result.steps.map((step, index) => (
                              <li key={`${result.id}-step-${index}`} className="pl-1">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </td>
                        <td className="border border-slate-300 px-3 py-3 align-top text-slate-800 break-words whitespace-normal">
                          <ol className="list-decimal space-y-1 pl-5">
                            {result.expectedResults.map((expected, index) => (
                              <li key={`${result.id}-expected-${index}`} className="pl-1">
                                {expected}
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-white/80 bg-white/40 p-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center text-white shadow-lg">
                    <Brain className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">No test cases generated yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Paste a requirement or upload a readable requirement file, choose the generation
                    settings, and QA Genius will produce structured test cases.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </Shell>
    </RequireAuth>
  );
}
