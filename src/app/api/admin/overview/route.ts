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
    projectTools: projectTools.map(serialize),
    sonarqubeConfigs: sonarqubeConfigs.map(serialize),
    sonarqubeScans: sonarqubeScans.map(serialize),
    sonarqubeIssues: sonarqubeIssues.map(serialize),
    auditLogs: auditLogs.map(serialize),
  });
}
