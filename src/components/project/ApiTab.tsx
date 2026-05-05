import { useState } from "react";
import type { ApiEndpoint, Project } from "@/lib/mock-data";
import { Plus, Send, Save, CheckCircle2, XCircle, Clock } from "lucide-react";

const methodColors: Record<string, string> = {
  GET: "bg-success/15 text-success",
  POST: "bg-primary/15 text-primary",
  PUT: "bg-warning/15 text-warning-foreground",
  DELETE: "bg-destructive/10 text-destructive",
  PATCH: "bg-accent/20 text-accent-foreground",
};

export function ApiTab({ project }: { project: Project }) {
  const [selectedId, setSelectedId] = useState<string>(project.apis[0]?.id ?? "");
  const selected = project.apis.find((a) => a.id === selectedId);

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-4">
      {/* List */}
      <div className="rounded-3xl glass p-4 self-start">
        <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium mb-3">
          <Plus className="h-4 w-4" /> New endpoint
        </button>
        <div className="space-y-1.5">
          {project.apis.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={`w-full text-left p-3 rounded-xl transition ${
                a.id === selectedId
                  ? "bg-foreground text-background"
                  : "bg-white/40 hover:bg-white/70"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    a.id === selectedId
                      ? "bg-background/15 text-background"
                      : methodColors[a.method]
                  }`}
                >
                  {a.method}
                </span>
                <span className="text-sm font-medium truncate">{a.name}</span>
              </div>
              <div
                className={`mt-1 text-[11px] truncate ${
                  a.id === selectedId ? "text-background/70" : "text-muted-foreground"
                }`}
              >
                {a.url}
              </div>
            </button>
          ))}
          {project.apis.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No endpoints yet. Add one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <ApiEditor api={selected} />
      ) : (
        <div className="rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
          Select an endpoint to view it.
        </div>
      )}
    </div>
  );
}

function ApiEditor({ api }: { api: ApiEndpoint }) {
  const [tab, setTab] = useState<"request" | "response">("request");
  const ok = api.lastStatus && api.lastStatus < 400;

  const sampleResponse = ok
    ? `{\n  "ok": true,\n  "id": "12345",\n  "createdAt": "${new Date().toISOString()}"\n}`
    : `{\n  "error": "Internal Server Error",\n  "code": ${api.lastStatus ?? 500},\n  "trace": "x-trace-${Math.random().toString(36).slice(2, 8)}"\n}`;

  return (
    <div className="rounded-3xl glass p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-xs font-bold px-2 py-1 rounded ${methodColors[api.method]}`}>
            {api.method}
          </span>
          <input
            defaultValue={api.url}
            className="flex-1 bg-white/60 border border-white/70 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm font-medium">
            <Save className="h-4 w-4" /> Save as case
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow">
            <Send className="h-4 w-4" /> Send
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/40 w-fit">
        {(["request", "response"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
              tab === t ? "bg-foreground text-background" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "request" ? (
        <>
          <Field label="Headers">
            <div className="space-y-1.5">
              {Object.entries(api.headers).length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No headers</div>
              ) : (
                Object.entries(api.headers).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-2">
                    <input
                      defaultValue={k}
                      className="bg-white/60 border border-white/70 rounded-lg px-3 py-1.5 text-xs font-mono outline-none"
                    />
                    <input
                      defaultValue={v}
                      className="bg-white/60 border border-white/70 rounded-lg px-3 py-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                ))
              )}
            </div>
          </Field>
          {api.body && (
            <Field label="Body (JSON)">
              <textarea
                defaultValue={api.body}
                rows={8}
                className="w-full bg-foreground text-background/95 rounded-xl px-4 py-3 text-xs font-mono outline-none resize-none"
              />
            </Field>
          )}
          <Field label="Validation">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">Expect status</span>
              <input
                defaultValue={api.expectedStatus}
                className="w-20 bg-white/60 border border-white/70 rounded-lg px-3 py-1.5 text-sm font-mono outline-none"
              />
              <span className="text-muted-foreground">contains</span>
              <input
                placeholder='"id"'
                className="flex-1 min-w-[120px] bg-white/60 border border-white/70 rounded-lg px-3 py-1.5 text-sm font-mono outline-none"
              />
            </div>
          </Field>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                ok
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {api.lastStatus ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {api.lastDurationMs ?? 0} ms
            </span>
          </div>
          <pre className="bg-foreground text-background/95 rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto">
            {sampleResponse}
          </pre>
        </>
      )}

      <div className="flex flex-wrap gap-1.5">
        {api.tags.map((t) => (
          <span
            key={t}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/60 border border-white/70 text-muted-foreground"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}
