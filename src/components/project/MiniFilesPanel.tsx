import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Folder,
  FolderPlus,
  Upload,
  FolderUp,
  Plus,
  ChevronRight,
  FileText,
  FileCode2,
  FileImage,
  FileArchive,
  File as FileIcon,
  Trash2,
  ExternalLink,
  Home,
  Pencil,
  Copy,
  Move,
  Save,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  type FsNode,
  FILES_EVENT,
  createFile,
  createFolder,
  deleteNode,
  duplicateNode,
  getChildren,
  getNode,
  getPath,
  listNodes,
  moveNode,
  updateFile,
} from "@/lib/project-files";
import { useEventTick } from "@/lib/use-storage";

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

function iconFor(node: FsNode) {
  if (node.kind === "folder") return Folder;
  const e = extOf(node.name);
  if (["js", "ts", "tsx", "jsx", "py", "robot", "sh", "java"].includes(e)) return FileCode2;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e)) return FileImage;
  if (["zip", "apk", "ipa", "tar", "gz"].includes(e)) return FileArchive;
  if (["txt", "md", "json", "yml", "yaml", "html", "css"].includes(e)) return FileText;
  return FileIcon;
}

function colorFor(node: FsNode): string {
  if (node.kind === "folder") return "text-amber-500";
  const e = extOf(node.name);
  if (["js", "ts", "tsx", "py", "robot"].includes(e)) return "text-violet-500";
  if (["png", "jpg", "svg"].includes(e)) return "text-pink-500";
  if (["zip", "apk", "ipa"].includes(e)) return "text-orange-500";
  return "text-slate-500";
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Compact files browser embedded in other tabs (Mobile, Web).
 * Split layout: list on the left, file preview/editor on the right when a file is clicked.
 * Supports full file ops: upload (file+folder), create folder, rename, duplicate, move, delete.
 */
export function MiniFilesPanel({
  projectId,
  title = "Files",
  accept,
  rootFolderName,
}: {
  projectId: string;
  title?: string;
  accept?: string;
  rootFolderName?: string;
}) {
  useEventTick(FILES_EVENT);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [cwd, setCwd] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingNode, setMovingNode] = useState<FsNode | null>(null);

  // Initialize root folder if scoped
  const scopedRoot = useMemo(() => {
    if (!rootFolderName) return null;
    const existing = getChildren(projectId, null).find(
      (n) => n.kind === "folder" && n.name.toLowerCase() === rootFolderName.toLowerCase(),
    );
    if (existing) return existing.id;
    const created = createFolder(projectId, null, rootFolderName);
    return created.id;
  }, [projectId, rootFolderName]);

  const effectiveCwd = cwd ?? scopedRoot;
  const items = getChildren(projectId, effectiveCwd);
  const trail = getPath(projectId, effectiveCwd);
  const visibleTrail = scopedRoot
    ? trail.slice(trail.findIndex((n) => n.id === scopedRoot))
    : trail;

  const selectedFile = selectedFileId ? getNode(projectId, selectedFileId) : undefined;

  function uploadFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => uploadOne(f, effectiveCwd, getRelativePath(f)));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  function getRelativePath(f: File): string[] {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (!rel) return [];
    const parts = rel.split("/");
    parts.pop();
    return parts;
  }

  function uploadOne(file: File, parentId: string | null, segments: string[]) {
    let parent = parentId;
    for (const seg of segments) {
      const siblings = getChildren(projectId, parent);
      const existing = siblings.find((n) => n.kind === "folder" && n.name === seg);
      parent = existing ? existing.id : createFolder(projectId, parent, seg).id;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      createFile(projectId, parent, file.name, content, file.type || "text/plain");
    };
    reader.onerror = () => {
      createFile(
        projectId,
        parent,
        file.name,
        `[binary file — ${formatBytes(file.size)}]`,
        file.type || "application/octet-stream",
      );
    };
    reader.readAsText(file);
  }

  function handleCreateFolder() {
    const name = newFolderName.trim() || "New folder";
    createFolder(projectId, effectiveCwd, name);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  function startRename(node: FsNode) {
    setRenamingId(node.id);
    setRenameValue(node.name);
  }
  function commitRename() {
    if (renamingId && renameValue.trim()) {
      updateFile(projectId, renamingId, { name: renameValue.trim() });
    }
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <div className="rounded-2xl bg-white/60 border border-white/70 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/60 bg-white/40">
        <h4 className="text-sm font-semibold inline-flex items-center gap-2">
          <Folder className="h-4 w-4 text-amber-500" /> {title}
        </h4>
        <Link
          href={`/projects/${projectId}`}
          className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline"
        >
          Open Files <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-white/40">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[image:var(--gradient-primary)] text-white font-medium"
        >
          <Upload className="h-3 w-3" /> File
        </button>
        <button
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-white/70 font-medium"
        >
          <FolderUp className="h-3 w-3" /> Folder
        </button>
        <button
          onClick={() => setShowNewFolder(true)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-white/70 font-medium"
        >
          <FolderPlus className="h-3 w-3" /> New
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error -- non-standard but supported
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-3 py-1.5 text-xs border-b border-white/40 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => {
            setCwd(scopedRoot ?? null);
            setSelectedFileId(null);
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/70"
        >
          <Home className="h-3 w-3" />
          <span>{rootFolderName ?? "Root"}</span>
        </button>
        {visibleTrail.slice(scopedRoot ? 1 : 0).map((n) => (
          <span key={n.id} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button
              onClick={() => {
                setCwd(n.id);
                setSelectedFileId(null);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-white/70"
            >
              {n.name}
            </button>
          </span>
        ))}
      </div>

      {/* Split pane */}
      <div className={`grid ${selectedFile ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {/* List */}
        <ul className="max-h-80 overflow-auto divide-y divide-white/40 border-r border-white/40">
          {items.length === 0 && (
            <li className="text-center py-6 text-xs text-muted-foreground">
              Empty — upload a file or folder
            </li>
          )}
          {items.map((node) => {
            const Icon = iconFor(node);
            const isSelected = node.id === selectedFileId;
            return (
              <li
                key={node.id}
                className={`flex items-center gap-2 px-3 py-1.5 group ${
                  isSelected ? "bg-primary/10" : "hover:bg-white/60"
                }`}
              >
                <button
                  onClick={() => {
                    if (node.kind === "folder") {
                      setCwd(node.id);
                      setSelectedFileId(null);
                    } else {
                      setSelectedFileId(node.id);
                    }
                  }}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${colorFor(node)}`} />
                  {renamingId === node.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-1 py-0.5 rounded bg-white border border-primary text-xs flex-1 min-w-0"
                    />
                  ) : (
                    <span className="truncate text-sm">{node.name}</span>
                  )}
                </button>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {node.kind === "folder" ? "—" : formatBytes(node.size)}
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <IconBtn title="Rename" onClick={() => startRename(node)}>
                    <Pencil className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn title="Duplicate" onClick={() => duplicateNode(projectId, node.id)}>
                    <Copy className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn title="Move to..." onClick={() => setMovingNode(node)}>
                    <Move className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn
                    title="Delete"
                    danger
                    onClick={() => {
                      if (confirm(`Delete "${node.name}"?`)) {
                        deleteNode(projectId, node.id);
                        if (selectedFileId === node.id) setSelectedFileId(null);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Preview pane */}
        {selectedFile && (
          <FilePreviewPane
            key={selectedFile.id}
            projectId={projectId}
            node={selectedFile}
            onClose={() => setSelectedFileId(null)}
          />
        )}
      </div>

      {showNewFolder && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setShowNewFolder(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h3 className="font-semibold mb-3 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> New folder
            </h3>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              placeholder="Folder name"
              className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNewFolder(false)}
                className="px-3 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {movingNode && (
        <MoveDialog
          projectId={projectId}
          node={movingNode}
          onClose={() => setMovingNode(null)}
          onMove={(targetId) => {
            moveNode(projectId, movingNode.id, targetId);
            setMovingNode(null);
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-6 w-6 grid place-items-center rounded text-muted-foreground hover:bg-white ${
        danger ? "hover:text-destructive" : "hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FilePreviewPane({
  projectId,
  node,
  onClose,
}: {
  projectId: string;
  node: FsNode;
  onClose: () => void;
}) {
  const [content, setContent] = useState(node.content);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent(node.content);
  }, [node.id, node.content]);

  function save() {
    updateFile(projectId, node.id, { content });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  const Icon = iconFor(node);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extOf(node.name));

  return (
    <div className="flex flex-col max-h-80 bg-white/40">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/60 bg-white/60">
        <button
          onClick={onClose}
          className="md:hidden h-6 w-6 grid place-items-center rounded hover:bg-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <Icon className={`h-4 w-4 ${colorFor(node)}`} />
        <span className="text-xs font-semibold truncate flex-1">{node.name}</span>
        <button
          onClick={save}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-foreground text-background text-[10px] font-medium"
        >
          {saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
          {saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={onClose}
          className="h-6 w-6 grid place-items-center rounded hover:bg-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {isImage && node.content.startsWith("data:") ? (
        <div className="flex-1 overflow-auto p-3 grid place-items-center">
          <img src={node.content} alt={node.name} className="max-w-full max-h-64" />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full px-3 py-2 font-mono text-[11px] outline-none resize-none bg-transparent"
          placeholder="Empty file — start typing..."
        />
      )}
      <div className="px-3 py-1 border-t border-white/60 text-[10px] text-muted-foreground flex justify-between">
        <span>{content.length.toLocaleString()} chars</span>
        <span>{formatBytes(new Blob([content]).size)}</span>
      </div>
    </div>
  );
}

function MoveDialog({
  projectId,
  node,
  onClose,
  onMove,
}: {
  projectId: string;
  node: FsNode;
  onClose: () => void;
  onMove: (targetId: string | null) => void;
}) {
  const all = listNodes(projectId);
  const blocked = new Set<string>([node.id]);
  const queue = [node.id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of all)
      if (n.parentId === cur) {
        blocked.add(n.id);
        queue.push(n.id);
      }
  }

  function FolderRow({ id, depth }: { id: string | null; depth: number }) {
    const folders = getChildren(projectId, id).filter((n) => n.kind === "folder");
    return (
      <>
        {folders.map((f) => {
          const disabled = blocked.has(f.id) || f.id === node.parentId;
          return (
            <div key={f.id}>
              <button
                disabled={disabled}
                onClick={() => onMove(f.id)}
                style={{ paddingLeft: 12 + depth * 16 }}
                className={`w-full text-left flex items-center gap-2 py-1.5 pr-3 text-sm rounded-md ${
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
                }`}
              >
                <Folder className="h-4 w-4 text-amber-500" />
                <span className="truncate">{f.name}</span>
              </button>
              <FolderRow id={f.id} depth={depth + 1} />
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm truncate">Move "{node.name}" to...</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
          <button
            disabled={node.parentId === null}
            onClick={() => onMove(null)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
              node.parentId === null ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
            }`}
          >
            <Home className="h-4 w-4" /> Root
          </button>
          <FolderRow id={null} depth={0} />
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
