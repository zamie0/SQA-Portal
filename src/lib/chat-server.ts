import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content } from "@google/generative-ai";
import { createServerFn } from "@tanstack/react-start";
import type { ChatMessage } from "@/lib/chat-types";

const SYSTEM_PROMPT = `You are the QE Automation Hub assistant - an in-app guide for QA engineers using a web platform that organizes test automation suites and RPA bots.

The product has these main areas:
- Dashboard: KPIs, pass-rate trend, recent activity.
- Projects: folder-style workspaces. Two project types - "Test Automation" (Playwright / Cypress / Selenium / Robot Framework / Python) and "RPA" (visual flow builder).
- Project workspace tabs: Overview, Test Cases, API Testing, Scripts (or RPA Builder), Mobile, Web & Suites, Execution, Results, Discussion, Settings.
- Runs: global execution log with filters and triggers (Manual / Scheduled / CI/CD).
- Schedule: cron-style scheduling for suites and bots.
- Settings: team roles (Admin / QE / Viewer), CI/CD integrations (Jenkins, GitHub Actions, GitLab CI), environment variables.

Guidelines:
- Be concise, friendly, and practical. Default to short answers with small bullet lists when helpful.
- Use Markdown: **bold** for UI labels, \`code\` for file names and identifiers, bullet lists for steps.
- When a user asks "how do I X", give numbered steps that match the actual UI tabs above.
- If a question is outside QE / testing / this product, answer briefly and steer back to QE topics.
- Never invent features that don't exist. If unsure, say so and suggest the closest existing tab.`;

function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("Invalid payload");
    const { messages } = data as { messages?: unknown };
    if (!Array.isArray(messages)) throw new Error("messages must be an array");
    const cleaned: ChatMessage[] = messages
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m === "object" &&
          typeof (m as ChatMessage).role === "string" &&
          typeof (m as ChatMessage).content === "string",
      )
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20);
    if (cleaned.length === 0) throw new Error("messages cannot be empty");
    return { messages: cleaned };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
      throw new Error("SQA Copilot is not configured. Missing GEMINI_API_KEY.");
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await model.generateContent({
        contents: toGeminiContents(data.messages),
      });
      const reply = result.response.text().trim();

      if (!reply) throw new Error("Empty response from Gemini");
      return { reply };
    } catch (error) {
      const status =
        error &&
        typeof error === "object" &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined;

      if (status === 429) {
        throw new Error(
          "Gemini quota is currently exceeded for this API key. Please try again later.",
        );
      }

      throw new Error("Failed to generate Gemini response");
    }
  });
