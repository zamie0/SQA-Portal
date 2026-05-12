import { useEffect, useState } from "react";
import { getProjectNote, setProjectNote, type ProjectTabId } from "@/shared/lib/user-projects";
import { Save, FileText, Plus, Trash2, Check } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * Generic, fully-functional content area for any tab in a user-created project.
 * Provides notes + a checklist that persists per (projectId, tab).
 */
export function CustomTabContent({
  projectId,
  tabId,
  label,
}: {
  projectId: string;
  tabId: ProjectTabId;
  label: string;
}) {
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const noteKey = `${projectId}::${tabId}`;
  const itemsKey = `qe-hub.checklist.v1.${noteKey}`;

  // Load
  useEffect(() => {
    setNotes(getProjectNote(projectId, tabId));
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(itemsKey);
        setItems(raw ? (JSON.parse(raw) as ChecklistItem[]) : []);
      } catch {
        setItems([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey]);

  function saveNotes() {
    setProjectNote(projectId, tabId, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function persistItems(next: ChecklistItem[]) {
    setItems(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(itemsKey, JSON.stringify(next));
    }
  }

  function addItem() {
    if (!draft.trim()) return;
    persistItems([
      ...items,
      { id: Math.random().toString(36).slice(2, 8), text: draft.trim(), done: false },
    ]);
    setDraft("");
  }
  function toggleItem(id: string) {
    persistItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }
  function removeItem(id: string) {
    persistItems(items.filter((i) => i.id !== id));
  }

  const completed = items.filter((i) => i.done).length;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      {/* Notes */}
      <div className="rounded-3xl glass p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold inline-flex items-center gap-2">
            <FileText className="h-4 w-4" /> {label} notes
          </h3>
          <button
            onClick={saveNotes}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-foreground text-background font-medium"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={14}
          placeholder={`Write anything for the "${label}" tab — plans, links, requirements, scripts...`}
          className="w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/70 outline-none focus:border-primary text-sm resize-none font-mono"
        />
        <p className="text-[11px] text-muted-foreground mt-2">Saved per-tab in your browser.</p>
      </div>

      {/* Checklist */}
      <div className="rounded-3xl glass p-6 self-start">
        <h3 className="font-semibold">Checklist</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {completed} of {items.length} done
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Add a task..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/70 border border-white/70 outline-none focus:border-primary text-sm"
          />
          <button
            onClick={addItem}
            className="h-9 w-9 grid place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {items.length === 0 && (
            <li className="text-xs text-muted-foreground text-center py-4">No items yet.</li>
          )}
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/60 group"
            >
              <button
                onClick={() => toggleItem(i.id)}
                className={[
                  "h-4 w-4 rounded border grid place-items-center shrink-0",
                  i.done
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border bg-white",
                ].join(" ")}
              >
                {i.done && <Check className="h-3 w-3" />}
              </button>
              <span
                className={`flex-1 text-sm ${i.done ? "line-through text-muted-foreground" : ""}`}
              >
                {i.text}
              </span>
              <button
                onClick={() => removeItem(i.id)}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
