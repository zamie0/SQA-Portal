import type { NextRequest } from "next/server";

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response("Invalid payload", { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return new Response("messages must be an array", { status: 400 });
  }

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

  if (cleaned.length === 0) {
    return new Response("messages cannot be empty", { status: 400 });
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return new Response("AI assistant is not configured. Missing LOVABLE_API_KEY.", {
      status: 500,
    });
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cleaned],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      return new Response(
        "The assistant is rate-limited right now. Please try again in a moment.",
        { status: 429 },
      );
    }
    if (res.status === 402) {
      return new Response(
        "AI credits are exhausted. Add credits in Lovable workspace settings to continue.",
        { status: 402 },
      );
    }
    return new Response(
      `AI gateway error (${res.status}): ${text.slice(0, 200) || "unknown error"}`,
      { status: res.status },
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return new Response("Empty response from AI gateway", { status: 500 });
  }

  return new Response(JSON.stringify({ reply }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
