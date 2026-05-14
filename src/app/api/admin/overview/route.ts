import { getMongoDb } from "@/shared/lib/mongodb";
import type { Sort } from "mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type MongoRecord = {
  _id?: unknown;
  [key: string]: unknown;
};

function idOf(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value) return String(value);
  return String(value);
}

function serialize(record: MongoRecord) {
  const { _id, ...rest } = record;
  return {
    id: idOf(_id),
    ...rest,
  };
}

async function readCollection(
  name: string,
  limit = 100,
  projection?: Record<string, 0 | 1>,
  sort?: Sort,
) {
  const db = await getMongoDb();
  return db
    .collection<MongoRecord>(name)
    .find({}, { projection })
    .sort(sort ?? {})
    .limit(limit)
    .toArray();
}

export async function GET() {
  const [
    users,
    roles,
    permissions,
    projects,
    projectMembers,
    tools,
    helpItems,
    helpFaqGroups,
    helpFaqItems,
    helpTutorialSteps,
    helpContact,
    projectTools,
    sonarqubeConfigs,
    sonarqubeScans,
    sonarqubeIssues,
    auditLogs,
  ] = await Promise.all([
    readCollection("users", 100, {
      passwordHash: 0,
      token: 0,
      code: 0,
    }),
    readCollection("roles"),
    readCollection("permissions"),
    readCollection("projects"),
    readCollection("project_members"),
    readCollection("tools"),
    readCollection("help_items", 100, undefined, { sortOrder: 1, title: 1 }),
    readCollection("help_faq_groups", 100, undefined, { sortOrder: 1, label: 1 }),
    readCollection("help_faq_items", 200, undefined, { groupId: 1, sortOrder: 1, question: 1 }),
    readCollection("help_tutorial_steps", 100, undefined, { sortOrder: 1, title: 1 }),
    readCollection("help_contact"),
    readCollection("project_tools"),
    readCollection("sonarqube_configs"),
    readCollection("sonarqube_scans"),
    readCollection("sonarqube_issues"),
    readCollection("audit_logs", 200, undefined, { createdAt: -1 }),
  ]);

  return NextResponse.json({
    users: users.map(serialize),
    roles: roles.map(serialize),
    permissions: permissions.map(serialize),
    projects: projects.map(serialize),
    projectMembers: projectMembers.map(serialize),
    tools: tools.map(serialize),
    helpItems: helpItems.map(serialize),
    helpFaqGroups: helpFaqGroups.map(serialize),
    helpFaqItems: helpFaqItems.map(serialize),
    helpTutorialSteps: helpTutorialSteps.map(serialize),
    helpContact: helpContact.map(serialize),
    projectTools: projectTools.map(serialize),
    sonarqubeConfigs: sonarqubeConfigs.map(serialize),
    sonarqubeScans: sonarqubeScans.map(serialize),
    sonarqubeIssues: sonarqubeIssues.map(serialize),
    auditLogs: auditLogs.map(serialize),
  });
}
