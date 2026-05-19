"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import {
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

const historyStorageKey = "qagenius-history";

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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
          id: normalizeText(item.id, ""),
          requirement,
          createdAt: normalizeText(item.createdAt, new Date().toISOString()),
          testCases: normalizeUatTestCases(item.testCases, requirement),
        };
      })
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
                Past QA Genius UAT generations saved in this browser.
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
                      Formal UAT Test Cases
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
                    {formatDate(selectedItem.createdAt)} - {selectedItem.testCases.length} case
                    {selectedItem.testCases.length === 1 ? "" : "s"}
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

                <UatTestCaseTable
                  title="Test Flow: Saved Formal UAT Test Cases"
                  testCases={selectedItem.testCases}
                />
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
