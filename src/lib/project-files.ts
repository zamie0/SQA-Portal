// localStorage-backed virtual file system, scoped per project.
// Provides Windows-Explorer-like folder and file management.

export type FsNodeKind = "folder" | "file";

export interface FsNode {
  id: string;
  parentId: string | null; // null => root
  name: string;
  kind: FsNodeKind;
  /** text content for files (small files only — demo). Empty for folders. */
  content: string;
  /** mime/extension hint for files */
  mime: string;
  /** size in bytes (computed from content for text files, or file.size for uploads) */
  size: number;
  createdAt: string;
  updatedAt: string;
  /** optional star/favorite */
  starred?: boolean;
}

const KEY_PREFIX = "qe-hub.project-files.v1.";
const EVENT = "qe-hub.project-files-changed";

function key(projectId: string) {
  return `${KEY_PREFIX}${projectId}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listNodes(projectId: string): FsNode[] {
  if (typeof window === "undefined") return [];
  return safeParse<FsNode[]>(localStorage.getItem(key(projectId)), []);
}

function writeNodes(projectId: string, nodes: FsNode[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(projectId), JSON.stringify(nodes));
  window.dispatchEvent(new Event(EVENT));
}

export const FILES_EVENT = EVENT;

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function now() {
  return new Date().toISOString();
}

function ensureUniqueName(siblings: FsNode[], desired: string): string {
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;
  const dot = desired.lastIndexOf(".");
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : "";
  let i = 2;
  while (taken.has(`${base} (${i})${ext}`.toLowerCase())) i++;
  return `${base} (${i})${ext}`;
}

export function getChildren(projectId: string, parentId: string | null): FsNode[] {
  return listNodes(projectId)
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function getNode(projectId: string, id: string): FsNode | undefined {
  return listNodes(projectId).find((n) => n.id === id);
}

export function getPath(projectId: string, id: string | null): FsNode[] {
  if (!id) return [];
  const all = listNodes(projectId);
  const map = new Map(all.map((n) => [n.id, n] as const));
  const trail: FsNode[] = [];
  let cur = map.get(id);
  while (cur) {
    trail.unshift(cur);
    cur = cur.parentId ? map.get(cur.parentId) : undefined;
  }
  return trail;
}

export function createFolder(projectId: string, parentId: string | null, name: string): FsNode {
  const all = listNodes(projectId);
  const siblings = all.filter((n) => n.parentId === parentId);
  const finalName = ensureUniqueName(siblings, name.trim() || "New folder");
  const node: FsNode = {
    id: uid("fld"),
    parentId,
    name: finalName,
    kind: "folder",
    content: "",
    mime: "",
    size: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  writeNodes(projectId, [...all, node]);
  return node;
}

export function createFile(
  projectId: string,
  parentId: string | null,
  name: string,
  content = "",
  mime = "text/plain",
): FsNode {
  const all = listNodes(projectId);
  const siblings = all.filter((n) => n.parentId === parentId);
  const finalName = ensureUniqueName(siblings, name.trim() || "Untitled.txt");
  const node: FsNode = {
    id: uid("fil"),
    parentId,
    name: finalName,
    kind: "file",
    content,
    mime,
    size: new Blob([content]).size,
    createdAt: now(),
    updatedAt: now(),
  };
  writeNodes(projectId, [...all, node]);
  return node;
}

export function updateFile(
  projectId: string,
  id: string,
  patch: Partial<Pick<FsNode, "content" | "name" | "starred">>,
) {
  const all = listNodes(projectId);
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const cur = all[idx];
  let nextName = cur.name;
  if (patch.name && patch.name.trim() && patch.name !== cur.name) {
    const siblings = all.filter((n) => n.parentId === cur.parentId && n.id !== cur.id);
    nextName = ensureUniqueName(siblings, patch.name.trim());
  }
  const nextContent = patch.content !== undefined ? patch.content : cur.content;
  all[idx] = {
    ...cur,
    name: nextName,
    content: nextContent,
    starred: patch.starred ?? cur.starred,
    size: cur.kind === "file" ? new Blob([nextContent]).size : 0,
    updatedAt: now(),
  };
  writeNodes(projectId, all);
}

/** Recursively delete a node and all its descendants. */
export function deleteNode(projectId: string, id: string) {
  const all = listNodes(projectId);
  const toDelete = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    toDelete.add(cur);
    for (const n of all) if (n.parentId === cur) queue.push(n.id);
  }
  writeNodes(
    projectId,
    all.filter((n) => !toDelete.has(n.id)),
  );
}

/** Move a node to a new parent. Prevents moving a folder into itself or its descendants. */
export function moveNode(projectId: string, id: string, newParentId: string | null): boolean {
  const all = listNodes(projectId);
  const node = all.find((n) => n.id === id);
  if (!node) return false;
  if (id === newParentId) return false;
  // ensure newParentId is not a descendant of node
  if (newParentId) {
    const map = new Map(all.map((n) => [n.id, n] as const));
    let cur: FsNode | undefined = map.get(newParentId);
    while (cur) {
      if (cur.id === id) return false;
      cur = cur.parentId ? map.get(cur.parentId) : undefined;
    }
  }
  const siblings = all.filter((n) => n.parentId === newParentId && n.id !== id);
  const finalName = ensureUniqueName(siblings, node.name);
  const idx = all.findIndex((n) => n.id === id);
  all[idx] = { ...node, parentId: newParentId, name: finalName, updatedAt: now() };
  writeNodes(projectId, all);
  return true;
}

/** Duplicate a node (and descendants if folder). */
export function duplicateNode(projectId: string, id: string) {
  const all = listNodes(projectId);
  const root = all.find((n) => n.id === id);
  if (!root) return;

  const clones: FsNode[] = [];
  function cloneRecursive(node: FsNode, parentId: string | null, asName?: string) {
    const siblings = [...all, ...clones].filter((n) => n.parentId === parentId);
    const name = ensureUniqueName(siblings, asName ?? `${node.name}`);
    const newId = uid(node.kind === "folder" ? "fld" : "fil");
    const clone: FsNode = {
      ...node,
      id: newId,
      parentId,
      name,
      createdAt: now(),
      updatedAt: now(),
    };
    clones.push(clone);
    if (node.kind === "folder") {
      const children = all.filter((n) => n.parentId === node.id);
      for (const c of children) cloneRecursive(c, newId);
    }
  }
  cloneRecursive(root, root.parentId, `${root.name} (copy)`);
  writeNodes(projectId, [...all, ...clones]);
}

export function statsFor(
  projectId: string,
  id: string | null,
): { folders: number; files: number; size: number } {
  const all = listNodes(projectId);
  const ids = new Set<string>();
  if (id === null) {
    for (const n of all) ids.add(n.id);
  } else {
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      ids.add(cur);
      for (const n of all) if (n.parentId === cur) queue.push(n.id);
    }
    ids.delete(id); // exclude the folder itself from counts
  }
  let folders = 0;
  let files = 0;
  let size = 0;
  for (const n of all) {
    if (!ids.has(n.id)) continue;
    if (n.kind === "folder") folders++;
    else {
      files++;
      size += n.size;
    }
  }
  return { folders, files, size };
}

export function searchAll(projectId: string, q: string): FsNode[] {
  if (!q.trim()) return [];
  const needle = q.trim().toLowerCase();
  return listNodes(projectId).filter((n) => n.name.toLowerCase().includes(needle));
}
