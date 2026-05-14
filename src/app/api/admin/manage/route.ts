import { randomUUID } from "node:crypto";
import { writeAuditLog, type AuditAction } from "@/shared/lib/audit";
import { getMongoDb } from "@/shared/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AdminDocument = {
  _id?: string | ObjectId;
  [key: string]: unknown;
};

const projectRoles = ["project_manager", "project_leader", "member"];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function roleLabel(value: string) {
  return value.replace(/_/g, " ");
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function documentFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] };
  }
  return { _id: id };
}

async function writeAudit(
  actorId: string | null,
  action: AuditAction,
  objectType: string,
  objectId: string,
  objectName: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  await writeAuditLog({
    actorId,
    action,
    objectType,
    objectId,
    objectName,
    message,
    category: "admin",
    metadata,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid payload");

  const input = body as Record<string, unknown>;
  const action = text(input.action);
  const actorId = text(input.actorId) || null;
  const db = await getMongoDb();

  if (action === "updateRolePermissions") {
    const roleId = text(input.roleId);
    const permissions = Array.isArray(input.permissions)
      ? input.permissions.map(text).filter(Boolean)
      : [];
    if (!roleId) return badRequest("Missing role");
    if (roleId === "admin") return badRequest("Admin permissions cannot be edited");
    await db.collection<AdminDocument>("roles").updateOne(
      { _id: roleId },
      {
        $set: {
          permissions,
          updatedAt: Date.now(),
        },
      },
    );
    await writeAudit(
      actorId,
      "update",
      "role",
      roleId,
      roleId,
      `${roleId} permissions were updated`,
      { permissions },
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "createProject" || action === "updateProject") {
    const id = action === "createProject" ? randomUUID() : text(input.id);
    const name = text(input.name);
    if (!id || !name) return badRequest("Missing project name");
    const project = {
      name,
      description: text(input.description),
      type: text(input.type) || "general",
      status: text(input.status) || "active",
      link: text(input.link),
      updatedAt: Date.now(),
    };
    await db.collection<AdminDocument>("projects").updateOne(
      documentFilter(id),
      {
        $set: project,
        $setOnInsert: {
          _id: id,
          createdAt: Date.now(),
        },
      },
      { upsert: true },
    );
    await writeAudit(
      actorId,
      action === "createProject" ? "create" : "update",
      "project",
      id,
      name,
      `${name} project was ${action === "createProject" ? "created" : "updated"}`,
    );
    return NextResponse.json({ ok: true, id });
  }

  if (action === "deleteProject") {
    const id = text(input.id);
    if (!id) return badRequest("Missing project");
    const project = await db.collection<AdminDocument>("projects").findOne(documentFilter(id));
    await Promise.all([
      db.collection<AdminDocument>("projects").deleteOne(documentFilter(id)),
      db.collection<AdminDocument>("project_members").deleteMany({ projectId: id }),
      db.collection<AdminDocument>("project_tools").deleteMany({ projectId: id }),
    ]);
    const projectName = text(project?.name) || id;
    await writeAudit(
      actorId,
      "delete",
      "project",
      id,
      projectName,
      `${projectName} project was deleted`,
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "upsertProjectMember") {
    const projectId = text(input.projectId);
    const userId = text(input.userId);
    const role = text(input.role) || "member";
    if (!projectId || !userId || !projectRoles.includes(role))
      return badRequest("Invalid member assignment");
    await db.collection<AdminDocument>("project_members").updateOne(
      { projectId, userId },
      {
        $set: {
          projectId,
          userId,
          role,
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          _id: randomUUID(),
          assignedAt: Date.now(),
        },
      },
      { upsert: true },
    );
    const [project, user] = await Promise.all([
      db.collection<AdminDocument>("projects").findOne(documentFilter(projectId)),
      db.collection<AdminDocument>("users").findOne(documentFilter(userId)),
    ]);
    const projectName = text(project?.name) || projectId;
    const userName = text(user?.fullName) || text(user?.username) || userId;
    await writeAudit(
      actorId,
      "update",
      "project_member",
      projectId,
      userName,
      `${userName} was assigned as ${roleLabel(role)} in ${projectName}`,
      { projectId, userId, role },
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "removeProjectMember") {
    const id = text(input.id);
    if (!id) return badRequest("Missing project member");
    const member = await db
      .collection<AdminDocument>("project_members")
      .findOne(documentFilter(id));
    await db.collection<AdminDocument>("project_members").deleteOne(documentFilter(id));
    await writeAudit(
      actorId,
      "delete",
      "project_member",
      id,
      id,
      `Project member assignment was removed`,
      {
        projectId: member?.projectId,
        userId: member?.userId,
      },
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "createTool" || action === "updateTool") {
    const id = action === "createTool" ? randomUUID() : text(input.id);
    const name = text(input.name);
    if (!id || !name) return badRequest("Missing tool name");
    const existingTool =
      action === "updateTool"
        ? await db.collection<AdminDocument>("tools").findOne(documentFilter(id))
        : null;
    const isBuiltIn =
      action === "createTool" ? false : bool(input.isBuiltIn, existingTool?.isBuiltIn === true);
    await db.collection<AdminDocument>("tools").updateOne(
      documentFilter(id),
      {
        $set: {
          name,
          slug:
            text(input.slug) ||
            name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
          description: text(input.description),
          category: text(input.category) || "general",
          url: text(input.url),
          logoUrl: text(input.logoUrl),
          isBuiltIn,
          source: isBuiltIn ? text(input.source) || "built-in" : "admin-external",
          isActive: bool(input.isActive),
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          _id: id,
          createdAt: Date.now(),
        },
      },
      { upsert: true },
    );
    await writeAudit(
      actorId,
      action === "createTool" ? "create" : "update",
      "tool",
      id,
      name,
      `${name} tool was ${action === "createTool" ? "created" : "updated"}`,
      { isBuiltIn, isActive: bool(input.isActive) },
    );
    return NextResponse.json({ ok: true, id });
  }

  if (action === "deleteTool") {
    const id = text(input.id);
    if (!id) return badRequest("Missing tool");
    const tool = await db.collection<AdminDocument>("tools").findOne(documentFilter(id));
    if (tool?.isBuiltIn === true) return badRequest("Built-in tools cannot be deleted");
    await Promise.all([
      db.collection<AdminDocument>("tools").deleteOne(documentFilter(id)),
      db.collection<AdminDocument>("project_tools").deleteMany({ toolId: id }),
    ]);
    const toolName = text(tool?.name) || id;
    await writeAudit(actorId, "delete", "tool", id, toolName, `${toolName} tool was deleted`);
    return NextResponse.json({ ok: true });
  }

  if (action === "upsertProjectTool") {
    const projectId = text(input.projectId);
    const toolId = text(input.toolId);
    if (!projectId || !toolId) return badRequest("Missing project tool assignment");
    await db.collection<AdminDocument>("project_tools").updateOne(
      { projectId, toolId },
      {
        $set: {
          projectId,
          toolId,
          enabled: bool(input.enabled),
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          _id: randomUUID(),
          assignedAt: Date.now(),
        },
      },
      { upsert: true },
    );
    const [project, tool] = await Promise.all([
      db.collection<AdminDocument>("projects").findOne(documentFilter(projectId)),
      db.collection<AdminDocument>("tools").findOne(documentFilter(toolId)),
    ]);
    const projectName = text(project?.name) || projectId;
    const toolName = text(tool?.name) || toolId;
    const enabled = bool(input.enabled);
    await writeAudit(
      actorId,
      "update",
      "project_tool",
      projectId,
      toolName,
      `${toolName} was ${enabled ? "enabled" : "disabled"} for ${projectName}`,
      { projectId, toolId, enabled },
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "removeProjectTool") {
    const id = text(input.id);
    if (!id) return badRequest("Missing project tool");
    const projectTool = await db
      .collection<AdminDocument>("project_tools")
      .findOne(documentFilter(id));
    await db.collection<AdminDocument>("project_tools").deleteOne(documentFilter(id));
    await writeAudit(
      actorId,
      "delete",
      "project_tool",
      id,
      id,
      `Project tool assignment was removed`,
      {
        projectId: projectTool?.projectId,
        toolId: projectTool?.toolId,
      },
    );
    return NextResponse.json({ ok: true });
  }

  return badRequest("Unknown action");
}
