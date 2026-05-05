"use client";

import { useState } from "react";
import { ALL_TABS, setProjectTabs, type ProjectTabId } from "@/lib/user-projects";

export function ProjectTabsToggle({
  projectId,
  enabled,
  fallback,
  type,
}: {
  projectId: string;
  enabled: ProjectTabId[];
  fallback: ProjectTabId[];
  type: "Test Automation" | "RPA";
}) {
  const [current, setCurrent] = useState<ProjectTabId[]>(enabled);
  const visible = ALL_TABS.filter((t) => {
    if (type === "RPA" && t.nonRpaOnly) return false;
    if (type !== "RPA" && t.rpaOnly) return false;
    return true;
  });

  function toggle(id: ProjectTabId) {
    if (id === "overview" || id === "settings") return;
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    setCurrent(next);
    void setProjectTabs(projectId, next);
  }

  function reset() {
    setCurrent(fallback);
    void setProjectTabs(projectId, fallback);
  }

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Workspace tabs</h3>
          <p className="text-xs text-muted-foreground">
            Show or hide tabs in this project&apos;s workspace.
          </p>
        </div>
        <button type="button" onClick={reset} className="text-xs px-3 py-1.5 rounded-lg glass">
          Reset
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {visible.map((t) => {
          const checked = current.includes(t.id);
          const locked = t.id === "overview" || t.id === "settings";
          return (
            <button
              key={t.id}
              type="button"
              disabled={locked}
              onClick={() => toggle(t.id)}
              className={[
                "text-left rounded-xl border p-3 text-sm transition",
                checked
                  ? "border-primary bg-primary/5"
                  : "border-white/70 bg-white/50 hover:bg-white",
                locked ? "opacity-70 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {checked ? "On" : "Off"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              {locked && <p className="text-[10px] text-muted-foreground mt-1">Always visible</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
