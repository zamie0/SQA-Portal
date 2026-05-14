import type { ChatMessage } from "@/shared/lib/chat-types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AgentToolResult = {
  tool: "QA Genius" | "QE Automation Hub" | "Performance Test";
  status: "completed" | "setup_required" | "failed" | "skipped";
  message: string;
  data?: unknown;
};

function latestUserMessage(messages: unknown): ChatMessage | null {
  if (!Array.isArray(messages)) return null;

  const cleaned = messages.filter(
    (message): message is ChatMessage =>
      !!message &&
      typeof message === "object" &&
      (message as ChatMessage).role === "user" &&
      typeof (message as ChatMessage).content === "string",
  );

  return cleaned.at(-1) ?? null;
}

function extractUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  if (!match) return null;

  try {
    const url = new URL(match[0]);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function summarizeTestCases(data: unknown) {
  if (!data || typeof data !== "object") return "No structured test cases returned.";
  const testCases = (data as { testCases?: unknown }).testCases;
  if (!Array.isArray(testCases)) return "No structured test cases returned.";
  return `Generated ${testCases.length} test case${testCases.length === 1 ? "" : "s"}.`;
}

function summarizeRobot(data: unknown) {
  if (!data || typeof data !== "object") return "Robot Framework finished.";
  const summary = (data as { summary?: { status?: string; message?: string } }).summary;
  if (summary?.status)
    return `Robot Framework ${summary.status}: ${summary.message ?? "completed."}`;
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" ? message : "Robot Framework finished.";
}

function summarizeJMeter(data: unknown) {
  if (!data || typeof data !== "object") return "JMeter finished.";
  const summary = (
    data as {
      summary?: {
        samples?: number;
        failures?: number;
        averageMs?: number;
        p95Ms?: number;
        throughput?: number | null;
      };
    }
  ).summary;

  if (!summary) {
    const message = (data as { message?: unknown }).message;
    return typeof message === "string" ? message : "JMeter finished.";
  }

  return `JMeter completed ${summary.samples ?? 0} sample${
    summary.samples === 1 ? "" : "s"
  } with ${summary.failures ?? 0} failure${summary.failures === 1 ? "" : "s"}, avg ${
    summary.averageMs ?? "n/a"
  } ms, p95 ${summary.p95Ms ?? "n/a"} ms.`;
}

async function postTool(origin: string, path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  return { ok: response.ok, status: response.status, data };
}

function toolStatus(ok: boolean, status: number): AgentToolResult["status"] {
  if (ok) return "completed";
  if (status === 503) return "setup_required";
  return "failed";
}

function buildReply(objective: string, targetUrl: string | null, results: AgentToolResult[]) {
  const completed = results.filter((result) => result.status === "completed").length;
  const setupRequired = results.filter((result) => result.status === "setup_required").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter((result) => result.status === "skipped").length;

  const lines = [
    `Agentic testing workflow prepared for: ${objective}`,
    targetUrl
      ? `Target tested: ${targetUrl}`
      : "No target URL was provided, so execution tools that need a live URL were skipped.",
    "",
    `Summary: ${completed} completed, ${setupRequired} setup required, ${failed} failed, ${skipped} skipped.`,
    "",
    ...results.map((result) => `- ${result.tool}: ${result.status}. ${result.message}`),
    "",
    "Press Allow in the floating permission prompts below to let SQA Copilot open the related tool workspaces.",
  ];

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response("Invalid payload", { status: 400 });
  }

  const latest = latestUserMessage((body as { messages?: unknown }).messages);
  if (!latest) {
    return new Response("messages must contain a user request", { status: 400 });
  }

  const objective = latest.content.trim();
  const targetUrl = extractUrl(objective);
  const origin = request.nextUrl.origin;
  const results: AgentToolResult[] = [];

  const qa = await postTool(origin, "/api/tools/qa-genius/generate", {
    requirement: objective,
    testType: "Functional",
    priority: "Medium",
    maxTestCases: 5,
  });
  results.push({
    tool: "QA Genius",
    status: toolStatus(qa.ok, qa.status),
    message: qa.ok
      ? summarizeTestCases(qa.data)
      : typeof qa.data === "string"
        ? qa.data
        : "QA Genius could not generate test cases.",
    data: qa.data,
  });

  if (!targetUrl) {
    results.push({
      tool: "QE Automation Hub",
      status: "skipped",
      message: "Provide a valid http or https target URL to run Robot Framework checks.",
    });
    results.push({
      tool: "Performance Test",
      status: "skipped",
      message: "Provide a valid http or https target URL to run JMeter performance checks.",
    });

    return NextResponse.json({ reply: buildReply(objective, targetUrl, results), results });
  }

  const robot = await postTool(origin, "/api/automation/robot", {
    website: targetUrl,
    instruction: objective,
  });
  results.push({
    tool: "QE Automation Hub",
    status: toolStatus(robot.ok, robot.status),
    message: robot.ok
      ? summarizeRobot(robot.data)
      : typeof robot.data === "string"
        ? robot.data
        : summarizeRobot(robot.data),
    data: robot.data,
  });

  const jmeter = await postTool(origin, "/api/performance/jmeter", {
    name: "SQA Copilot Agent Test",
    url: targetUrl,
    method: "GET",
    users: 5,
    rampUp: 5,
    duration: 15,
    instruction: objective,
  });
  results.push({
    tool: "Performance Test",
    status: toolStatus(jmeter.ok, jmeter.status),
    message: jmeter.ok
      ? summarizeJMeter(jmeter.data)
      : typeof jmeter.data === "string"
        ? jmeter.data
        : summarizeJMeter(jmeter.data),
    data: jmeter.data,
  });

  return NextResponse.json({ reply: buildReply(objective, targetUrl, results), results });
}
