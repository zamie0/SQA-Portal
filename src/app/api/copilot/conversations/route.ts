import { getMongoDb } from "@/shared/lib/mongodb";
import type { ChatMessage } from "@/shared/lib/chat-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CopilotConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Array<ChatMessage & { id: string; pending?: boolean }>;
};

type CopilotMemory = {
  _id: string;
  userId: string;
  activeId: string;
  conversations: CopilotConversation[];
  updatedAt: number;
};

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function cleanMessage(value: unknown): CopilotConversation["messages"][number] | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const role = raw.role === "user" || raw.role === "assistant" ? raw.role : null;
  const content = cleanString(raw.content);
  const id = cleanString(raw.id);

  if (!role || !id) return null;

  return {
    id,
    role,
    content,
    pending: raw.pending === true,
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments
          .filter((attachment) => attachment && typeof attachment === "object")
          .map((attachment) => {
            const rawAttachment = attachment as Record<string, unknown>;
            return {
              name: cleanString(rawAttachment.name, "attachment"),
              mimeType: cleanString(rawAttachment.mimeType, "application/octet-stream"),
              size: typeof rawAttachment.size === "number" ? rawAttachment.size : 0,
              pdfReview:
                rawAttachment.pdfReview &&
                typeof rawAttachment.pdfReview === "object" &&
                (rawAttachment.pdfReview as Record<string, unknown>).status === "completed"
                  ? {
                      status: "completed" as const,
                      summary: cleanString(
                        (rawAttachment.pdfReview as Record<string, unknown>).summary,
                      ).slice(0, 12_000),
                      reviewedAt: cleanString(
                        (rawAttachment.pdfReview as Record<string, unknown>).reviewedAt,
                      ),
                    }
                  : rawAttachment.pdfReview &&
                      typeof rawAttachment.pdfReview === "object" &&
                      (rawAttachment.pdfReview as Record<string, unknown>).status === "failed"
                    ? {
                        status: "failed" as const,
                        error: cleanString(
                          (rawAttachment.pdfReview as Record<string, unknown>).error,
                          "PDF could not be reviewed.",
                        ).slice(0, 500),
                        reviewedAt: cleanString(
                          (rawAttachment.pdfReview as Record<string, unknown>).reviewedAt,
                        ),
                      }
                    : undefined,
            };
          })
          .slice(0, 8)
      : undefined,
  };
}

function cleanConversation(value: unknown): CopilotConversation | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = cleanString(raw.id);
  if (!id) return null;

  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .map(cleanMessage)
        .filter((message): message is NonNullable<typeof message> => !!message)
    : [];

  return {
    id,
    title: cleanString(raw.title, "New chat").slice(0, 80),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: Date.now(),
    messages: messages.slice(-80),
  };
}

async function collection() {
  const db = await getMongoDb();
  return db.collection<CopilotMemory>("copilot_conversations");
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) return new Response("Missing userId", { status: 400 });

  const memory = await (await collection()).findOne({ userId });

  return NextResponse.json({
    activeId: memory?.activeId ?? "",
    conversations: memory?.conversations ?? [],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return new Response("Invalid payload", { status: 400 });

  const raw = body as Record<string, unknown>;
  const userId = cleanString(raw.userId);
  const activeId = cleanString(raw.activeId);

  if (!userId) return new Response("Missing userId", { status: 400 });

  const conversations = Array.isArray(raw.conversations)
    ? raw.conversations
        .map(cleanConversation)
        .filter((conversation): conversation is CopilotConversation => !!conversation)
        .slice(0, 30)
    : [];

  await (
    await collection()
  ).updateOne(
    { userId },
    {
      $set: {
        userId,
        activeId: activeId || conversations[0]?.id || "",
        conversations,
        updatedAt: Date.now(),
      },
      $setOnInsert: {
        _id: `copilot-${userId}`,
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
