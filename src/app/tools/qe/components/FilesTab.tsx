import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode2,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  File as FileIcon,
  Plus,
  FolderPlus,
  FolderUp,
  Upload,
  Download,
  Trash2,
  Pencil,
  Copy,
  Move,
  Star,
  StarOff,
  ChevronRight,
  Home,
  Search,
  LayoutGrid,
  List as ListIcon,
  ArrowLeft,
  X,
  Save,
  Check,
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
  searchAll,
  statsFor,
  updateFile,
} from "@/shared/lib/project-files";
import { useEventTick } from "@/shared/lib/use-storage";

interface Props {
  projectId: string;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

function iconFor(node: FsNode) {
  if (node.kind === "folder") return Folder;
  const e = extOf(node.name);
  if (
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "py",
      "rb",
      "go",
      "java",
      "cs",
      "cpp",
      "c",
      "rs",
      "robot",
      "sh",
    ].includes(e)
  )
    return FileCode2;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(e)) return FileImage;
  if (["zip", "rar", "7z", "tar", "gz", "apk", "ipa"].includes(e)) return FileArchive;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(e)) return FileVideo;
  if (["mp3", "wav", "m4a", "ogg"].includes(e)) return FileAudio;
  if (["csv", "xlsx", "xls"].includes(e)) return FileSpreadsheet;
  if (["txt", "md", "json", "xml", "yml", "yaml", "html", "css"].includes(e)) return FileText;
  return FileIcon;
}

function colorFor(node: FsNode): string {
  if (node.kind === "folder") return "text-amber-500";
  const e = extOf(node.name);
  if (["js", "ts", "tsx", "jsx", "py", "robot"].includes(e)) return "text-violet-500";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e)) return "text-pink-500";
  if (["zip", "apk", "ipa"].includes(e)) return "text-orange-500";
  if (["mp4", "mp3"].includes(e)) return "text-rose-500";
  if (["csv", "xlsx"].includes(e)) return "text-emerald-500";
  return "text-slate-500";
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FilesTab({ projectId }: Props) {
  useEventTick(FILES_EVENT);
  const [cwd, setCwd] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [editing, setEditing] = useState<FsNode | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FsNode } | null>(
    null,
  );
  const [movingNode, setMovingNode] = useState<FsNode | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null | "ROOT">(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const allNodes = listNodes(projectId);
  const children = useMemo(() => getChildren(projectId, cwd), [projectId, cwd, allNodes.length]);
  const trail = useMemo(() => getPath(projectId, cwd), [projectId, cwd, allNodes.length]);
  const stats = statsFor(projectId, cwd);
  const searchResults = useMemo(
    () => searchAll(projectId, search),
    [projectId, search, allNodes.length],
  );
  const isSearching = search.trim().length > 0;
  const visibleItems = isSearching ? searchResults : children;

  // close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [contextMenu]);

  function navigate(id: string | null) {
    setSelected(null);
    setSearch("");
    setCwd(id);
    setHistory((h) => [...h, id]);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = h.slice(0, -1);
      setCwd(next[next.length - 1]);
      setSelected(null);
      return next;
    });
  }

  function openNode(node: FsNode) {
    if (node.kind === "folder") navigate(node.id);
    else setEditing(node);
  }

  function handleCreateFolder() {
    const name = newFolderName.trim() || "New folder";
    createFolder(projectId, cwd, name);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  function handleCreateFile() {
    const name = newFileName.trim() || "Untitled.txt";
    const e = extOf(name);
    const mime = e === "json" ? "application/json" : e === "md" ? "text/markdown" : "text/plain";
    const node = createFile(projectId, cwd, name, "", mime);
    setNewFileName("");
    setShowNewFile(false);
    setEditing(node);
  }

  function handleUpload(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => {
      // webkitRelativePath is set when the user picks a folder
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      const segments = rel ? rel.split("/").slice(0, -1) : [];
      let parent = cwd;
      for (const seg of segments) {
        const siblings = getChildren(projectId, parent);
        const existing = siblings.find((n) => n.kind === "folder" && n.name === seg);
        parent = existing ? existing.id : createFolder(projectId, parent, seg).id;
      }
      const targetParent = parent;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        createFile(projectId, targetParent, f.name, text, f.type || "text/plain");
      };
      reader.onerror = () => {
        createFile(
          projectId,
          targetParent,
          f.name,
          `[binary file — ${formatBytes(f.size)}]`,
          f.type || "application/octet-stream",
        );
      };
      reader.readAsText(f);
    });
  }

  function handleDownload(node: FsNode) {
    if (node.kind !== "file") return;
    const blob = new Blob([node.content], { type: node.mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = node.name;
    a.click();
    URL.revokeObjectURL(url);
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

  function handleDrop(e: React.DragEvent, targetId: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const id = e.dataTransfer.getData("text/fs-id");
    if (id && id !== targetId) {
      moveNode(projectId, id, targetId);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length) {
      // upload into target folder (or cwd if root drop)
      const original = cwd;
      if (targetId !== cwd) setCwd(targetId);
      handleUpload(e.dataTransfer.files);
      if (targetId !== cwd) setCwd(original);
    }
  }

  return (
    <div className="rounded-3xl glass overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/40 bg-white/30">
        <button
          onClick={goBack}
          disabled={history.length <= 1}
          className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/70 disabled:opacity-40"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate(null)}
          className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/70"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-white/60 mx-1" />

        <button
          onClick={() => setShowNewFolder(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/70 hover:bg-white text-sm font-medium"
        >
          <FolderPlus className="h-4 w-4" /> New folder
        </button>
        <button
          onClick={() => setShowNewFile(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/70 hover:bg-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New file
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow"
        >
          <Upload className="h-4 w-4" /> Upload files
        </button>
        <button
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/70 hover:bg-white text-sm font-medium"
          title="Upload an entire folder (preserves structure)"
        >
          <FolderUp className="h-4 w-4" /> Upload folder
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error -- non-standard but supported in Chromium/Safari/Firefox
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files);
            if (folderInputRef.current) folderInputRef.current.value = "";
          }}
        />

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="h-9 pl-8 pr-3 w-56 rounded-lg bg-white/70 border border-white/60 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex rounded-lg bg-white/70 p-0.5 border border-white/60">
          <button
            onClick={() => setView("grid")}
            className={`h-8 w-8 grid place-items-center rounded-md ${view === "grid" ? "bg-foreground text-background" : ""}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`h-8 w-8 grid place-items-center rounded-md ${view === "list" ? "bg-foreground text-background" : ""}`}
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-4 py-2 text-sm border-b border-white/40 bg-white/20 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => navigate(null)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId("ROOT");
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => handleDrop(e, null)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/60 ${
            dragOverId === "ROOT" ? "bg-primary/15 ring-1 ring-primary" : ""
          }`}
        >
          <Home className="h-3.5 w-3.5" /> {/* root */}
          <span>Project files</span>
        </button>
        {trail.map((n) => (
          <span key={n.id} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => navigate(n.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverId(n.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => handleDrop(e, n.id)}
              className={`px-2 py-1 rounded-md hover:bg-white/60 ${
                dragOverId === n.id ? "bg-primary/15 ring-1 ring-primary" : ""
              }`}
            >
              {n.name}
            </button>
          </span>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {stats.folders} folders · {stats.files} files · {formatBytes(stats.size)}
        </span>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] min-h-[420px]">
        {/* Sidebar tree */}
        <aside className="border-r border-white/40 p-3 bg-white/20 overflow-auto max-h-[600px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-2">
            Tree
          </p>
          <TreeNode
            projectId={projectId}
            parentId={null}
            depth={0}
            cwd={cwd}
            onNavigate={navigate}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
            handleDrop={handleDrop}
          />
          <div className="mt-4 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Storage
            </p>
            <p className="text-xs text-muted-foreground">
              {allNodes.filter((n) => n.kind === "file").length} files total
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(
                allNodes.filter((n) => n.kind === "file").reduce((s, n) => s + n.size, 0),
              )}{" "}
              used
            </p>
          </div>
        </aside>

        {/* Main area */}
        <main
          className={`p-4 ${dragOverId === "ROOT" && cwd === null ? "bg-primary/5" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId("ROOT");
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => handleDrop(e, cwd)}
        >
          {visibleItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-white/60 p-12 text-center">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-semibold">
                {isSearching ? "No matches" : "This folder is empty"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isSearching
                  ? `No files matching "${search}"`
                  : "Drop files here or use the toolbar to create something"}
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
              {visibleItems.map((node) => (
                <FsItemGrid
                  key={node.id}
                  node={node}
                  selected={selected === node.id}
                  renaming={renamingId === node.id}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  commitRename={commitRename}
                  onSelect={() => setSelected(node.id)}
                  onOpen={() => openNode(node)}
                  onContext={(e) => {
                    e.preventDefault();
                    setSelected(node.id);
                    setContextMenu({ x: e.clientX, y: e.clientY, node });
                  }}
                  dragOver={dragOverId === node.id}
                  setDragOverId={setDragOverId}
                  handleDrop={handleDrop}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium hidden md:table-cell">
                      Modified
                    </th>
                    <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Type</th>
                    <th className="text-right px-3 py-2 font-medium">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((node) => {
                    const Icon = iconFor(node);
                    return (
                      <tr
                        key={node.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/fs-id", node.id)}
                        onDragOver={(e) => {
                          if (node.kind === "folder") {
                            e.preventDefault();
                            setDragOverId(node.id);
                          }
                        }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(e) => node.kind === "folder" && handleDrop(e, node.id)}
                        onClick={() => setSelected(node.id)}
                        onDoubleClick={() => openNode(node)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelected(node.id);
                          setContextMenu({ x: e.clientX, y: e.clientY, node });
                        }}
                        className={`border-t border-white/40 cursor-pointer hover:bg-white/40 ${
                          selected === node.id ? "bg-primary/10" : ""
                        } ${dragOverId === node.id ? "bg-primary/15" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <div className="inline-flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colorFor(node)}`} />
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
                                className="px-1.5 py-0.5 rounded bg-white border border-primary text-sm"
                              />
                            ) : (
                              <span className="font-medium">{node.name}</span>
                            )}
                            {node.starred && (
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                          {formatDate(node.updatedAt)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                          {node.kind === "folder"
                            ? "Folder"
                            : extOf(node.name).toUpperCase() || "File"}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {node.kind === "folder" ? "—" : formatBytes(node.size)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* New folder dialog */}
      {showNewFolder && (
        <Modal title="New folder" onClose={() => setShowNewFolder(false)}>
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
        </Modal>
      )}

      {/* New file dialog */}
      {showNewFile && (
        <Modal title="New file" onClose={() => setShowNewFile(false)}>
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
            placeholder="filename.txt"
            className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tip: include an extension like .md, .json, .robot, .py
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowNewFile(false)} className="px-3 py-2 rounded-lg text-sm">
              Cancel
            </button>
            <button
              onClick={handleCreateFile}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onOpen={() => openNode(contextMenu.node)}
          onRename={() => startRename(contextMenu.node)}
          onDuplicate={() => duplicateNode(projectId, contextMenu.node.id)}
          onMove={() => setMovingNode(contextMenu.node)}
          onDelete={() => {
            if (confirm(`Delete "${contextMenu.node.name}"? This cannot be undone.`)) {
              deleteNode(projectId, contextMenu.node.id);
              if (selected === contextMenu.node.id) setSelected(null);
            }
          }}
          onStar={() =>
            updateFile(projectId, contextMenu.node.id, { starred: !contextMenu.node.starred })
          }
          onDownload={() => handleDownload(contextMenu.node)}
        />
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

      {/* File editor */}
      {editing && (
        <FileEditor node={editing} projectId={projectId} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function FsItemGrid({
  node,
  selected,
  renaming,
  renameValue,
  setRenameValue,
  commitRename,
  onSelect,
  onOpen,
  onContext,
  dragOver,
  setDragOverId,
  handleDrop,
}: {
  node: FsNode;
  selected: boolean;
  renaming: boolean;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  onSelect: () => void;
  onOpen: () => void;
  onContext: (e: React.MouseEvent) => void;
  dragOver: boolean;
  setDragOverId: (id: string | null | "ROOT") => void;
  handleDrop: (e: React.DragEvent, targetId: string | null) => void;
}) {
  const Icon = iconFor(node);
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/fs-id", node.id)}
      onDragOver={(e) => {
        if (node.kind === "folder") {
          e.preventDefault();
          setDragOverId(node.id);
        }
      }}
      onDragLeave={() => setDragOverId(null)}
      onDrop={(e) => node.kind === "folder" && handleDrop(e, node.id)}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContext}
      className={`group flex flex-col items-center p-3 rounded-xl border text-center transition relative ${
        selected ? "border-primary bg-primary/10" : "border-transparent hover:bg-white/60"
      } ${dragOver ? "border-primary bg-primary/15 ring-1 ring-primary" : ""}`}
    >
      <div className="relative">
        <Icon className={`h-12 w-12 ${colorFor(node)}`} strokeWidth={1.5} />
        {node.starred && (
          <Star className="absolute -top-1 -right-1 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        )}
      </div>
      {renaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 w-full px-1 py-0.5 rounded bg-white border border-primary text-xs text-center"
        />
      ) : (
        <span className="mt-2 text-xs font-medium line-clamp-2 break-all">{node.name}</span>
      )}
      {node.kind === "file" && (
        <span className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(node.size)}</span>
      )}
    </button>
  );
}

function TreeNode({
  projectId,
  parentId,
  depth,
  cwd,
  onNavigate,
  dragOverId,
  setDragOverId,
  handleDrop,
}: {
  projectId: string;
  parentId: string | null;
  depth: number;
  cwd: string | null;
  onNavigate: (id: string | null) => void;
  dragOverId: string | null | "ROOT";
  setDragOverId: (id: string | null | "ROOT") => void;
  handleDrop: (e: React.DragEvent, targetId: string | null) => void;
}) {
  const folders = getChildren(projectId, parentId).filter((n) => n.kind === "folder");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (depth === 0) {
    return (
      <div>
        <button
          onClick={() => onNavigate(null)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId("ROOT");
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => handleDrop(e, null)}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium ${
            cwd === null ? "bg-primary/15 text-primary" : "hover:bg-white/60"
          } ${dragOverId === "ROOT" ? "ring-1 ring-primary" : ""}`}
        >
          <Home className="h-3.5 w-3.5" /> Root
        </button>
        <div className="ml-2">
          {folders.map((f) => (
            <TreeFolder
              key={f.id}
              projectId={projectId}
              folder={f}
              cwd={cwd}
              onNavigate={onNavigate}
              expanded={expanded}
              setExpanded={setExpanded}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              handleDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function TreeFolder({
  projectId,
  folder,
  cwd,
  onNavigate,
  expanded,
  setExpanded,
  dragOverId,
  setDragOverId,
  handleDrop,
}: {
  projectId: string;
  folder: FsNode;
  cwd: string | null;
  onNavigate: (id: string | null) => void;
  expanded: Set<string>;
  setExpanded: (s: Set<string>) => void;
  dragOverId: string | null | "ROOT";
  setDragOverId: (id: string | null | "ROOT") => void;
  handleDrop: (e: React.DragEvent, targetId: string | null) => void;
}) {
  const isOpen = expanded.has(folder.id);
  const subfolders = getChildren(projectId, folder.id).filter((n) => n.kind === "folder");
  const Icon = isOpen ? FolderOpen : Folder;
  return (
    <div>
      <div
        className={`flex items-center gap-0.5 rounded-md ${
          cwd === folder.id ? "bg-primary/15 text-primary" : "hover:bg-white/60"
        } ${dragOverId === folder.id ? "ring-1 ring-primary bg-primary/10" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverId(folder.id);
        }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => handleDrop(e, folder.id)}
      >
        <button
          onClick={() => {
            const next = new Set(expanded);
            if (next.has(folder.id)) next.delete(folder.id);
            else next.add(folder.id);
            setExpanded(next);
          }}
          className="h-6 w-5 grid place-items-center"
        >
          {subfolders.length > 0 && (
            <ChevronRight className={`h-3 w-3 transition ${isOpen ? "rotate-90" : ""}`} />
          )}
        </button>
        <button
          onClick={() => onNavigate(folder.id)}
          className="flex-1 inline-flex items-center gap-1.5 px-1 py-1 text-sm text-left truncate"
        >
          <Icon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </button>
      </div>
      {isOpen && subfolders.length > 0 && (
        <div className="ml-3 pl-1 border-l border-white/60">
          {subfolders.map((sf) => (
            <TreeFolder
              key={sf.id}
              projectId={projectId}
              folder={sf}
              cwd={cwd}
              onNavigate={onNavigate}
              expanded={expanded}
              setExpanded={setExpanded}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              handleDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContextMenu({
  x,
  y,
  node,
  onClose,
  onOpen,
  onRename,
  onDuplicate,
  onMove,
  onDelete,
  onStar,
  onDownload,
}: {
  x: number;
  y: number;
  node: FsNode;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onStar: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-52 rounded-xl bg-white shadow-2xl border border-border py-1.5 text-sm"
    >
      <MenuItem
        icon={node.kind === "folder" ? FolderOpen : FileText}
        label="Open"
        onClick={() => {
          onOpen();
          onClose();
        }}
      />
      <MenuItem
        icon={Pencil}
        label="Rename"
        onClick={() => {
          onRename();
          onClose();
        }}
      />
      <MenuItem
        icon={Copy}
        label="Duplicate"
        onClick={() => {
          onDuplicate();
          onClose();
        }}
      />
      <MenuItem
        icon={Move}
        label="Move to..."
        onClick={() => {
          onMove();
          onClose();
        }}
      />
      <MenuItem
        icon={node.starred ? StarOff : Star}
        label={node.starred ? "Unstar" : "Star"}
        onClick={() => {
          onStar();
          onClose();
        }}
      />
      {node.kind === "file" && (
        <MenuItem
          icon={Download}
          label="Download"
          onClick={() => {
            onDownload();
            onClose();
          }}
        />
      )}
      <div className="my-1 border-t border-border" />
      <MenuItem
        icon={Trash2}
        label="Delete"
        onClick={() => {
          onDelete();
          onClose();
        }}
        danger
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted ${
        danger ? "text-destructive" : ""
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FileEditor({
  node,
  projectId,
  onClose,
}: {
  node: FsNode;
  projectId: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState(node.content);
  const [name, setName] = useState(node.name);
  const [saved, setSaved] = useState(false);

  // refresh local state if node changes
  useEffect(() => {
    const fresh = getNode(projectId, node.id);
    if (fresh) {
      setContent(fresh.content);
      setName(fresh.name);
    }
  }, [node.id, projectId]);

  function save() {
    updateFile(projectId, node.id, { content, name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  const Icon = iconFor(node);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[80vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <Icon className={`h-5 w-5 ${colorFor(node)}`} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold outline-none"
          />
          <button
            onClick={save}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-foreground text-background text-xs font-medium"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full px-4 py-3 font-mono text-sm outline-none resize-none"
          placeholder="Empty file — start typing..."
        />
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between bg-muted/30">
          <span>
            {content.length.toLocaleString()} chars · {formatBytes(new Blob([content]).size)}
          </span>
          <span>Modified {formatDate(node.updatedAt)}</span>
        </div>
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
  // collect descendant ids of node so we can disable them as targets
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
    <Modal title={`Move "${node.name}" to...`} onClose={onClose}>
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
    </Modal>
  );
}
