"use client";

import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { useMemo, useState } from "react";
import { Search, HelpCircle, ChevronDown, MessageCircle } from "lucide-react";
import { faqGroups } from "@/features/help";
import ReactMarkdown from "react-markdown";

function FaqPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqGroups;

    return faqGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  const total = filtered.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <Shell>
      {/* Hero */}
      <div className="rounded-3xl glass-strong p-6 mb-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 opacity-25 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center text-white shadow-lg">
              <HelpCircle className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-bold">Frequently asked questions</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Answers about projects, test cases, scripts, API testing, RPA flows, and
                integrations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-2xl glass">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the FAQ — try 'RPA', 'schedule', 'CI/CD'..."
          className="bg-transparent outline-none text-sm flex-1"
        />
        {query && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {total} result{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-5">
        {filtered.length === 0 ? (
          <div className="rounded-3xl glass p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No matches for <span className="font-medium text-foreground">"{query}"</span>. Try the
              AI Assistant —
            </p>

            <Link
              href="/help/chat"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg"
            >
              <MessageCircle className="h-4 w-4" /> Ask the AI assistant
            </Link>
          </div>
        ) : (
          filtered.map((group) => (
            <section key={group.label} className="rounded-3xl glass p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {group.label}
              </h2>

              <div className="divide-y divide-white/40">
                {group.items.map((item) => {
                  const id = `${group.label}::${item.q}`;
                  const isOpen = open === id;

                  return (
                    <div key={id} className="py-3 first:pt-0 last:pb-0">
                      {/* Question */}
                      <button
                        onClick={() => setOpen(isOpen ? null : id)}
                        className="w-full flex items-center justify-between gap-3 text-left"
                      >
                        <span className="font-medium">{item.q}</span>

                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Animated Answer */}
                      <div
                        className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                          isOpen
                            ? "grid-rows-[1fr] opacity-100 mt-3"
                            : "grid-rows-[0fr] opacity-0 mt-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="prose prose-sm max-w-none text-sm text-muted-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-white/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown>{item.a}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </Shell>
  );
}

export default FaqPage;
