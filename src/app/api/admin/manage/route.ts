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

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

  if (action === "createHelpItem" || action === "updateHelpItem") {
    const id = action === "createHelpItem" ? randomUUID() : text(input.id);
    const title = text(input.title);
    if (!id || !title) return badRequest("Missing help title");
    await db.collection<AdminDocument>("help_items").updateOne(
      documentFilter(id),
      {
        $set: {
          title,
          slug: text(input.slug) || slug(title),
          description: text(input.description),
          href: text(input.href) || "/help",
          icon: text(input.icon) || "life-buoy",
          color: text(input.color) || "from-sky-500 to-cyan-500",
          category: text(input.category) || "support",
          sortOrder: Number(input.sortOrder) || 0,
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
      action === "createHelpItem" ? "create" : "update",
      "help_item",
      id,
      title,
      `${title} help item was ${action === "createHelpItem" ? "created" : "updated"}`,
      { isActive: bool(input.isActive) },
    );
    return NextResponse.json({ ok: true, id });
  }

  if (action === "deleteHelpItem") {
    const id = text(input.id);
    if (!id) return badRequest("Missing help item");
    const helpItem = await db.collection<AdminDocument>("help_items").findOne(documentFilter(id));
    await db.collection<AdminDocument>("help_items").deleteOne(documentFilter(id));
    const helpTitle = text(helpItem?.title) || id;
    await writeAudit(
      actorId,
      "delete",
      "help_item",
      id,
      helpTitle,
      `${helpTitle} help item was deleted`,
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "createHelpFaqGroup" || action === "updateHelpFaqGroup") {
    const label = text(input.label);
    const id =
      action === "createHelpFaqGroup" ? `faq-${slug(label) || randomUUID()}` : text(input.id);
    if (!id || !label) return badRequest("Missing FAQ group label");
    await db.collection<AdminDocument>("help_faq_groups").updateOne(
      documentFilter(id),
      {
        $set: {
          label,
          sortOrder: Number(input.sortOrder) || 0,
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
      action === "createHelpFaqGroup" ? "create" : "update",
      "help_faq_group",
      id,
      label,
      `${label} FAQ group was ${action === "createHelpFaqGroup" ? "created" : "updated"}`,
    );
    return NextResponse.json({ ok: true, id });
  }

  if (action === "deleteHelpFaqGroup") {
    const id = text(input.id);
    if (!id) return badRequest("Missing FAQ group");
    const group = await db.collection<AdminDocument>("help_faq_groups").findOne(documentFilter(id));
    await Promise.all([
      db.collection<AdminDocument>("help_faq_groups").deleteOne(documentFilter(id)),
      db.collection<AdminDocument>("help_faq_items").deleteMany({ groupId: id }),
    ]);
    const groupName = text(group?.label) || id;
    await writeAudit(
      actorId,
      "delete",
      "help_faq_group",
      id,
      groupName,
      `${groupName} FAQ group was deleted`,
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "createHelpFaqItem" || action === "updateHelpFaqItem") {
    const groupId = text(input.groupId);
    const question = text(input.question);
    const id =
      action === "createHelpFaqItem" ? `faq-${slug(question) || randomUUID()}` : text(input.id);
    if (!id || !groupId || !question) return badRequest("Missing FAQ item");
    await db.collection<AdminDocument>("help_faq_items").updateOne(
      documentFilter(id),
      {
        $set: {
          groupId,
          question,
          answer: text(input.answer),
          sortOrder: Number(input.sortOrder) || 0,
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
      action === "createHelpFaqItem" ? "create" : "update",
      "help_faq_item",
      id,
      question,
      `${question} FAQ was ${action === "createHelpFaqItem" ? "created" : "updated"}`,
    );
    return NextResponse.json({ ok: true, id });
  }

  if (action === "deleteHelpFaqItem") {
    const id = text(input.id);
    if (!id) return badRequest("Missing FAQ item");
    const faq = await db.collection<AdminDocument>("help_faq_items").findOne(documentFilter(id));
    await db.collection<AdminDocument>("help_faq_items").deleteOne(documentFilter(id));
    const question = text(faq?.question) || id;
    await writeAudit(
      actorId,
      "delete",
      "help_faq_item",
      id,
      question,
      `${question} FAQ was deleted`,
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "createHelpTutorialStep" || action === "updateHelpTutorialStep") {
    const title = text(input.title);
    const id =
      action === "createHelpTutorialStep"
        ? `tutorial-${slug(title) || randomUUID()}`
        : text(input.id);
    if (!id || !title) return badRequest("Missing tutorial step title");
    const detail = Array.isArray(input.detail)
      ? input.detail.map(text).filter(Boolean)
      : text(input.detail).split(/\r?\n/).map(text).filter(Boolean);
    await db.collection<AdminDocument>("help_tutorial_steps").updateOne(
      documentFilter(id),
      {
        $set: {
          title,
          icon: text(input.icon) || "graduation-cap",
          summary: text(input.summary),
          detail,
          sortOrder: Number(input.sortOrder) || 0,
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
      action === "createHelpTutorialStep" ? "create" : "update",
      "help_tutorial_step",
      id,
      title,
      `${title} tutorial step was ${action === "createHelpTutorialStep" ? "created" : "updated"}`,
    );
    return NextResponse.json({ ok: true, id });
  }

  if (action === "deleteHelpTutorialStep") {
    const id = text(input.id);
    if (!id) return badRequest("Missing tutorial step");
    const step = await db
      .collection<AdminDocument>("help_tutorial_steps")
      .findOne(documentFilter(id));
    await db.collection<AdminDocument>("help_tutorial_steps").deleteOne(documentFilter(id));
    const title = text(step?.title) || id;
    await writeAudit(
      actorId,
      "delete",
      "help_tutorial_step",
      id,
      title,
      `${title} tutorial step was deleted`,
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "updateHelpContact") {
    const contact = {
      name: text(input.name),
      initials: text(input.initials),
      role: text(input.role),
      phone: text(input.phone),
      email: text(input.email),
      availability: text(input.availability),
      githubUrl: text(input.githubUrl),
      linkedinUrl: text(input.linkedinUrl),
      supportMessage: text(input.supportMessage),
      updatedAt: Date.now(),
    };
    await db.collection<AdminDocument>("help_contact").updateOne(
      { _id: "primary" },
      {
        $set: contact,
        $setOnInsert: {
          _id: "primary",
          createdAt: Date.now(),
        },
      },
      { upsert: true },
    );
    await writeAudit(
      actorId,
      "update",
      "help_contact",
      "primary",
      contact.name || "Primary contact",
      `Help contact was updated`,
    );
    return NextResponse.json({ ok: true, id: "primary" });
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
