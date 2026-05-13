import { randomUUID } from "node:crypto";
import { getMongoDb } from "@/shared/lib/mongodb";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "approve"
  | "reject"
  | "security"
  | "request"
  | "other";

export type AuditStatus = "success" | "failed" | "blocked";

type AuditInput = {
  actorId?: string | null;
  targetUserId?: string | null;
  action: AuditAction;
  objectType: string;
  objectId?: string;
  objectName?: string;
  message: string;
  category?: string;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
};

type AuditDocument = Required<Omit<AuditInput, "actorId" | "targetUserId" | "metadata">> & {
  _id: string;
  actorId: string | null;
  targetUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
};

export async function writeAuditLog(input: AuditInput) {
  const db = await getMongoDb();
  await db.collection<AuditDocument>("audit_logs").insertOne({
    _id: randomUUID(),
    actorId: input.actorId ?? null,
    targetUserId: input.targetUserId ?? null,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId ?? "",
    objectName: input.objectName ?? "",
    message: input.message,
    category: input.category ?? "system",
    status: input.status ?? "success",
    metadata: input.metadata ?? {},
    createdAt: Date.now(),
  });
}
