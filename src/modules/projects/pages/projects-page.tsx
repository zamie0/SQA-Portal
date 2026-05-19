"use client";

import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { projects } from "@/shared/lib/mock-data";
import {
  listUserProjects,
  createUserProject,
  deleteUserProject,
  ALL_TABS,
  defaultTabsFor,
  type ProjectTabId,
} from "@/shared/state";
import { useEventTick } from "@/shared/state";
import { useRef, useState } from "react";
import { Plus, Search, Users, FolderOpen, Upload, X, Trash2, Check } from "lucide-react";

type ProjectCard = {
  id: string;
  name: string;
  description?: string;
  type: "Test Automation" | "RPA";
  color: string;
  initials: string;
  cases: number;
  passRate: number;
  runs: unknown[];
  members: number;
  photo: string | null;
  isUser: boolean;
};

function ProjectsPage() {
  useEventTick("qe-hub.user-projects-changed");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"All" | "Test Automation" | "RPA">("All");
  const [query, setQuery] = useState("");
  const userProjects = listUserProjects();

  const combined = [
    ...projects.map((p) => ({ ...p, photo: null as string | null, isUser: false })),
    ...userProjects.map((p) => ({
      ...p,
      isUser: true,
      cases: 0,
      passRate: 100,
      runs: [] as unknown[],
    })),
  ];

  const visible = combined.filter(
    (p) =>
      (filter === "All" || p.type === filter) &&
      (query === "" || p.name.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Folder-style workspaces for your automation suites and RPA bots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Create project
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-4 py-2.5 rounded-2xl glass">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl glass">
          {(["All", "Test Automation", "RPA"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((p) => (
          <ProjectCardItem key={p.id} project={p} onDelete={deleteUserProject} />
        ))}

        <button
          onClick={() => setOpen(true)}
          className="rounded-3xl border-2 border-dashed border-border p-6 grid place-items-center text-center min-h-[260px] hover:border-primary/60 hover:bg-white/40 transition"
        >
          <div>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white/60 border border-white/70 grid place-items-center mb-3">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="font-medium">Create new project</div>
            <div className="text-xs text-muted-foreground mt-1">Pick photo, name and tabs</div>
          </div>
        </button>
      </div>

      {open && <CreateProjectModal onClose={() => setOpen(false)} />}
    </Shell>
  );
}

function ProjectCardItem({
  project: p,
  onDelete,
}: {
  project: ProjectCard;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl glass glass-hover p-6 block group relative">
      {p.isUser && (
        <button
          onClick={() => {
            if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
              onDelete(p.id);
            }
          }}
          className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive z-10"
          aria-label="Delete project"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <Link href={`/projects/${p.id}`} className="block">
        <div className="flex items-start justify-between">
          {p.photo ? (
            <img src={p.photo} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div
              className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${p.color} grid place-items-center text-white text-lg font-bold shadow-lg`}
            >
              {p.initials}
            </div>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-white/60 border border-white/70 text-muted-foreground mt-1 mr-7">
            {p.type}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-semibold group-hover:text-primary transition">{p.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description || "—"}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/50 border border-white/60 py-2">
            <div className="text-base font-semibold">{p.cases}</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Cases</div>
          </div>
          <div className="rounded-xl bg-white/50 border border-white/60 py-2">
            <div className="text-base font-semibold text-success">{p.passRate}%</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Pass</div>
          </div>
          <div className="rounded-xl bg-white/50 border border-white/60 py-2">
            <div className="text-base font-semibold">{p.runs.length}</div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Runs</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {p.members} members
          </span>
          {p.isUser ? (
            <span className="inline-flex items-center gap-1 text-primary font-medium">
              <Check className="h-3 w-3" /> Yours
            </span>
          ) : (
            <span>Last run · {(p as { lastRun?: string }).lastRun}</span>
          )}
        </div>
      </Link>
    </div>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"Test Automation" | "RPA">("Test Automation");
  const [photo, setPhoto] = useState<string | null>(null);
  const [tabs, setTabs] = useState<ProjectTabId[]>(defaultTabsFor("Test Automation"));
  const fileRef = useRef<HTMLInputElement>(null);

  function changeType(t: "Test Automation" | "RPA") {
    setType(t);
    setTabs(defaultTabsFor(t));
  }

  function pickPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function toggleTab(id: ProjectTabId) {
    setTabs((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function submit() {
    if (!name.trim()) {
      alert("Project name is required.");
      return;
    }
    createUserProject({
      name,
      description,
      type,
      photo,
      tabs: tabs.length ? tabs : ["overview", "settings"],
    });
    onClose();
  }

  const visibleTabs = ALL_TABS.filter((t) => {
    if (type === "RPA" && t.nonRpaOnly) return false;
    if (type !== "RPA" && t.rpaOnly) return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl glass-strong p-7 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create project</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 ? "Step 1 of 2 · Basic info" : "Step 2 of 2 · Pick the tabs you want"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-xl hover:bg-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 1 ? (
          <div className="mt-5 space-y-4">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-400 to-indigo-500 grid place-items-center text-white font-bold text-xl shadow-lg shrink-0">
                {photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  name
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "PJ"
                )}
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Project photo
                </label>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-sm"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload image
                  </button>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  PNG, JPG. Stored in your browser.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Project name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile Banking Regression"
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/70 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Short summary of what this project covers."
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/70 outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Project type
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                {(["Test Automation", "RPA"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeType(t)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium text-left ${
                      type === t ? "border-primary bg-primary/5" : "border-white/70 bg-white/50"
                    }`}
                  >
                    <div className="font-semibold">{t}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t === "Test Automation"
                        ? "Selenium · Cypress · Playwright"
                        : "Robotic process flows"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick which workspace tabs to enable. You can always change this later in project
              Settings.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {visibleTabs.map((t) => {
                const checked = tabs.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTab(t.id)}
                    className={[
                      "text-left rounded-2xl border p-3 transition",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-white/70 bg-white/50 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{t.label}</span>
                      <span
                        className={[
                          "h-5 w-5 rounded-md grid place-items-center transition",
                          checked
                            ? "bg-primary text-primary-foreground"
                            : "bg-white border border-border",
                        ].join(" ")}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{tabs.length} tab(s) selected.</p>
          </div>
        )}

        <div className="mt-7 flex justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/60"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/60"
              >
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                onClick={() => (name.trim() ? setStep(2) : alert("Please enter a project name."))}
                className="px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium"
              >
                Next: pick tabs
              </button>
            ) : (
              <button
                onClick={submit}
                className="px-5 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg"
              >
                Create project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;
