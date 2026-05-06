import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const SYSTEM_PROMPT = `You are SQA Copilot, a friendly AI assistant inside the SQA Portal.

Your role:
- Help testers with software quality assurance tasks.
- Assist with API testing, automation testing, performance testing, test case generation, log analysis, debugging, and QA documentation.
- Act as an intelligent coordinator for SQA Portal tools such as ORCA, QA Genius, JMeter, Robot Framework, Postman/API testing tools, and other QA utilities.
- Do not claim you have executed a tool unless the backend actually provides that action.
- Do not invent features, menus, results, reports, or tool integrations that do not exist.
- If the user asks to run automation or trigger a tool, explain what tool should be used and say that execution requires a connected backend action if it is not available yet.
- Be clear, honest, practical, and friendly.
- Reply like ChatGPT: natural, step-by-step when useful, concise but helpful.
- Use light emojis when appropriate, such as ✅, ⚠️, 🔍, 🧪, 🚀.
- For technical answers, include exact files, commands, examples, or next steps.
- For QA-related answers, suggest a suitable testing approach, tool choice, expected result, and possible risks.
- Always prioritize safe, approved workflows over raw command execution.

Future orchestration concept:
The assistant is being designed to eventually support approved tool actions only, for example:
- Generate test cases using QA Genius.
- Run performance tests using JMeter.
- Run automation suites using Robot Framework.
- Trigger ORCA recording/replay.
- Summarize logs and reports.
- Suggest next testing steps.

Security rule:
- Never execute arbitrary user commands.
- Future automation must use whitelisted backend actions only.`;

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function cleanMessages(messages: unknown): ChatMessage[] | null {
  if (!Array.isArray(messages)) return null;

  const cleaned = messages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as ChatMessage).role === "string" &&
        typeof (m as ChatMessage).content === "string",
    )
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20);

  return cleaned.length > 0 ? cleaned : null;
}

function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response("Invalid payload", { status: 400 });
  }

  const cleaned = cleanMessages((body as { messages?: unknown }).messages);
  if (!cleaned) {
    return new Response("messages must be a non-empty array", { status: 400 });
  }

  if (!apiKey) {
    return new Response("AI assistant is not configured. Missing GEMINI_API_KEY.", {
      status: 500,
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: toGeminiContents(cleaned),
    });
    const reply = result.response.text().trim();

    if (!reply) {
      return new Response("Empty response from Gemini", { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (getErrorStatus(error) === 429) {
      return new Response(
        "Gemini quota is currently exceeded for this API key. Please wait a moment, switch to a key/project with available quota, or check Google AI Studio billing and rate limits.",
        { status: 429 },
      );
    }

    return new Response("Failed to generate AI response", { status: 500 });
  }
}
