import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "@/shared/lib/chat-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You create concise chat titles for SQA Copilot conversations.

Rules:
- Return only the title text.
- Use 3 to 7 words.
- Make it specific to the discussion topic.
- Prefer software QA, testing, requirements, bug, automation, or performance terminology when relevant.
- Do not use quotes, markdown, emojis, punctuation-heavy labels, or generic titles like "New chat".`;

function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (message): message is ChatMessage =>
        !!message &&
        typeof message === "object" &&
        ((message as ChatMessage).role === "user" ||
          (message as ChatMessage).role === "assistant") &&
        typeof (message as ChatMessage).content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4_000),
    }))
    .filter((message) => message.content)
    .slice(-8);
}

function cleanTitle(value: string) {
  return value
    .replace(/^[#*\-"'\s]+|[#*\-"'\s.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

function titleCase(value: string) {
  const smallWords = new Set([
    "a",
    "an",
    "and",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
  ]);
  return value
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && smallWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function fallbackTitle(messages: ChatMessage[]) {
  const text = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ")
    .toLowerCase();

  const topicRules: Array<[RegExp, string]> = [
    [/pdf|requirement document|specification|document summary/, "PDF Requirement Review"],
    [/test case|test cases|scenario|qa genius/, "Test Case Generation"],
    [/bug|defect|issue|jira/, "Bug Report Drafting"],
    [/robot framework|automation script|selenium|playwright|cypress/, "Automation Script Help"],
    [/performance|jmeter|load test|stress test|throughput|latency/, "Performance Testing Plan"],
    [/api|postman|endpoint|request|response/, "API Testing Discussion"],
    [/security|vulnerability|auth|permission|access control/, "Security Testing Review"],
    [/agentic|run all tests|do testing/, "Agentic Testing Workflow"],
  ];

  const matched = topicRules.find(([pattern]) => pattern.test(text));
  if (matched) return matched[1];

  const firstUserMessage = messages.find((message) => message.role === "user")?.content ?? "";
  const words = firstUserMessage
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) => word.length > 2 && !/^(please|help|want|need|this|that|with|from)$/i.test(word),
    )
    .slice(0, 5)
    .join(" ");

  return cleanTitle(titleCase(words)) || "SQA Discussion";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return new Response("Invalid payload", { status: 400 });

  const messages = cleanMessages((body as { messages?: unknown }).messages);
  if (messages.length === 0)
    return new Response("messages must be a non-empty array", { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!apiKey) {
    return NextResponse.json({ title: fallbackTitle(messages) });
  }

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.15 },
    });

    const transcript = messages
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n\n");
    const result = await model.generateContent(
      `Create a relevant title for this conversation:\n\n${transcript}`,
    );
    const title = cleanTitle(result.response.text());
    const fallback = fallbackTitle(messages);

    return NextResponse.json({ title: title || fallback });
  } catch (error) {
    console.warn("SQA Copilot title generation failed:", error);
    return NextResponse.json({ title: fallbackTitle(messages) });
  }
}
