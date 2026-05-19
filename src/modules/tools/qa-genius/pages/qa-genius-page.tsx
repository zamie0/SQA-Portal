"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  ClipboardCopy,
  Download,
  Eraser,
  FileCheck2,
  FileText,
  Loader2,
  Network,
  Paperclip,
  Send,
  Sparkles,
  Ticket,
  UploadCloud,
  X,
} from "lucide-react";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Shell } from "@/shared/components/layout/Shell";
import { Toaster } from "@/shared/components/ui/sonner";
import {
  formatUatTestCasesForCopy,
  formatUatTestCasesForCsv,
  formatUatTestCasesForExcelHtml,
  normalizeUatTestCases,
  type UatTestCase,
} from "@/modules/tools/qa-genius/lib/uat-test-cases";
import { UatTestCaseTable } from "@/modules/tools/qa-genius/components/uat-test-case-table";

type QaGeniusHistoryItem = {
  id: string;
  requirement: string;
  createdAt: string;
  testCases: UatTestCase[];
};

type SqaCopilotHandoff = {
  source: "sqa-copilot";
  createdAt: string;
  requirement: string;
  autoRun: boolean;
};

const historyStorageKey = "qagenius-history";
const copilotHandoffStorageKey = "sqa-copilot-to-qagenius";

type RequirementAttachment = {
  name: string;
  mimeType: string;
  size: number;
  data: string;
};

type CopilotToolHandoff = {
  href: string;
  prompt: string;
  autoGenerate?: boolean;
  attachments: RequirementAttachment[];
};

type CopilotImportNotice = {
  autoGenerate?: boolean;
  attachmentCount: number;
  attachmentNames: string;
};

const featureCards = [
  {
    title: "URS/SYRS Coverage",
    description: "Maps source requirements into positive, negative, edge, and workflow UAT cases.",
    icon: FileCheck2,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Module Grouping",
    description: "Groups cases by the relevant parts found in the uploaded requirement content.",
    icon: Network,
    color: "from-sky-500 to-cyan-500",
  },
  {
    title: "Jira-Aware Fields",
    description: "Keeps Jira IDs blank unless the source or user input provides them.",
    icon: Ticket,
    color: "from-violet-500 to-indigo-500",
  },
  {
    title: "Formal Export",
    description: "Exports the UAT table with the same ordered columns used on screen.",
    icon: Download,
    color: "from-rose-500 to-orange-500",
  },
] as const;

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function createHistoryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `qg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readQaGeniusHistory(): QaGeniusHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const rawHistory = window.localStorage.getItem(historyStorageKey);
    if (!rawHistory) return [];

    const parsed = JSON.parse(rawHistory) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => {
        const requirement = normalizeText(item.requirement, "");
        return {
          id: normalizeText(item.id, createHistoryId()),
          requirement,
          createdAt: normalizeText(item.createdAt, new Date().toISOString()),
          testCases: normalizeUatTestCases(item.testCases, requirement),
        };
      })
      .filter((item) => item.requirement || item.testCases.length > 0)
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      );
  } catch {
    return [];
  }
}

function writeQaGeniusHistory(history: QaGeniusHistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(historyStorageKey, JSON.stringify(history.slice(0, 25)));
}

function saveQaGeniusHistoryItem(item: QaGeniusHistoryItem) {
  const history = readQaGeniusHistory();
  writeQaGeniusHistory([item, ...history.filter((entry) => entry.id !== item.id)]);
}

function readSqaCopilotHandoff(): SqaCopilotHandoff | null {
  if (typeof window === "undefined") return null;

  try {
    const rawHandoff = window.localStorage.getItem(copilotHandoffStorageKey);
    if (!rawHandoff) return null;

    const parsed = JSON.parse(rawHandoff) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const handoff = parsed as Record<string, unknown>;
    if (handoff.source !== "sqa-copilot") return null;

    return {
      source: "sqa-copilot",
      createdAt: normalizeText(handoff.createdAt, new Date().toISOString()),
      requirement: normalizeText(handoff.requirement, ""),
      autoRun: handoff.autoRun === true,
    };
  } catch {
    return null;
  }
}

function clearSqaCopilotHandoff() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(copilotHandoffStorageKey);
}

function isTextRequirementAttachment(attachment: RequirementAttachment) {
  const ext = attachment.name.split(".").pop()?.toLowerCase();
  return (
    attachment.mimeType.startsWith("text/") ||
    ["txt", "md", "csv", "json", "xml", "yaml", "yml"].includes(ext ?? "")
  );
}

function isLegacyDocFile(file: File) {
  return file.type === "application/msword" || file.name.toLowerCase().endsWith(".doc");
}

function stripDocumentAttachmentNotes(value: string) {
  return value
    .replace(
      /\s*Uploaded requirement source:[^\n]*(?:\n(?:File attached\.[^\n]*|Attached document from SQA Copilot\.[^\n]*))*\s*/gi,
      "\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeBase64Text(data: string) {
  try {
    const binary = window.atob(data);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function fileToRequirementAttachment(file: File) {
  return new Promise<RequirementAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.onload = () => {
      const previewUrl = String(reader.result ?? "");
      const [, data = ""] = previewUrl.split(",");
      resolve({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data,
      });
    };
    reader.readAsDataURL(file);
  });
}

function getFilePrefix(file: File) {
  return `\n\nUploaded requirement source: ${file.name} (${file.type || "unknown type"}, ${Math.ceil(
    file.size / 1024,
  )} KB)\n`;
}

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "QA Genius could not generate test cases. Please try again.";
}

function downloadBlob(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function QAGeniusPage() {
  const [requirement, setRequirement] = useState("");
  const [results, setResults] = useState<UatTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Results");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [requirementAttachments, setRequirementAttachments] = useState<RequirementAttachment[]>([]);
  const [copilotImport, setCopilotImport] = useState<CopilotImportNotice | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoGenerateHandoffRef = useRef(false);

  const hasResults = results.length > 0;
  const hasMixedRequirementSources =
    requirementAttachments.length > 0 && stripDocumentAttachmentNotes(requirement).length > 0;

  const generateTestCases = useCallback(
    async ({
      requirement: nextRequirement,
      attachments: nextAttachments = requirementAttachments,
    }: {
      requirement: string;
      attachments?: RequirementAttachment[];
    }) => {
      if (!nextRequirement.trim() && nextAttachments.length === 0) {
        const message = "Add a URS/SYRS requirement or upload a requirement document first.";
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
            requirement: nextRequirement,
            attachments: nextAttachments,
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "QA Genius could not generate test cases. Please try again.");
        }

        const data = (await response.json()) as { testCases?: unknown };
        const normalized = normalizeUatTestCases(data.testCases, nextRequirement);

        if (normalized.length === 0) {
          throw new Error(
            "QA Genius did not return any test cases. Please add more requirement detail.",
          );
        }

        const historyItem: QaGeniusHistoryItem = {
          id: createHistoryId(),
          requirement: nextRequirement,
          createdAt: new Date().toISOString(),
          testCases: normalized,
        };

        setResults(normalized);
        saveQaGeniusHistoryItem(historyItem);
        toast.success("UAT test cases generated", {
          description: `${normalized.length} formal test case${
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
    },
    [requirementAttachments],
  );

  useEffect(() => {
    const handoff = readSqaCopilotHandoff();
    if (handoff?.requirement) {
      setRequirement(handoff.requirement);
      setResults([]);
      clearSqaCopilotHandoff();

      if (handoff.autoRun) {
        void generateTestCases({ requirement: handoff.requirement });
      }

      return;
    }

    clearSqaCopilotHandoff();

    const [latest] = readQaGeniusHistory();
    if (!latest) return;

    setRequirement(latest.requirement);
    setResults(latest.testCases);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem("sqa-copilot:tool-handoff");
    if (!raw) return;

    try {
      const handoff = JSON.parse(raw) as CopilotToolHandoff;
      if (handoff.href !== "/tools/qa-genius") return;

      const attachments = (handoff.attachments ?? []).slice(0, 4);
      const attachmentText = attachments
        .map((attachment) => {
          const prefix = `\n\nUploaded requirement source: ${attachment.name} (${
            attachment.mimeType || "unknown type"
          }, ${Math.ceil(attachment.size / 1024)} KB)\n`;

          if (isTextRequirementAttachment(attachment)) {
            return `${prefix}${decodeBase64Text(attachment.data).trim()}`;
          }

          return `${prefix}Attached document from SQA Copilot. QA Genius will use this file as source material.`;
        })
        .join("");

      setRequirement(`${handoff.prompt.trim()}${attachmentText}`.trim());
      setRequirementAttachments(
        attachments.filter((attachment) => !isTextRequirementAttachment(attachment)),
      );
      setUploadedFileName(attachments.map((attachment) => attachment.name).join(", "));
      setCopilotImport({
        autoGenerate: handoff.autoGenerate === true,
        attachmentCount: attachments.length,
        attachmentNames: attachments.map((attachment) => attachment.name).join(", "),
      });
      window.localStorage.removeItem("sqa-copilot:tool-handoff");

      toast.success("Copied from SQA Copilot", {
        description:
          attachments.length > 0
            ? "The prompt and attached document are ready in QA Genius."
            : "The prompt is ready in QA Genius.",
      });
    } catch {
      window.localStorage.removeItem("sqa-copilot:tool-handoff");
    }
  }, []);

  useEffect(() => {
    if (!copilotImport?.autoGenerate || autoGenerateHandoffRef.current || isLoading) return;
    if (!requirement.trim()) return;

    autoGenerateHandoffRef.current = true;
    void generateTestCases({ requirement });
  }, [copilotImport?.autoGenerate, generateTestCases, isLoading, requirement]);

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;

    setErrorMessage("");

    if (isLegacyDocFile(file)) {
      const message =
        "Legacy .doc files are not supported. Please save the document as .docx or PDF, then upload it again.";
      setUploadedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrorMessage(message);
      toast.error("Unsupported Word document", { description: message });
      return;
    }

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
      try {
        const attachment = await fileToRequirementAttachment(file);
        const message =
          "File attached. DOCX files are extracted as text before generation; PDF files are used as supported source documents.";
        setRequirementAttachments((current) => [...current, attachment].slice(-4));
        setRequirement((current) => `${current}${getFilePrefix(file)}${message}`);
        toast.info("Document attached", { description: message });
      } catch {
        const message = "QA Genius could not attach that file. Please try another document.";
        setErrorMessage(message);
        toast.error("File upload failed", { description: message });
      }
      return;
    }

    try {
      const text = await file.text();
      setRequirement((current) => `${current}${getFilePrefix(file)}${text.trim()}`);
      toast.success("Requirement file loaded", {
        description: `${file.name} was added to the generator input.`,
      });
    } catch {
      const message = "QA Genius could not read that file. Please paste the requirement text.";
      setErrorMessage(message);
      toast.error("File upload failed", { description: message });
    }
  };

  const handleGenerate = async () => {
    await generateTestCases({ requirement });
  };

  const handleCopy = async () => {
    if (!hasResults) return;

    try {
      await navigator.clipboard.writeText(formatUatTestCasesForCopy(results));
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

    downloadBlob(
      `\ufeff${formatUatTestCasesForCsv(results)}`,
      "text/csv;charset=utf-8",
      "qa-genius-uat-test-cases.csv",
    );
    toast.success("CSV exported");
  };

  const handleExportExcel = () => {
    if (!hasResults) return;

    downloadBlob(
      formatUatTestCasesForExcelHtml(results),
      "application/vnd.ms-excel;charset=utf-8",
      "qa-genius-uat-test-cases.xls",
    );
    toast.success("Excel file exported");
  };

  const handleClear = () => {
    setRequirement("");
    setResults([]);
    setIsLoading(false);
    setCopyLabel("Copy Results");
    setErrorMessage("");
    setUploadedFileName("");
    setRequirementAttachments([]);
    setCopilotImport(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <RequireAuth>
      <Shell>
        <Toaster />

        <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shadow-lg">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Formal UAT generator
                </div>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold font-display">QA Genius</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  Generate module-grouped UAT test cases from URS/SYRS documents with Jira-aware
                  fields, numbered procedures, expected results, remarks, and tags.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/60 border border-white/70 px-4 py-3 text-sm text-muted-foreground md:max-w-xs">
              QA Genius now decides coverage, parts, priority, tags, scenarios, and case count from
              the source requirement.
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

            {copilotImport ? (
              <div
                tabIndex={-1}
                className="mb-5 rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-sm text-sky-950 shadow-sm"
                aria-live="polite"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold">Imported from SQA Copilot</div>
                    <p className="mt-1 text-xs leading-5 text-sky-800">
                      Your prompt
                      {copilotImport.attachmentCount > 0
                        ? ` and ${copilotImport.attachmentCount} document${
                            copilotImport.attachmentCount === 1 ? "" : "s"
                          }`
                        : ""}{" "}
                      were added to QA Genius.
                      {copilotImport.autoGenerate
                        ? " Test case generation will start automatically."
                        : " Review the content, then generate when ready."}
                    </p>
                    {copilotImport.attachmentNames ? (
                      <p className="mt-1 truncate text-[11px] font-medium text-sky-700">
                        {copilotImport.attachmentNames}
                      </p>
                    ) : null}
                  </div>
                  {!copilotImport.autoGenerate ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setCopilotImport(null)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        Edit first
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCopilotImport(null);
                          void handleGenerate();
                        }}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
                      >
                        Generate
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <label className="block text-sm font-medium mb-2" htmlFor="requirement">
              Requirement, URS, SYRS, user story, or extracted document text
            </label>
            <textarea
              id="requirement"
              value={requirement}
              onChange={(event) => setRequirement(event.target.value)}
              placeholder="Paste URS/SYRS content, acceptance criteria, Jira story details, or upload a requirement document..."
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
                      TXT, MD, CSV, JSON, and XML are read directly. DOCX files are extracted as
                      text before generation. PDF files are used as supported source documents.
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
                      setRequirementAttachments([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/10"
                    aria-label="Remove uploaded file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              {hasMixedRequirementSources ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Uploaded documents are treated as the primary URS/SYRS source. Text in the box
                    is used as notes only; if it appears unrelated, QA Genius will ask you to choose
                    one source.
                  </p>
                </div>
              ) : null}
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
                Generate
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
                  Formal UAT test cases appear grouped by the relevant URS/SYRS parts.
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
                  onClick={handleExportExcel}
                  disabled={!hasResults}
                  className="inline-flex items-center justify-center gap-2 rounded-xl glass-strong px-4 py-2.5 text-sm font-medium transition hover:bg-white/80 disabled:pointer-events-none disabled:opacity-40"
                >
                  <FileText className="h-4 w-4" />
                  Export Excel
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
                  <p className="mt-3 text-sm font-medium">Generating formal UAT test cases...</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    QA Genius is analyzing requirements, modules, coverage, and risk levels.
                  </p>
                </div>
              </div>
            ) : hasResults ? (
              <UatTestCaseTable title="Test Flow: Formal UAT Test Cases" testCases={results} />
            ) : (
              <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-white/80 bg-white/40 p-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center text-white shadow-lg">
                    <Brain className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">No UAT test cases generated yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Paste or upload URS/SYRS content and QA Genius will produce a formal test case
                    table.
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
