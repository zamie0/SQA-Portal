// localStorage-backed store for user-created projects + tab visibility config.
// Built-in (mock) projects from mock-data.ts also get a tab-visibility entry
// stored here so users can toggle tabs in Settings.

export type ProjectTabId =
  | "overview"
  | "cases"
  | "api"
  | "scripts"
  | "rpa"
  | "mobile"
  | "web"
  | "execution"
  | "results"
  | "files"
  | "discussion"
  | "settings";

export interface UserProject {
  id: string;
  name: string;
  description: string;
  type: "Test Automation" | "RPA";
  /** data URL of uploaded photo, or null */
  photo: string | null;
  /** initials shown when no photo */
  initials: string;
  /** gradient color classes (Tailwind) */
  color: string;
  members: number;
  createdAt: string;
  /** ids of tabs the user wants visible */
  tabs: ProjectTabId[];
}

const PROJECTS_KEY = "qe-hub.user-projects.v1";
const TABS_KEY = "qe-hub.project-tabs.v1";
// per project notes for custom workspace content (per tab)
const NOTES_KEY = "qe-hub.project-notes.v1";

export const ALL_TABS: {
  id: ProjectTabId;
  label: string;
  description: string;
  rpaOnly?: boolean;
  nonRpaOnly?: boolean;
}[] = [
  { id: "overview", label: "Overview", description: "Smart dashboard with KPIs and trends" },
  { id: "cases", label: "Test Cases", description: "Manage manual + automated test cases" },
  { id: "api", label: "API Testing", description: "Endpoints, requests, contracts" },
  {
    id: "scripts",
    label: "Scripts",
    description: "Playwright / Cypress / Robot scripts",
    nonRpaOnly: true,
  },
  { id: "rpa", label: "RPA Builder", description: "Visual flow builder for bots", rpaOnly: true },
  { id: "mobile", label: "Mobile", description: "Devices and mobile builds", nonRpaOnly: true },
  {
    id: "web",
    label: "Web & Suites",
    description: "Suites, environments, browsers",
    nonRpaOnly: true,
  },
  { id: "execution", label: "Execution", description: "Trigger & monitor runs" },
  { id: "results", label: "Results", description: "Run history, charts, exports" },
  { id: "files", label: "Files", description: "Folders, file uploads, editor" },
  { id: "discussion", label: "Discussion", description: "Team discussion threads" },
  { id: "settings", label: "Settings", description: "Project config & integrations" },
];

export function defaultTabsFor(type: "Test Automation" | "RPA"): ProjectTabId[] {
  return ALL_TABS.filter((t) => {
    if (type === "RPA" && t.nonRpaOnly) return false;
    if (type !== "RPA" && t.rpaOnly) return false;
    return true;
  }).map((t) => t.id);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function read(): UserProject[] {
  if (typeof window === "undefined") return [];
  return safeParse<UserProject[]>(localStorage.getItem(PROJECTS_KEY), []);
}

function write(list: UserProject[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("qe-hub.user-projects-changed"));
}

export function listUserProjects(): UserProject[] {
  return read();
}

export function getUserProject(id: string): UserProject | undefined {
  return read().find((p) => p.id === id);
}

const GRADIENTS = [
  "from-violet-400 to-indigo-500",
  "from-sky-400 to-cyan-500",
  "from-rose-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-fuchsia-400 to-purple-500",
];

export function createUserProject(input: {
  name: string;
  description: string;
  type: "Test Automation" | "RPA";
  photo: string | null;
  tabs: ProjectTabId[];
}): UserProject {
  const list = read();
  const id = `up-${Date.now().toString(36)}`;
  const initials =
    input.name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PJ";
  const project: UserProject = {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    type: input.type,
    photo: input.photo,
    initials,
    color: GRADIENTS[list.length % GRADIENTS.length],
    members: 1,
    createdAt: new Date().toISOString(),
    tabs: input.tabs.length ? input.tabs : defaultTabsFor(input.type),
  };
  write([project, ...list]);
  return project;
}

export function updateUserProject(id: string, patch: Partial<UserProject>) {
  const list = read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  write(list);
}

export function deleteUserProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

// ---------- per-project tab visibility (works for built-in mock projects too) ----------

interface TabsMap {
  [projectId: string]: ProjectTabId[];
}

function readTabs(): TabsMap {
  if (typeof window === "undefined") return {};
  return safeParse<TabsMap>(localStorage.getItem(TABS_KEY), {});
}

function writeTabs(map: TabsMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TABS_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("qe-hub.project-tabs-changed"));
}

export function getProjectTabs(projectId: string, fallback: ProjectTabId[]): ProjectTabId[] {
  const map = readTabs();
  return map[projectId] ?? fallback;
}

export function setProjectTabs(projectId: string, tabs: ProjectTabId[]) {
  const map = readTabs();
  map[projectId] = tabs;
  writeTabs(map);
}

// ---------- per-project tab notes (used by custom user projects to give tabs content) ----------

interface NotesMap {
  [projectId: string]: { [tab in ProjectTabId]?: string };
}

function readNotes(): NotesMap {
  if (typeof window === "undefined") return {};
  return safeParse<NotesMap>(localStorage.getItem(NOTES_KEY), {});
}

function writeNotes(map: NotesMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(map));
}

export function getProjectNote(projectId: string, tab: ProjectTabId): string {
  return readNotes()[projectId]?.[tab] ?? "";
}

export function setProjectNote(projectId: string, tab: ProjectTabId, content: string) {
  const map = readNotes();
  if (!map[projectId]) map[projectId] = {};
  map[projectId]![tab] = content;
  writeNotes(map);
}
