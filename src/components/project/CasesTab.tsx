import { useMemo, useState } from "react";
import type { Project, TestCase } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Clock,
  Plus,
  Upload,
  Search,
  Tag,
  Link2,
  Paperclip,
  FileImage,
  FileText,
  Database,
  X,
} from "lucide-react";

export function CasesTab({ project }: { project: Project }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<TestCase | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    project.testCases.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [project.testCases]);

  const filtered = project.testCases.filter((c) => {
    const matchesQuery =
      !query ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.id.toLowerCase().includes(query.toLowerCase());
    const matchesTag = !activeTag || c.tags.includes(activeTag);
    return matchesQuery && matchesTag;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl glass p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/60 border border-white/70 flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test cases by id or title…"
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm font-medium">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium">
            <Plus className="h-4 w-4" /> New case
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              !activeTag
                ? "bg-foreground text-background"
                : "bg-white/60 border border-white/70 text-muted-foreground"
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                t === activeTag
                  ? "bg-foreground text-background"
                  : "bg-white/60 border border-white/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="h-3 w-3" /> {t}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-3xl glass overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-white/60">
          <div className="col-span-2">ID</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-1">Pri</div>
          <div className="col-span-2">Last run</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="w-full text-left grid grid-cols-12 items-center px-5 py-4 text-sm border-b border-white/40 last:border-b-0 hover:bg-white/40 transition"
          >
            <div className="col-span-2 font-mono text-xs text-muted-foreground">{c.id}</div>
            <div className="col-span-5">
              <div className="font-medium">{c.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {c.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/70 border border-white/70 text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
                {c.linkedApi && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                    <Link2 className="h-3 w-3" /> API
                  </span>
                )}
                {c.linkedScript && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                    <Link2 className="h-3 w-3" /> Script
                  </span>
                )}
                {c.attachments.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Paperclip className="h-3 w-3" /> {c.attachments.length}
                  </span>
                )}
              </div>
            </div>
            <div className="col-span-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.priority === "P1"
                    ? "bg-destructive/10 text-destructive"
                    : c.priority === "P2"
                      ? "bg-warning/15 text-warning-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {c.priority}
              </span>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {c.lastRun}
            </div>
            <div className="col-span-2 flex justify-end">
              <StatusBadge status={c.status} />
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No matches.</div>
        )}
      </div>

      {selected && (
        <CaseDetailDrawer testCase={selected} project={project} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function CaseDetailDrawer({
  testCase,
  project,
  onClose,
}: {
  testCase: TestCase;
  project: Project;
  onClose: () => void;
}) {
  const linkedApi = project.apis.find((a) => a.id === testCase.linkedApi);
  const linkedScript = project.scripts.find((s) => s.id === testCase.linkedScript);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg h-full overflow-y-auto m-0 lg:m-3 rounded-none lg:rounded-3xl glass-strong p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{testCase.id}</div>
            <h2 className="font-display font-bold text-xl mt-0.5">{testCase.title}</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl glass grid place-items-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {testCase.tags.map((t) => (
            <span
              key={t}
              className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-white/70 text-muted-foreground"
            >
              #{t}
            </span>
          ))}
          <StatusBadge status={testCase.status} />
        </div>

        <Section title="Steps">
          <ol className="space-y-2 text-sm">
            {testCase.steps.map((s, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[11px] grid place-items-center font-semibold shrink-0">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Expected">
          <p className="text-sm">{testCase.expected}</p>
        </Section>

        {(linkedApi || linkedScript) && (
          <Section title="Linked to">
            <div className="space-y-2">
              {linkedApi && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    {linkedApi.method}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{linkedApi.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{linkedApi.url}</div>
                  </div>
                </div>
              )}
              {linkedScript && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{linkedScript.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {linkedScript.path}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {testCase.attachments.length > 0 && (
          <Section title="Attachments">
            <div className="grid grid-cols-2 gap-2">
              {testCase.attachments.map((a) => {
                const Icon =
                  a.type === "screenshot" ? FileImage : a.type === "data" ? Database : FileText;
                return (
                  <div
                    key={a.name}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/60 border border-white/70"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-medium truncate">{a.name}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
