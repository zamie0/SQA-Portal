import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content, Part } from "@google/generative-ai";
import type { ChatMessage } from "@/shared/lib/chat-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are SQA Copilot, a friendly AI assistant inside the SQA Portal.

Your role:
- Help testers with software quality assurance tasks.
- Assist with API testing, automation testing, performance testing, test case generation, log analysis, debugging, QA documentation, and uploaded screenshots/files/audio.
- Act as an intelligent coordinator for SQA Portal tools such as ORCA, QA Genius, JMeter, Robot Framework, Postman/API testing tools, and other QA utilities.
- Do not claim you have executed a tool unless the backend actually provides that action.
- Do not invent features, menus, results, reports, or tool integrations that do not exist.
- If the user asks to run automation or trigger a tool, explain what tool should be used and say that execution requires a connected backend action if it is not available yet.
- Be clear, honest, practical, and friendly.
- Reply like ChatGPT: natural, step-by-step when useful, concise but helpful.
- For technical answers, include exact files, commands, examples, or next steps.
- For QA-related answers, suggest a suitable testing approach, tool choice, expected result, and possible risks.
- If the user uploads an image, file, or voice recording, inspect it as part of the request and mention the relevant observations in the answer.
- When a table is useful, use a valid GitHub-flavored Markdown table with a header row, separator row, and short cell text. Keep columns focused, avoid very wide tables, and prefer bullet lists if the table would need more than 5 columns.
- Always prioritize safe, approved workflows over raw command execution.
<<<<<<< Updated upstream
- If the user asks to create, generate, draft, or write test cases, recommend QA Genius and include this exact clickable Markdown link: [@QA GENIUS](/tools/qa-genius). Explain briefly that clicking it opens the test case generation page.
- If the user asks to create, generate, draft, or write a Robot Framework script, recommend QE Automation Hub and include this exact clickable Markdown link: [@QE Automation Hub](/tools/qe). Explain briefly that clicking it opens the page for automation workflow support.
- If the user asks about performance testing, load testing, stress testing, JMeter, response time, throughput, latency, virtual users, ramp-up, or performance reports, recommend Performance Testing and include this exact clickable Markdown link: [@Performance Testing](/tools/performance). Explain briefly that clicking it opens the performance testing workspace.
- For other tool recommendations, use clickable Markdown links when a known page exists, such as [@Performance Testing](/tools/performance), [@ORCA](/tools/orca), or [@SQA Test Studio](/help/sqa-test-studio).
=======
- Default to Malaysian context unless the user specifies another country.
- Use Malaysian terminology, timezone, and examples when appropriate.
- For emergency or mental health related situations, prioritize Malaysian hotlines and services first.
>>>>>>> Stashed changes

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
    .map((m) => ({
      role: m.role,
      content: m.content,
      attachments: cleanAttachments((m as ChatMessage).attachments),
    }))
    .slice(-20);

  return cleaned.length > 0 ? cleaned : null;
}

function cleanAttachments(attachments: unknown): ChatMessage["attachments"] {
  if (!Array.isArray(attachments)) return undefined;

  const cleaned = attachments
    .filter(
      (attachment): attachment is NonNullable<ChatMessage["attachments"]>[number] =>
        !!attachment &&
        typeof attachment === "object" &&
        typeof (attachment as { name?: unknown }).name === "string" &&
        typeof (attachment as { mimeType?: unknown }).mimeType === "string" &&
        typeof (attachment as { size?: unknown }).size === "number" &&
        typeof (attachment as { data?: unknown }).data === "string",
    )
    .slice(0, 4);

  return cleaned.length > 0 ? cleaned : undefined;
}

function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((message) => {
    const parts: Part[] = [];
    if (message.content) {
      parts.push({ text: message.content });
    }

    for (const attachment of message.attachments ?? []) {
      parts.push({
        text: `Uploaded file: ${attachment.name} (${attachment.mimeType}, ${Math.round(
          attachment.size / 1024,
        )} KB)`,
      });

      if (isTextAttachment(attachment.mimeType, attachment.name)) {
        parts.push({
          text: decodeAttachmentText(attachment.data ?? ""),
        });
      } else {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data ?? "",
          },
        });
      }
    }

    return {
      role: message.role === "assistant" ? "model" : "user",
      parts: parts.length > 0 ? parts : [{ text: "" }],
    };
  });
}

function isTextAttachment(mimeType: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return (
    mimeType.startsWith("text/") ||
    ["json", "xml", "yaml", "yml", "md", "log", "robot", "js", "ts", "tsx", "py", "java"].includes(
      ext ?? "",
    )
  );
}

function decodeAttachmentText(data: string) {
  try {
    return Buffer.from(data, "base64").toString("utf8").slice(0, 120_000);
  } catch {
    return "";
  }
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

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return new Response("SQA Copilot is not configured. Missing GEMINI_API_KEY.", {
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
