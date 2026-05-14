import {
  Activity,
  Boxes,
  Check,
  ClipboardCheck,
  ClipboardList,
  Database,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  LifeBuoy,
  Phone,
  Plus,
  Save,
  Search,
  ChevronDown,
  Shield,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { AdminOverview, AdminRecord } from "./adminOverviewData";
import { useAdminConfirm } from "./useAdminConfirm";

export type AdminMutate = (payload: Record<string, unknown>) => Promise<void>;

function formatDate(value: unknown) {
  if (!value) return "Not set";
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function roleLabel(value: unknown) {
  return String(value ?? "member").replace(/_/g, " ");
}

function findName(records: AdminRecord[], id: unknown, fallback: string) {
  const match = records.find((record) => record.id === id);
  return String(match?.name ?? match?.fullName ?? match?.username ?? fallback);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-5 text-sm text-muted-foreground">
      No {label} found yet.
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2 text-sm font-semibold text-foreground">
      <span>{label}</span>
      {children}
    </div>
  );
}

function inputClass(extra = "") {
  return `min-h-10 w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 ${extra}`.trim();
}

type AdminSelectOption = {
  value: string;
  label: string;
};

function AdminSelect({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void | Promise<void>;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={[
          inputClass(
            compact
              ? "min-h-9 py-1.5 pr-8 text-left"
              : "flex items-center justify-between gap-2 pr-9 text-left",
          ),
          "relative",
        ].join(" ")}
      >
        <span className="block truncate">{selected?.label ?? "Select"}</span>
        <ChevronDown
          className={[
            "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open ? "rotate-180 text-primary" : "",
          ].join(" ")}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/80 bg-white p-1 shadow-2xl">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  void onChange(option.value);
                }}
                className={[
                  "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition",
                  active
                    ? "bg-[image:var(--gradient-primary)] text-white shadow-sm"
                    : "text-foreground hover:bg-primary/10 hover:text-primary",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; icon: typeof Layers }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 bg-white/70 text-muted-foreground hover:bg-white hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function uniqueValues(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value ?? "")).filter(Boolean))).sort();
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
    >
      {children}
    </button>
  );
}

export function RolesView({ data, onMutate }: { data: AdminOverview; onMutate: AdminMutate }) {
  const confirm = useAdminConfirm();
  const [pending, setPending] = useState<Record<string, string[]>>({});

  function selectedPermissions(roleId: string, original: string[]) {
    return pending[roleId] ?? original;
  }

  function togglePermission(roleId: string, original: string[], permissionId: string) {
    const selected = selectedPermissions(roleId, original);
    const next = selected.includes(permissionId)
      ? selected.filter((id) => id !== permissionId)
      : [...selected, permissionId];
    setPending((current) => ({ ...current, [roleId]: next }));
  }

  async function save(roleId: string, permissions: string[]) {
    if (
      !(await confirm({
        title: "Save permissions",
        message: `Save permission changes for ${roleId}?`,
        confirmLabel: "Save",
      }))
    )
      return;
    await onMutate({ action: "updateRolePermissions", roleId, permissions });
    setPending((current) => {
      const next = { ...current };
      delete next[roleId];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Shield} label="Roles" value={data.roles.length} />
        <StatCard icon={KeyRound} label="Permissions" value={data.permissions.length} />
        <StatCard icon={Users} label="Users" value={data.users.length} />
      </div>
      {data.roles.length === 0 ? (
        <EmptyState label="roles" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.roles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {role.name ?? role.id}
                    {role.id === "admin" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Protected
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {role.id === "admin"
                      ? "Full system access is locked to avoid breaking admin recovery."
                      : (role.description ?? "No description")}
                  </div>
                </div>
                <ActionButton
                  onClick={() =>
                    save(role.id, selectedPermissions(role.id, role.permissions ?? []))
                  }
                  disabled={role.id === "admin" || !pending[role.id]}
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </ActionButton>
              </div>
              <div className="mt-4 grid gap-2">
                {data.permissions.map((permission) => {
                  const selected = selectedPermissions(role.id, role.permissions ?? []).includes(
                    permission.id,
                  );
                  return (
                    <label
                      key={permission.id}
                      className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/60 p-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={role.id === "admin"}
                        onChange={() =>
                          togglePermission(role.id, role.permissions ?? [], permission.id)
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block font-semibold text-foreground">
                          {permission.name ?? permission.id}
                        </span>
                        <span className="text-muted-foreground">
                          {permission.description ?? "No description"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PermissionsView({ data }: { data: AdminOverview }) {
  return data.permissions.length === 0 ? (
    <EmptyState label="permissions" />
  ) : (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">Permission catalog</div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Read only
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Permissions define what roles can do. Edit assignments from the Roles section.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.permissions.map((permission) => (
          <div key={permission.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
            <div className="text-sm font-semibold">{permission.name ?? permission.id}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {permission.description ?? "No description"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectsAdminView({
  data,
  onMutate,
}: {
  data: AdminOverview;
  onMutate: AdminMutate;
}) {
  const confirm = useAdminConfirm();
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "general",
    link: "",
    status: "active",
  });

  async function saveProject() {
    await onMutate({ action: "createProject", ...form });
    setForm({ name: "", description: "", type: "general", link: "", status: "active" });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={Layers} label="Projects" value={data.projects.length} />
        <StatCard icon={Users} label="Members" value={data.projectMembers.length} />
        <StatCard icon={Wrench} label="Tools enabled" value={data.projectTools.length} />
        <StatCard icon={ClipboardCheck} label="Audit logs" value={data.auditLogs.length} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 border-b border-border/70 pb-3">
          <div className="text-sm font-semibold">Create project</div>
          <div className="text-xs text-muted-foreground">
            Add a project shell before assigning members and tools.
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className={inputClass()}
              />
            </Field>
            <Field label="Type">
              <input
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
                className={inputClass()}
              />
            </Field>
            <Field label="Status">
              <AdminSelect
                value={form.status}
                onChange={(status) => setForm((current) => ({ ...current, status }))}
                options={[
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                  { value: "paused", label: "Paused" },
                ]}
              />
            </Field>
            <Field label="Link">
              <input
                value={form.link}
                onChange={(event) =>
                  setForm((current) => ({ ...current, link: event.target.value }))
                }
                className={inputClass()}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className={inputClass("min-h-24 resize-y")}
              rows={3}
            />
          </Field>
          <div className="flex justify-end border-t border-border/70 pt-4">
            <ActionButton onClick={saveProject} disabled={!form.name.trim()}>
              <Plus className="h-3.5 w-3.5" /> Create project
            </ActionButton>
          </div>
        </div>
      </div>
      {data.projects.length === 0 ? (
        <EmptyState label="projects" />
      ) : (
        <div className="space-y-3">
          {data.projects.map((project) => {
            const members = data.projectMembers.filter((member) => member.projectId === project.id);
            const leader = members.find((member) => member.role === "project_leader");
            const toolCount = data.projectTools.filter(
              (tool) => tool.projectId === project.id,
            ).length;
            const leaderName = leader
              ? findName(data.users, leader.userId, "Unknown leader")
              : "No leader assigned";
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-base font-semibold">
                      {project.name ?? "Untitled project"}
                    </div>
                    <div className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {project.description ?? "No description"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                      {project.status ?? "active"}
                    </span>
                    <DangerButton
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: "Delete project",
                            message: `Delete ${project.name ?? "this project"}?`,
                            confirmLabel: "Delete",
                            tone: "danger",
                          }))
                        )
                          return;
                        void onMutate({ action: "deleteProject", id: project.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DangerButton>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Type
                    </div>
                    <div>{project.type ?? "Not set"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Leader
                    </div>
                    <div>{leaderName}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Members
                    </div>
                    <div>{members.length}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Enabled tools
                    </div>
                    <div>{toolCount}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProjectMembersView({
  data,
  onMutate,
}: {
  data: AdminOverview;
  onMutate: AdminMutate;
}) {
  const confirm = useAdminConfirm();
  const [form, setForm] = useState({
    projectId: data.projects[0]?.id ?? "",
    userId: data.users[0]?.id ?? "",
    role: "member",
  });

  async function assignMember() {
    const projectName = findName(data.projects, form.projectId, "this project");
    const userName = findName(data.users, form.userId, "this user");
    if (
      !(await confirm({
        title: "Assign project member",
        message: `Assign ${userName} as ${roleLabel(form.role)} in ${projectName}?`,
        confirmLabel: "Assign",
      }))
    )
      return;
    await onMutate({ action: "upsertProjectMember", ...form });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Assign user to project</div>
        <div className="grid gap-3 lg:grid-cols-4">
          <Field label="Project">
            <AdminSelect
              value={form.projectId}
              onChange={(projectId) => setForm((current) => ({ ...current, projectId }))}
              options={[
                { value: "", label: "Select project" },
                ...data.projects.map((project) => ({
                  value: project.id,
                  label: String(project.name ?? project.id),
                })),
              ]}
            />
          </Field>
          <Field label="User">
            <AdminSelect
              value={form.userId}
              onChange={(userId) => setForm((current) => ({ ...current, userId }))}
              options={[
                { value: "", label: "Select user" },
                ...data.users.map((user) => ({
                  value: user.id,
                  label: String(user.fullName ?? user.username ?? user.id),
                })),
              ]}
            />
          </Field>
          <Field label="Project role">
            <AdminSelect
              value={form.role}
              onChange={(role) => setForm((current) => ({ ...current, role }))}
              options={[
                { value: "member", label: "Member" },
                { value: "project_leader", label: "Project leader" },
                { value: "project_manager", label: "Project manager" },
              ]}
            />
          </Field>
          <div className="flex items-end">
            <ActionButton onClick={assignMember} disabled={!form.projectId || !form.userId}>
              <Check className="h-3.5 w-3.5" /> Assign
            </ActionButton>
          </div>
        </div>
      </div>
      {data.projectMembers.length === 0 ? (
        <EmptyState label="project members" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Project</th>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Assigned</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.projectMembers.map((member) => (
                <tr key={member.id} className="border-t border-border/60">
                  <td className="px-2 py-2">
                    {findName(data.projects, member.projectId, "Unknown project")}
                  </td>
                  <td className="px-2 py-2">
                    {findName(data.users, member.userId, "Unknown user")}
                  </td>
                  <td className="px-2 py-2">
                    <AdminSelect
                      value={String(member.role ?? "member")}
                      onChange={async (nextRole) => {
                        const projectName = findName(
                          data.projects,
                          member.projectId,
                          "this project",
                        );
                        const userName = findName(data.users, member.userId, "this user");
                        if (
                          !(await confirm({
                            title: "Change project role",
                            message: `Change ${userName}'s project role to ${roleLabel(nextRole)} in ${projectName}?`,
                            confirmLabel: "Change role",
                          }))
                        )
                          return;
                        void onMutate({
                          action: "upsertProjectMember",
                          projectId: member.projectId,
                          userId: member.userId,
                          role: nextRole,
                        });
                      }}
                      compact
                      options={[
                        { value: "member", label: "Member" },
                        { value: "project_leader", label: "Project leader" },
                        { value: "project_manager", label: "Project manager" },
                      ]}
                    />
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {formatDate(member.assignedAt)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <DangerButton
                      onClick={async () => {
                        const userName = findName(data.users, member.userId, "this user");
                        const projectName = findName(
                          data.projects,
                          member.projectId,
                          "this project",
                        );
                        if (
                          !(await confirm({
                            title: "Remove project member",
                            message: `Remove ${userName} from ${projectName}?`,
                            confirmLabel: "Remove",
                            tone: "danger",
                          }))
                        )
                          return;
                        void onMutate({ action: "removeProjectMember", id: member.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </DangerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ToolsAdminView({ data, onMutate }: { data: AdminOverview; onMutate: AdminMutate }) {
  const builtInTools = data.tools.filter((tool) => tool.isBuiltIn === true);
  const externalTools = data.tools.filter((tool) => tool.isBuiltIn !== true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "external",
    url: "",
    logoUrl: "",
    isActive: true,
  });

  async function saveTool() {
    await onMutate({ action: "createTool", ...form });
    setForm({
      name: "",
      description: "",
      category: "external",
      url: "",
      logoUrl: "",
      isActive: true,
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Create external tool</div>
        <div className="grid gap-3 lg:grid-cols-6">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={inputClass()}
            />
          </Field>
          <Field label="Category">
            <input
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              className={inputClass()}
            />
          </Field>
          <Field label="URL">
            <input
              value={form.url}
              onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
              className={inputClass()}
            />
          </Field>
          <Field label="Logo URL">
            <input
              value={form.logoUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, logoUrl: event.target.value }))
              }
              className={inputClass()}
            />
          </Field>
          <Field label="Status">
            <AdminSelect
              value={form.isActive ? "active" : "disabled"}
              onChange={(status) =>
                setForm((current) => ({ ...current, isActive: status === "active" }))
              }
              options={[
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          </Field>
          <div className="flex items-end">
            <ActionButton onClick={saveTool} disabled={!form.name.trim()}>
              <Plus className="h-3.5 w-3.5" /> Create
            </ActionButton>
          </div>
          <div className="lg:col-span-6">
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className={inputClass()}
                rows={2}
              />
            </Field>
          </div>
        </div>
      </div>
      <ToolSection
        title="Built-in coded tools"
        tools={builtInTools}
        emptyLabel="built-in tools"
        onMutate={onMutate}
      />
      <ToolSection
        title="External tools"
        tools={externalTools}
        emptyLabel="external tools"
        onMutate={onMutate}
      />
    </div>
  );
}

export function HelpItemsAdminView({
  data,
  onMutate,
}: {
  data: AdminOverview;
  onMutate: AdminMutate;
}) {
  const confirm = useAdminConfirm();
  const [tab, setTab] = useState("cards");
  const [faqGroup, setFaqGroup] = useState({
    label: "",
  });
  const [faqItem, setFaqItem] = useState({
    groupId: data.helpFaqGroups[0]?.id ?? "",
    question: "",
    answer: "",
  });
  const [tutorialStep, setTutorialStep] = useState({
    title: "",
    icon: "book-open",
    summary: "",
    detail: "",
  });
  const contact = data.helpContact[0];

  const tutorialIcons = [
    { value: "book-open", label: "Guide", icon: FileText },
    { value: "clipboard-list", label: "Checklist", icon: ClipboardList },
    { value: "cpu", label: "Technical", icon: Wrench },
    { value: "play-circle", label: "Run", icon: Activity },
    { value: "bar-chart-3", label: "Report", icon: Database },
    { value: "graduation-cap", label: "Learning", icon: GraduationCap },
  ];

  async function saveFaqGroup() {
    await onMutate({
      action: "createHelpFaqGroup",
      label: faqGroup.label,
      sortOrder: (data.helpFaqGroups.length + 1) * 10,
      isActive: true,
    });
    setFaqGroup({ label: "" });
  }

  async function saveFaqItem() {
    await onMutate({
      action: "createHelpFaqItem",
      groupId: faqItem.groupId || data.helpFaqGroups[0]?.id,
      question: faqItem.question,
      answer: faqItem.answer,
      sortOrder:
        (data.helpFaqItems.filter((item) => item.groupId === faqItem.groupId).length + 1) * 10,
      isActive: true,
    });
    setFaqItem({ groupId: faqItem.groupId, question: "", answer: "" });
  }

  async function saveTutorialStep() {
    await onMutate({
      action: "createHelpTutorialStep",
      title: tutorialStep.title,
      icon: tutorialStep.icon,
      summary: tutorialStep.summary,
      detail: tutorialStep.detail,
      sortOrder: (data.helpTutorialSteps.length + 1) * 10,
      isActive: true,
    });
    setTutorialStep({ title: "", icon: "book-open", summary: "", detail: "" });
  }

  const publishedCards = data.helpItems.filter((item) => item.isActive !== false).length;
  const publishedFaqs = data.helpFaqItems.filter((item) => item.isActive !== false).length;
  const publishedTutorialSteps = data.helpTutorialSteps.filter(
    (step) => step.isActive !== false,
  ).length;
  const tabs = [
    {
      id: "cards",
      label: "Help home",
      detail: `${publishedCards} published`,
      icon: LifeBuoy,
    },
    {
      id: "faq",
      label: "FAQ",
      detail: `${publishedFaqs} questions`,
      icon: HelpCircle,
    },
    {
      id: "tutorial",
      label: "Tutorial",
      detail: `${publishedTutorialSteps} steps`,
      icon: GraduationCap,
    },
    {
      id: "contact",
      label: "Contact",
      detail: contact?.email ? "Configured" : "Needs setup",
      icon: Phone,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Help content
            </div>
            <h3 className="mt-1 text-xl font-semibold">Manage the portal support experience</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Keep help cards, answers, tutorials, and contact details clear for portal users.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <div className="text-lg font-semibold">{publishedCards}</div>
              <div className="text-[11px] text-muted-foreground">Cards</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <div className="text-lg font-semibold">{publishedFaqs}</div>
              <div className="text-[11px] text-muted-foreground">FAQs</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <div className="text-lg font-semibold">{publishedTutorialSteps}</div>
              <div className="text-[11px] text-muted-foreground">Steps</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition",
                tab === item.id
                  ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                  : "border-border/70 bg-white/70 text-foreground hover:bg-white",
              ].join(" ")}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/80">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {tab === "cards" && (
        <div className="space-y-4">
          {data.helpItems.length === 0 ? (
            <EmptyState label="help items" />
          ) : (
            data.helpItems.map((item, index) => (
              <HelpCardEditor key={`${item.id}-${index}`} item={item} onMutate={onMutate} />
            ))
          )}
        </div>
      )}

      {tab === "faq" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Add FAQ group</div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field label="Group name">
                <input
                  value={faqGroup.label}
                  onChange={(event) => setFaqGroup({ label: event.target.value })}
                  className={inputClass()}
                />
              </Field>
              <div className="flex items-end">
                <ActionButton onClick={saveFaqGroup} disabled={!faqGroup.label.trim()}>
                  <Plus className="h-3.5 w-3.5" /> Add group
                </ActionButton>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Add FAQ question</div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Group">
                <AdminSelect
                  value={faqItem.groupId || data.helpFaqGroups[0]?.id || ""}
                  onChange={(groupId) => setFaqItem((current) => ({ ...current, groupId }))}
                  options={data.helpFaqGroups.map((group) => ({
                    value: group.id,
                    label: group.label ?? "Untitled group",
                  }))}
                />
              </Field>
              <Field label="Question">
                <input
                  value={faqItem.question}
                  onChange={(event) =>
                    setFaqItem((current) => ({ ...current, question: event.target.value }))
                  }
                  className={inputClass()}
                />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Answer">
                  <textarea
                    value={faqItem.answer}
                    onChange={(event) =>
                      setFaqItem((current) => ({ ...current, answer: event.target.value }))
                    }
                    className={inputClass()}
                    rows={3}
                  />
                </Field>
              </div>
              <div className="lg:col-span-2">
                <ActionButton
                  onClick={saveFaqItem}
                  disabled={!faqItem.question.trim() || !data.helpFaqGroups.length}
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </ActionButton>
              </div>
            </div>
          </div>

          {data.helpFaqGroups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <input
                  defaultValue={group.label ?? ""}
                  className={inputClass("max-w-md")}
                  onBlur={(event) =>
                    void onMutate({
                      action: "updateHelpFaqGroup",
                      ...group,
                      label: event.target.value,
                    })
                  }
                />
                <DangerButton
                  onClick={async () => {
                    if (
                      !(await confirm({
                        title: "Delete FAQ group",
                        message: `Delete ${group.label ?? "this group"} and its questions?`,
                        confirmLabel: "Delete",
                        tone: "danger",
                      }))
                    )
                      return;
                    void onMutate({ action: "deleteHelpFaqGroup", id: group.id });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete group
                </DangerButton>
              </div>
              <div className="space-y-3">
                {data.helpFaqItems
                  .filter((item) => item.groupId === group.id)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/70 bg-white/70 p-3"
                    >
                      <Field label="Question">
                        <input
                          defaultValue={item.question ?? ""}
                          className={inputClass()}
                          onBlur={(event) =>
                            void onMutate({
                              action: "updateHelpFaqItem",
                              ...item,
                              question: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <div className="mt-3">
                        <Field label="Answer">
                          <textarea
                            defaultValue={item.answer ?? ""}
                            className={inputClass()}
                            rows={3}
                            onBlur={(event) =>
                              void onMutate({
                                action: "updateHelpFaqItem",
                                ...item,
                                answer: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() =>
                            void onMutate({
                              action: "updateHelpFaqItem",
                              ...item,
                              isActive: item.isActive === false,
                            })
                          }
                        >
                          {item.isActive === false ? "Publish" : "Hide"}
                        </ActionButton>
                        <DangerButton
                          onClick={async () => {
                            if (
                              !(await confirm({
                                title: "Delete FAQ",
                                message: `Delete ${item.question ?? "this question"}?`,
                                confirmLabel: "Delete",
                                tone: "danger",
                              }))
                            )
                              return;
                            void onMutate({ action: "deleteHelpFaqItem", id: item.id });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </DangerButton>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tutorial" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Add tutorial step</div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Title">
                <input
                  value={tutorialStep.title}
                  onChange={(event) =>
                    setTutorialStep((current) => ({ ...current, title: event.target.value }))
                  }
                  className={inputClass()}
                />
              </Field>
              <Field label="Icon">
                <IconPicker
                  value={tutorialStep.icon}
                  options={tutorialIcons}
                  onChange={(icon) => setTutorialStep((current) => ({ ...current, icon }))}
                />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Summary">
                  <input
                    value={tutorialStep.summary}
                    onChange={(event) =>
                      setTutorialStep((current) => ({ ...current, summary: event.target.value }))
                    }
                    className={inputClass()}
                  />
                </Field>
              </div>
              <div className="lg:col-span-2">
                <Field label="Step details">
                  <textarea
                    value={tutorialStep.detail}
                    onChange={(event) =>
                      setTutorialStep((current) => ({ ...current, detail: event.target.value }))
                    }
                    className={inputClass()}
                    rows={4}
                    placeholder="Write one instruction per line"
                  />
                </Field>
              </div>
              <div className="lg:col-span-2">
                <ActionButton onClick={saveTutorialStep} disabled={!tutorialStep.title.trim()}>
                  <Plus className="h-3.5 w-3.5" /> Add step
                </ActionButton>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.helpTutorialSteps.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
                <div className="grid gap-3">
                  <Field label="Title">
                    <input
                      defaultValue={step.title ?? ""}
                      className={inputClass()}
                      onBlur={(event) =>
                        void onMutate({
                          action: "updateHelpTutorialStep",
                          ...step,
                          title: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Icon">
                    <IconPicker
                      value={step.icon ?? "graduation-cap"}
                      options={tutorialIcons}
                      onChange={(icon) =>
                        void onMutate({
                          action: "updateHelpTutorialStep",
                          ...step,
                          icon,
                        })
                      }
                    />
                  </Field>
                  <Field label="Summary">
                    <input
                      defaultValue={step.summary ?? ""}
                      className={inputClass()}
                      onBlur={(event) =>
                        void onMutate({
                          action: "updateHelpTutorialStep",
                          ...step,
                          summary: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Step details">
                    <textarea
                      defaultValue={(step.detail ?? []).join("\n")}
                      className={inputClass()}
                      rows={4}
                      onBlur={(event) =>
                        void onMutate({
                          action: "updateHelpTutorialStep",
                          ...step,
                          detail: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() =>
                      void onMutate({
                        action: "updateHelpTutorialStep",
                        ...step,
                        sortOrder: Number(step.sortOrder ?? 0) - 15,
                      })
                    }
                  >
                    Move up
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      void onMutate({
                        action: "updateHelpTutorialStep",
                        ...step,
                        sortOrder: Number(step.sortOrder ?? 0) + 15,
                      })
                    }
                  >
                    Move down
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      void onMutate({
                        action: "updateHelpTutorialStep",
                        ...step,
                        isActive: step.isActive === false,
                      })
                    }
                  >
                    {step.isActive === false ? "Publish" : "Hide"}
                  </ActionButton>
                  <DangerButton
                    onClick={async () => {
                      if (
                        !(await confirm({
                          title: "Delete tutorial step",
                          message: `Delete ${step.title ?? "this step"}?`,
                          confirmLabel: "Delete",
                          tone: "danger",
                        }))
                      )
                        return;
                      void onMutate({ action: "deleteHelpTutorialStep", id: step.id });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DangerButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "contact" && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold">Contact details</div>
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["name", "Name"],
              ["initials", "Initials"],
              ["role", "Role"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["availability", "Availability"],
              ["githubUrl", "GitHub URL"],
              ["linkedinUrl", "LinkedIn URL"],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  defaultValue={String(contact?.[key] ?? "")}
                  className={inputClass()}
                  data-contact-field={key}
                />
              </Field>
            ))}
            <div className="lg:col-span-2">
              <Field label="Support message">
                <textarea
                  defaultValue={contact?.supportMessage ?? ""}
                  className={inputClass()}
                  rows={3}
                  data-contact-field="supportMessage"
                />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <ActionButton
                onClick={() => {
                  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
                    "[data-contact-field]",
                  );
                  const payload: Record<string, unknown> = { action: "updateHelpContact" };
                  fields.forEach((field) => {
                    payload[field.dataset.contactField ?? ""] = field.value;
                  });
                  void onMutate(payload);
                }}
              >
                <Save className="h-3.5 w-3.5" /> Save contact
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HelpCardEditor({
  item,
  onMutate,
}: {
  item: AdminOverview["helpItems"][number];
  onMutate: AdminMutate;
}) {
  const confirm = useAdminConfirm();
  const [draft, setDraft] = useState({
    title: item.title ?? "",
    description: item.description ?? "",
  });
  const changed =
    draft.title.trim() !== String(item.title ?? "").trim() ||
    draft.description.trim() !== String(item.description ?? "").trim();

  async function save() {
    if (
      !(await confirm({
        title: "Save help card",
        message: `Save changes to ${item.title ?? "this help card"}?`,
        confirmLabel: "Save",
      }))
    )
      return;
    await onMutate({
      action: "updateHelpItem",
      ...item,
      title: draft.title,
      description: draft.description,
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
            {item.title ?? "Untitled help card"}
            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                item.isActive === false
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary",
              ].join(" ")}
            >
              {item.isActive === false ? "Hidden" : "Published"}
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {item.description ?? "No description"}
          </div>
        </div>
        <ActionButton
          onClick={async () => {
            const nextState = item.isActive === false ? "publish" : "hide";
            if (
              !(await confirm({
                title: `${nextState === "publish" ? "Publish" : "Hide"} help card`,
                message: `${nextState === "publish" ? "Publish" : "Hide"} ${item.title ?? "this help card"}?`,
                confirmLabel: nextState === "publish" ? "Publish" : "Hide",
              }))
            )
              return;
            void onMutate({
              action: "updateHelpItem",
              ...item,
              isActive: item.isActive === false,
            });
          }}
        >
          {item.isActive === false ? "Publish" : "Hide"}
        </ActionButton>
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="Title">
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            className={inputClass()}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            className={inputClass("min-h-24 resize-y")}
            rows={3}
          />
        </Field>
        <div className="flex justify-end border-t border-border/70 pt-4">
          <ActionButton onClick={save} disabled={!draft.title.trim() || !changed}>
            <Save className="h-3.5 w-3.5" /> Save changes
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ToolSection({
  title,
  tools,
  emptyLabel,
  onMutate,
}: {
  title: string;
  tools: AdminOverview["tools"];
  emptyLabel: string;
  onMutate: AdminMutate;
}) {
  const confirm = useAdminConfirm();
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">{title}</div>
      {tools.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tools.map((tool, index) => (
            <div
              key={`${tool.id}-${index}`}
              className="rounded-2xl border border-border/70 bg-white/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {tool.name ?? "Untitled tool"}
                    {tool.isBuiltIn && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        Built-in
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {tool.description ?? "No description"}
                  </div>
                  {!tool.isBuiltIn && (
                    <div className="mt-2 text-xs text-muted-foreground">{tool.url ?? "No URL"}</div>
                  )}
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                  {tool.category ?? "general"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ActionButton
                  onClick={async () => {
                    const nextState = tool.isActive === false ? "enable" : "disable";
                    if (
                      !(await confirm({
                        title: `${nextState === "enable" ? "Enable" : "Disable"} tool`,
                        message: `${nextState === "enable" ? "Enable" : "Disable"} ${tool.name ?? "this tool"}?`,
                        confirmLabel: nextState === "enable" ? "Enable" : "Disable",
                      }))
                    )
                      return;
                    void onMutate({
                      action: "updateTool",
                      id: tool.id,
                      name: tool.name,
                      slug: tool.slug,
                      description: tool.description,
                      category: tool.category,
                      url: tool.url,
                      logoUrl: tool.logoUrl,
                      isBuiltIn: tool.isBuiltIn === true,
                      source: tool.source,
                      isActive: tool.isActive === false,
                    });
                  }}
                >
                  {tool.isActive === false ? "Enable" : "Disable"}
                </ActionButton>
                {!tool.isBuiltIn && (
                  <DangerButton
                    onClick={async () => {
                      if (
                        !(await confirm({
                          title: "Delete external tool",
                          message: `Delete ${tool.name ?? "this external tool"}?`,
                          confirmLabel: "Delete",
                          tone: "danger",
                        }))
                      )
                        return;
                      void onMutate({ action: "deleteTool", id: tool.id });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DangerButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectToolsView({
  data,
  onMutate,
}: {
  data: AdminOverview;
  onMutate: AdminMutate;
}) {
  const confirm = useAdminConfirm();
  const [form, setForm] = useState({
    projectId: data.projects[0]?.id ?? "",
    toolId: data.tools[0]?.id ?? "",
    enabled: true,
  });

  async function assignTool() {
    const projectName = findName(data.projects, form.projectId, "this project");
    const toolName = findName(data.tools, form.toolId, "this tool");
    if (
      !(await confirm({
        title: `${form.enabled ? "Enable" : "Disable"} project tool`,
        message: `${form.enabled ? "Enable" : "Disable"} ${toolName} for ${projectName}?`,
        confirmLabel: form.enabled ? "Enable" : "Disable",
      }))
    )
      return;
    await onMutate({ action: "upsertProjectTool", ...form });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Enable tool for project</div>
        <div className="grid gap-3 lg:grid-cols-4">
          <Field label="Project">
            <AdminSelect
              value={form.projectId}
              onChange={(projectId) => setForm((current) => ({ ...current, projectId }))}
              options={[
                { value: "", label: "Select project" },
                ...data.projects.map((project) => ({
                  value: project.id,
                  label: String(project.name ?? project.id),
                })),
              ]}
            />
          </Field>
          <Field label="Tool">
            <AdminSelect
              value={form.toolId}
              onChange={(toolId) => setForm((current) => ({ ...current, toolId }))}
              options={[
                { value: "", label: "Select tool" },
                ...data.tools.map((tool) => ({
                  value: tool.id,
                  label: String(tool.name ?? tool.id),
                })),
              ]}
            />
          </Field>
          <Field label="Status">
            <AdminSelect
              value={form.enabled ? "enabled" : "disabled"}
              onChange={(status) =>
                setForm((current) => ({ ...current, enabled: status === "enabled" }))
              }
              options={[
                { value: "enabled", label: "Enabled" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          </Field>
          <div className="flex items-end">
            <ActionButton onClick={assignTool} disabled={!form.projectId || !form.toolId}>
              <Check className="h-3.5 w-3.5" /> Save
            </ActionButton>
          </div>
        </div>
      </div>
      {data.projectTools.length === 0 ? (
        <EmptyState label="project tool assignments" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Project</th>
                <th className="px-2 py-2">Tool</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.projectTools.map((item) => (
                <tr key={item.id} className="border-t border-border/60">
                  <td className="px-2 py-2">
                    {findName(data.projects, item.projectId, "Unknown project")}
                  </td>
                  <td className="px-2 py-2">{findName(data.tools, item.toolId, "Unknown tool")}</td>
                  <td className="px-2 py-2">
                    <AdminSelect
                      value={item.enabled === false ? "disabled" : "enabled"}
                      onChange={async (status) => {
                        const enabled = status === "enabled";
                        const projectName = findName(data.projects, item.projectId, "this project");
                        const toolName = findName(data.tools, item.toolId, "this tool");
                        if (
                          !(await confirm({
                            title: `${enabled ? "Enable" : "Disable"} project tool`,
                            message: `${enabled ? "Enable" : "Disable"} ${toolName} for ${projectName}?`,
                            confirmLabel: enabled ? "Enable" : "Disable",
                          }))
                        )
                          return;
                        void onMutate({
                          action: "upsertProjectTool",
                          projectId: item.projectId,
                          toolId: item.toolId,
                          enabled,
                        });
                      }}
                      compact
                      options={[
                        { value: "enabled", label: "Enabled" },
                        { value: "disabled", label: "Disabled" },
                      ]}
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <DangerButton
                      onClick={async () => {
                        const projectName = findName(data.projects, item.projectId, "this project");
                        const toolName = findName(data.tools, item.toolId, "this tool");
                        if (
                          !(await confirm({
                            title: "Remove project tool",
                            message: `Remove ${toolName} from ${projectName}?`,
                            confirmLabel: "Remove",
                            tone: "danger",
                          }))
                        )
                          return;
                        void onMutate({ action: "removeProjectTool", id: item.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </DangerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SonarQubeConfigsView({ data }: { data: AdminOverview }) {
  return data.sonarqubeConfigs.length === 0 ? (
    <EmptyState label="SonarQube configs" />
  ) : (
    <div className="grid gap-3 md:grid-cols-2">
      {data.sonarqubeConfigs.map((config) => (
        <div key={config.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
          <div className="text-sm font-semibold">{config.name ?? "SonarQube config"}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {config.serverUrl ?? "No server URL"}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {findName(data.projects, config.projectId, "No project linked")}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SonarQubeScansView({ data }: { data: AdminOverview }) {
  return data.sonarqubeScans.length === 0 ? (
    <EmptyState label="SonarQube scans" />
  ) : (
    <div className="space-y-3">
      {data.sonarqubeScans.map((scan) => (
        <div key={scan.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                {scan.projectName ?? scan.projectKey ?? "Scan"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDate(scan.scannedAt)}</div>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
              {scan.qualityGateStatus ?? "NONE"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SonarQubeIssuesView({ data }: { data: AdminOverview }) {
  return data.sonarqubeIssues.length === 0 ? (
    <EmptyState label="SonarQube issues" />
  ) : (
    <div className="space-y-3">
      {data.sonarqubeIssues.map((issue) => (
        <div key={issue.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold">
                {issue.message ?? issue.issueKey ?? "Issue"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {issue.issueType ?? "Type unknown"} - {issue.status ?? "Status unknown"}
              </div>
            </div>
            <span className="w-fit rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              {issue.severity ?? "UNKNOWN"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogsView({ data }: { data: AdminOverview }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [action, setAction] = useState("all");

  const statusOptions = useMemo(
    () => uniqueValues(data.auditLogs.map((log) => log.status ?? "success")),
    [data.auditLogs],
  );
  const categoryOptions = useMemo(
    () => uniqueValues(data.auditLogs.map((log) => log.category ?? "system")),
    [data.auditLogs],
  );
  const actionOptions = useMemo(
    () => uniqueValues(data.auditLogs.map((log) => log.action ?? "event")),
    [data.auditLogs],
  );

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.auditLogs.filter((log) => {
      const actor = findName(data.users, log.actorId, "System");
      const target = findName(data.users, log.targetUserId, "Not user-specific");
      const searchable = [
        log.message,
        log.action,
        log.category,
        log.status,
        log.objectType,
        log.objectId,
        log.objectName,
        actor,
        target,
        formatDate(log.createdAt),
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return (
        (!query || searchable.includes(query)) &&
        (status === "all" || String(log.status ?? "success") === status) &&
        (category === "all" || String(log.category ?? "system") === category) &&
        (action === "all" || String(log.action ?? "event") === action)
      );
    });
  }, [action, category, data.auditLogs, data.users, search, status]);

  function exportLogs() {
    const rows = filteredLogs.map((log) => [
      formatDate(log.createdAt),
      log.status ?? "success",
      log.category ?? "system",
      log.action ?? "event",
      findName(data.users, log.actorId, "System"),
      findName(data.users, log.targetUserId, "Not user-specific"),
      log.objectType ?? "system",
      log.objectId ?? "",
      log.objectName ?? "",
      log.message ?? "",
      JSON.stringify(log.metadata ?? {}),
    ]);
    const csv = [
      [
        "Created at",
        "Status",
        "Category",
        "Action",
        "Actor",
        "Target",
        "Object type",
        "Object ID",
        "Object name",
        "Message",
        "Metadata",
      ],
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sqa-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function badgeClass(status: unknown) {
    if (status === "failed") return "bg-destructive/10 text-destructive";
    if (status === "blocked") return "bg-amber-500/10 text-amber-700";
    return "bg-primary/10 text-primary";
  }

  return data.auditLogs.length === 0 ? (
    <EmptyState label="audit logs" />
  ) : (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={inputClass("pl-9")}
                placeholder="Search actor, action, object, message"
              />
            </div>
          </Field>
          <Field label="Status">
            <AdminSelect
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All statuses" },
                ...statusOptions.map((option) => ({ value: option, label: option })),
              ]}
            />
          </Field>
          <Field label="Area">
            <AdminSelect
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: "All areas" },
                ...categoryOptions.map((option) => ({ value: option, label: option })),
              ]}
            />
          </Field>
          <Field label="Action">
            <AdminSelect
              value={action}
              onChange={setAction}
              options={[
                { value: "all", label: "All actions" },
                ...actionOptions.map((option) => ({ value: option, label: option })),
              ]}
            />
          </Field>
          <div className="flex items-end">
            <ActionButton onClick={exportLogs} disabled={filteredLogs.length === 0}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </ActionButton>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Showing {filteredLogs.length} of {data.auditLogs.length} audit logs.
        </div>
      </div>
      {filteredLogs.length === 0 && <EmptyState label="matching audit logs" />}
      {filteredLogs.map((log) => (
        <div key={log.id} className="rounded-2xl border border-border/70 bg-white/70 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{log.message ?? "Audit event"}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClass(log.status)}`}
                >
                  {log.status ?? "success"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Actor: {findName(data.users, log.actorId, "System")}</span>
                <span>Target: {findName(data.users, log.targetUserId, "Not user-specific")}</span>
                <span>Area: {log.category ?? "system"}</span>
                <span>Object: {log.objectType ?? "system"}</span>
                {log.objectName && <span>Name: {log.objectName}</span>}
              </div>
            </div>
            <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground lg:items-end">
              <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
                {log.action ?? "event"}
              </span>
              <span>{formatDate(log.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminOverviewCards({ data }: { data: AdminOverview }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Users} label="Users" value={data.users.length} />
      <StatCard icon={Layers} label="Projects" value={data.projects.length} />
      <StatCard icon={Wrench} label="Tools" value={data.tools.length} />
      <StatCard icon={LifeBuoy} label="Help items" value={data.helpItems.length} />
      <StatCard icon={Database} label="SonarQube scans" value={data.sonarqubeScans.length} />
      <StatCard icon={FileText} label="SonarQube issues" value={data.sonarqubeIssues.length} />
      <StatCard icon={ClipboardCheck} label="Audit logs" value={data.auditLogs.length} />
      <StatCard icon={Boxes} label="Project tools" value={data.projectTools.length} />
      <StatCard icon={Shield} label="Roles" value={data.roles.length} />
    </div>
  );
}
