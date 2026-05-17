"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";

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

type QaGeniusHistoryItem = {
  id: string;
  requirement: string;
  testType: string;
  priority: string;
  maxCases: number;
  createdAt: string;
  testCases: NormalizedTestCase[];
};

const historyStorageKey = "qagenius-history";

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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
    return [value.trim()];
  }

  return [fallback];
}

function normalizeTestCases(value: unknown): NormalizedTestCase[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id: normalizeText(item.id, `TC-${String(index + 1).padStart(3, "0")}`),
      title: normalizeText(item.title ?? item.testScenario ?? item.scenario, "Untitled scenario"),
      description: normalizeText(
        item.description ?? item.objective,
        "No objective was saved for this test case.",
      ),
      preconditions: normalizeText(item.preconditions, "No specific preconditions."),
      steps: normalizeLines(item.steps ?? item.testProcedure, "No procedure was saved."),
      expectedResults: normalizeLines(
        item.expectedResults ?? item.expectedResult,
        "No expected result was saved.",
      ),
      priority: normalizeText(item.priority, "Medium"),
      category: normalizeText(item.category ?? item.testType, "Functional"),
    }));
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
      .map((item) => ({
        id: normalizeText(item.id, ""),
        requirement: normalizeText(item.requirement, ""),
        testType: normalizeText(item.testType, "Functional"),
        priority: normalizeText(item.priority, "Medium"),
        maxCases:
          typeof item.maxCases === "number" && Number.isFinite(item.maxCases)
            ? item.maxCases
            : 5,
        createdAt: normalizeText(item.createdAt, new Date().toISOString()),
        testCases: normalizeTestCases(item.testCases),
      }))
      .filter((item) => item.id && (item.requirement || item.testCases.length > 0))
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      );
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function QaGeniusHistoryPage() {
  const [history, setHistory] = useState<QaGeniusHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const savedHistory = readQaGeniusHistory();
    setHistory(savedHistory);
    setSelectedId(savedHistory[0]?.id ?? "");
  }, []);

  const selectedItem = history.find((item) => item.id === selectedId) ?? null;

  const handleClearHistory = () => {
    window.localStorage.removeItem(historyStorageKey);
    setHistory([]);
    setSelectedId("");
  };

  return (
    <RequireAuth>
      <Shell>
        <section className="rounded-3xl glass-strong p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold font-display">History</h1>
              <p className="text-muted-foreground mt-2">
                Past QA Genius generations saved in this browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={history.length === 0}
              className="inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            >
              Clear History
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-3xl glass p-5">
            <h2 className="text-lg font-semibold">Saved Generations</h2>
            <div className="mt-4 space-y-3">
              {history.length > 0 ? (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      item.id === selectedId
                        ? "border-primary bg-primary/10"
                        : "border-white/70 bg-white/55 hover:bg-white/80"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {item.testType} - {item.priority}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-slate-700">
                      {item.requirement || "No requirement text saved."}
                    </div>
                    <div className="mt-2 text-xs font-medium text-primary">
                      {item.testCases.length} test case{item.testCases.length === 1 ? "" : "s"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/80 bg-white/40 p-5 text-sm text-muted-foreground">
                  No QA Genius history found in this browser yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl glass p-5">
            {selectedItem ? (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Generated Test Cases</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(selectedItem.createdAt)} - {selectedItem.testType} -{" "}
                    {selectedItem.maxCases} max cases
                  </p>
                </div>
                <div className="mb-5 rounded-2xl border border-white/70 bg-white/55 p-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Requirement
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                    {selectedItem.requirement}
                  </p>
                </div>

                <div className="w-full max-w-full overflow-x-scroll overflow-y-visible rounded-2xl border border-slate-200 bg-white/60 pb-4">
                  <table className="w-[1960px] min-w-[1960px] table-fixed border-collapse text-left text-sm">
                    <tbody>
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-emerald-800 bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          Test Flow: Saved QA Test Cases
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
                        <th className="w-[160px] border border-slate-700 px-3 py-3 align-top font-bold break-words whitespace-normal">
                          Priority
                        </th>
                      </tr>
                      {selectedItem.testCases.map((testCase, rowIndex) => (
                        <tr
                          key={testCase.id}
                          className={rowIndex % 2 === 0 ? "bg-white/90" : "bg-slate-50/90"}
                        >
                          <td className="border border-slate-300 px-3 py-3 align-top font-semibold text-slate-900 break-words whitespace-normal">
                            {testCase.id}
                          </td>
                          <td className="border border-slate-300 px-3 py-3 align-top font-medium text-slate-900 break-words whitespace-normal">
                            {testCase.title}
                          </td>
                          <td className="border border-slate-300 px-3 py-3 align-top text-slate-800 break-words whitespace-normal">
                            {testCase.description}
                          </td>
                          <td className="border border-slate-300 px-3 py-3 align-top text-slate-800 break-words whitespace-normal">
                            <ol className="list-decimal space-y-1 pl-5">
                              {testCase.steps.map((step, index) => (
                                <li key={`${testCase.id}-step-${index}`} className="pl-1">
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </td>
                          <td className="border border-slate-300 px-3 py-3 align-top text-slate-800 break-words whitespace-normal">
                            <ol className="list-decimal space-y-1 pl-5">
                              {testCase.expectedResults.map((expected, index) => (
                                <li key={`${testCase.id}-expected-${index}`} className="pl-1">
                                  {expected}
                                </li>
                              ))}
                            </ol>
                          </td>
                          <td className="border border-slate-300 px-3 py-3 align-top font-medium text-slate-800">
                            {testCase.priority}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-white/80 bg-white/40 p-8 text-center">
                <div className="max-w-sm">
                  <h2 className="text-base font-semibold">No history selected</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Generate test cases in QA Genius first, then return here to view saved results.
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
