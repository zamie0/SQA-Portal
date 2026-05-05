import { createServerFn } from "@tanstack/react-start";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const SYSTEM_PROMPT = `You are the QE Automation Hub assistant — an in-app guide for QA engineers using a web platform that organizes test automation suites and RPA bots.

The product has these main areas:
- Dashboard: KPIs, pass-rate trend, recent activity.
- Projects: folder-style workspaces. Two project types — "Test Automation" (Playwright / Cypress / Selenium / Robot Framework / Python) and "RPA" (visual flow builder).
- Project workspace tabs: Overview, Test Cases, API Testing, Scripts (or RPA Builder), Mobile, Web & Suites, Execution, Results, Discussion, Settings.
- Runs: global execution log with filters and triggers (Manual / Scheduled / CI/CD).
- Schedule: cron-style scheduling for suites and bots.
- Settings: team roles (Admin / QE / Viewer), CI/CD integrations (Jenkins, GitHub Actions, GitLab CI), environment variables.

Guidelines:
- Be concise, friendly, and practical. Default to short answers (≤4 short paragraphs) with small bullet lists when helpful.
- Use Markdown: **bold** for UI labels, \`code\` for file names and identifiers, bullet lists for steps.
- When a user asks "how do I X", give numbered steps that match the actual UI tabs above.
- If a question is outside QE / testing / this product, answer briefly and steer back to QE topics.
- Never invent features that don't exist. If unsure, say so and suggest the closest existing tab.`;

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
      .slice(-20); // cap context
    if (cleaned.length === 0) throw new Error("messages cannot be empty");
    return { messages: cleaned };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI assistant is not configured. Missing LOVABLE_API_KEY.");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error("The assistant is rate-limited right now. Please try again in a moment.");
      }
      if (res.status === 402) {
        throw new Error(
          "AI credits are exhausted. Add credits in Lovable workspace settings to continue.",
        );
      }
      throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200) || "unknown error"}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty response from AI gateway");
    return { reply };
  });
