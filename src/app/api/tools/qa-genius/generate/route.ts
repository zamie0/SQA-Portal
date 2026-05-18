import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AIProviderNotImplementedError,
  generateAIText,
  getConfiguredAIProvider,
  getOpenAIModel,
  getQaGeniusGeminiApiKey,
} from "@/shared/lib/ai-provider";

type GenerateRequestBody = {
  requirement: string;
  testType: string;
  priority: string;
  maxTestCases: number;
  attachments?: RequirementAttachment[];
};

type RequirementAttachment = {
  name: string;
  mimeType: string;
  size: number;
  data: string;
};

type GeneratedTestCase = {
  id: string;
  testScenario: string;
  objective: string;
  testProcedure: string[];
  expectedResults: string[];
  title: string;
  description: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: string;
  testType: string;
  category: string;
};

const SYSTEM_PROMPT = `You are QA Genius, a professional SQA engineer for TMR&D / SQA Portal users.

Generate realistic, practical, audit-ready QA test cases from the provided requirement. Think like an experienced software quality engineer in a Malaysian workplace context when the requirement does not specify another context.

Critical output rules:
- Return ONLY raw JSON.
- The entire response must be one JSON array.
- Do not use markdown.
- Do not use \`\`\`json fences.
- Do not use \`\`\` fences.
- Do not include explanations, notes, summaries, prose, or headings.
- Do not include any text before or after the JSON array.
- The response must be directly parseable by JSON.parse.
- Use double-quoted JSON strings only.
- Do not include placeholder, dummy, lorem ipsum, or generic filler content.

JSON shape:
- Return a JSON array of test case objects only.
- Each test case must include:
  - id
  - testScenario
  - objective
  - testProcedure
  - expectedResults
  - priority
  - testType
- testProcedure must be an array of clear executable strings.
- expectedResults must be an array of observable outcomes.
- Use IDs in this format: TC-001, TC-002, TC-003.
- Match the requested test type and priority.
- objective must be real and specific to the test scenario. It must explain the exact quality risk or behavior being verified.
- testScenario must describe the scenario being tested, not just repeat the requirement.
- Include positive, negative, edge, validation, security, API, usability, compatibility, or performance cases when relevant to the requirement and requested test type.
- Keep each test case concise enough for execution, but detailed enough that another tester can run it without guessing.
- Do not claim automation, backend tools, reports, or environments were executed. Generate test design only.`;

function getQaGeniusModelConfig() {
  if (process.env.QAGENIUS_GEMINI_MODEL) {
    return {
      modelName: process.env.QAGENIUS_GEMINI_MODEL,
      source: "QAGENIUS_GEMINI_MODEL",
      fallbackBehavior: "Using QA Genius dedicated Gemini model.",
    };
  }

  if (process.env.GEMINI_MODEL) {
    return {
      modelName: process.env.GEMINI_MODEL,
      source: "GEMINI_MODEL",
      fallbackBehavior: "QAGENIUS_GEMINI_MODEL is not set. Falling back to shared GEMINI_MODEL.",
    };
  }

  return {
    modelName: "gemma-3-12b-it",
    source: "default",
    fallbackBehavior:
      "QAGENIUS_GEMINI_MODEL and GEMINI_MODEL are not set. Falling back to default model.",
  };
}

class GeminiJsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiJsonParseError";
  }
}

function isGenerateRequestBody(body: unknown): body is GenerateRequestBody {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Partial<GenerateRequestBody>;
  return (
    typeof candidate.requirement === "string" &&
    typeof candidate.testType === "string" &&
    typeof candidate.priority === "string" &&
    typeof candidate.maxTestCases === "number" &&
    Number.isFinite(candidate.maxTestCases)
  );
}

function cleanRequirementAttachments(value: unknown): RequirementAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (attachment): attachment is RequirementAttachment =>
        !!attachment &&
        typeof attachment === "object" &&
        typeof (attachment as RequirementAttachment).name === "string" &&
        typeof (attachment as RequirementAttachment).mimeType === "string" &&
        typeof (attachment as RequirementAttachment).size === "number" &&
        typeof (attachment as RequirementAttachment).data === "string",
    )
    .filter((attachment) => attachment.data && attachment.size <= 8 * 1024 * 1024)
    .slice(0, 4);
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isInvalidModelError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorText(error).toLowerCase();

  return (
    status === 400 ||
    status === 404 ||
    message.includes("model not found") ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("invalid model")
  );
}

function isQuotaError(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorText(error).toLowerCase();

  return (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted")
  );
}

function isRetryableGeminiError(error: unknown) {
  const status = getErrorStatus(error);
  return status === 503 || status === 504;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function generateContentWithRetry({
  apiKey,
  modelName,
  prompt,
  provider,
}: {
  apiKey?: string;
  modelName: string;
  prompt: string;
  provider: ReturnType<typeof getConfiguredAIProvider>;
}) {
  const retryDelays = [700, 1400];
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      return await generateAIText({
        provider,
        apiKey,
        model: modelName,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: prompt,
        responseMimeType: "application/json",
        temperature: 0.35,
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === retryDelays.length) {
        throw error;
      }

      console.warn("QA Genius Gemini retryable error. Retrying request.", {
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
        status: getErrorStatus(error),
        message: getErrorText(error),
      });

      await delay(retryDelays[attempt]);
    }
  }

  throw lastError;
}

function cleanGeminiText(rawText: string) {
  return rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getJsonArrayCandidates(cleanedText: string) {
  const candidates: string[] = [];

  if (cleanedText.startsWith("[") && cleanedText.endsWith("]")) {
    candidates.push(cleanedText);
  }

  const regexMatches = cleanedText.match(/\[[\s\S]*\]/g);
  if (regexMatches) {
    candidates.push(...regexMatches);
  }

  const start = cleanedText.indexOf("[");
  const end = cleanedText.lastIndexOf("]");

  if (start !== -1 && end !== -1 && end > start) {
    candidates.push(cleanedText.slice(start, end + 1));
  }

  return uniqueStrings(candidates);
}

function parseGeminiJsonArray(rawText: string): unknown[] {
  console.debug("QA Genius raw Gemini text:", rawText);

  const cleanedText = cleanGeminiText(rawText);
  console.debug("QA Genius cleaned Gemini text:", cleanedText);

  const candidates = getJsonArrayCandidates(cleanedText);
  const parseErrors: string[] = [];

  for (const candidate of candidates) {
    try {
      console.debug("QA Genius JSON parse candidate:", candidate);
      const parsed = JSON.parse(candidate) as unknown;

      if (!Array.isArray(parsed)) {
        parseErrors.push("Parsed JSON was not an array.");
        continue;
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      parseErrors.push(message);
      console.error("QA Genius JSON parsing error:", message);
    }
  }

  console.error("QA Genius JSON parsing failed. Errors:", parseErrors);
  throw new GeminiJsonParseError(
    "Gemini returned a response that could not be parsed as a JSON array. Please try generating again.",
  );
}

function toStringArray(value: unknown, fallback: string): string[] {
  if (Array.isArray(value)) {
    const steps = value
      .map((step) => {
        if (typeof step === "string") return step;
        if (step === null || step === undefined) return "";
        return String(step);
      })
      .map((step) => step.trim())
      .filter(Boolean);

    return steps.length > 0 ? steps : [fallback];
  }

  if (typeof value === "string" && value.trim()) {
    const steps = value
      .split(/\r?\n|(?:^|\s)\d+\.\s+/)
      .map((step) => step.trim())
      .filter(Boolean);

    return steps.length > 0 ? steps : [fallback];
  }

  return [fallback];
}

function toRequiredString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

function isWeakObjective(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("dummy") ||
    normalized.includes("placeholder") ||
    normalized.includes("generated objective") ||
    normalized.includes("ai-generated") ||
    normalized === "objective" ||
    normalized === "test objective" ||
    normalized.length < 24
  );
}

function summarizeRequirement(requirement: string) {
  return requirement.replace(/\s+/g, " ").trim().slice(0, 160);
}

function normalizeTestCases(
  value: unknown,
  requirement: string,
  requestedTestType: string,
  requestedPriority: string,
): GeneratedTestCase[] {
  if (!Array.isArray(value)) {
    throw new Error("Gemini response was not an array.");
  }

  const requirementSummary = summarizeRequirement(requirement);

  const testCases = value
    .filter((item) => item && typeof item === "object")
    .map((item, index): GeneratedTestCase => {
      if (!item || typeof item !== "object") {
        throw new Error("Gemini returned an invalid test case item.");
      }

      const candidate = item as Record<string, unknown>;
      const id =
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.trim()
          : `TC-${String(index + 1).padStart(3, "0")}`;
      const testType = toRequiredString(
        candidate.testType ?? candidate.category,
        requestedTestType,
      );
      const priority = toRequiredString(candidate.priority, requestedPriority);
      const testScenario = toRequiredString(
        candidate.testScenario ?? candidate.title ?? candidate.scenario,
        `${testType} scenario for ${requirementSummary}`,
      );
      const candidateObjective = toRequiredString(candidate.objective ?? candidate.description, "");
      const objective =
        candidateObjective && !isWeakObjective(candidateObjective)
          ? candidateObjective
          : `Verify ${testScenario.toLowerCase()} so the requirement is met reliably for SQA Portal users.`;
      const testProcedure = toStringArray(
        candidate.testProcedure ?? candidate.steps ?? candidate.testSteps,
        `Execute the ${testScenario.toLowerCase()} flow using valid test data.`,
      );
      const expectedResults = toStringArray(
        candidate.expectedResults ?? candidate.expectedResult,
        `The ${testScenario.toLowerCase()} outcome satisfies the stated requirement without errors or unexpected side effects.`,
      );
      const preconditions = toRequiredString(
        candidate.preconditions,
        "Relevant access, environment, and test data are available.",
      );

      return {
        id,
        testScenario,
        objective,
        testProcedure,
        expectedResults,
        priority,
        testType,
        title: testScenario,
        description: objective,
        preconditions,
        steps: testProcedure,
        expectedResult: expectedResults.join("\n"),
        category: testType,
      };
    });

  if (testCases.length === 0) {
    throw new Error("Gemini returned no test cases.");
  }

  return testCases;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!isGenerateRequestBody(body)) {
    return new Response("Invalid payload", { status: 400 });
  }

  const requirement = body.requirement.trim();
  if (!requirement) {
    return new Response("Requirement is required.", { status: 400 });
  }

  const maxTestCases = Math.min(Math.max(Math.round(body.maxTestCases), 1), 20);

  try {
    const provider = getConfiguredAIProvider();
    const modelConfig =
      provider === "gemini"
        ? getQaGeniusModelConfig()
        : {
            modelName: getOpenAIModel(),
            source: "OPENAI_MODEL",
            fallbackBehavior:
              "AI_PROVIDER=openai is selected, but OpenAI generation is not active yet.",
          };
    const apiKey = provider === "gemini" ? getQaGeniusGeminiApiKey() : undefined;

    if (provider === "gemini" && !apiKey) {
      return new Response(
        "QA Genius is not configured. Add QAGENIUS_GEMINI_API_KEY or GEMINI_API_KEY to the server environment.",
        { status: 500 },
      );
    }

    console.info("QA Genius AI provider selected:", {
      provider,
      model: modelConfig.modelName,
      source: modelConfig.source,
      fallbackBehavior: modelConfig.fallbackBehavior,
    });

    const requirementAttachments = cleanRequirementAttachments(body.attachments);
    const prompt = `Requirement:
${requirement}

Requested test type: ${body.testType}
Requested priority: ${body.priority}
Maximum number of test cases: ${maxTestCases}

Return exactly ${maxTestCases} test cases unless the requirement cannot reasonably support that many.
${
  requirementAttachments.length > 0
    ? "Use the attached requirement/scenario document files as source material. For PDFs or scanned documents, extract visible text from the document content before generating test cases."
    : ""
}`;

    const parts: Part[] = [
      { text: prompt },
      ...requirementAttachments.flatMap((attachment) => [
        {
          text: `Requirement attachment: ${attachment.name} (${attachment.mimeType}, ${Math.round(
            attachment.size / 1024,
          )} KB)`,
        },
        {
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data,
          },
        },
      ]),
    ];

    const reply =
      provider === "gemini" && parts.length > 1
        ? (
            await new GoogleGenerativeAI(apiKey ?? "")
              .getGenerativeModel({
                model: modelConfig.modelName,
                systemInstruction: SYSTEM_PROMPT,
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.35,
                },
              })
              .generateContent(parts)
          ).response
            .text()
            .trim()
        : await generateContentWithRetry({
            apiKey,
            modelName: modelConfig.modelName,
            prompt,
            provider,
          });

    if (!reply) {
      return new Response("Empty response from AI provider", { status: 500 });
    }

    const parsed = parseGeminiJsonArray(reply);
    const testCases = normalizeTestCases(parsed, requirement, body.testType, body.priority);

    return NextResponse.json({ testCases });
  } catch (error) {
    console.error("QA Genius Gemini API Error:", error);

    if (error instanceof AIProviderNotImplementedError) {
      return new Response(
        "AI_PROVIDER=openai is reserved for future OpenAI/Codex Enterprise migration and is not active yet. Set AI_PROVIDER=gemini to continue using QA Genius.",
        { status: 501 },
      );
    }

    if (isQuotaError(error)) {
      console.error("QA Genius Gemini quota-related error:", {
        status: getErrorStatus(error),
        message: getErrorText(error),
      });

      return new Response(
        "QA Genius Gemini quota has been exceeded for the configured API key. Please wait, use QAGENIUS_GEMINI_API_KEY with available quota, or check the Google AI Studio project limits.",
        { status: 429 },
      );
    }

    if (isInvalidModelError(error)) {
      const modelConfig = getQaGeniusModelConfig();
      console.warn("QA Genius Gemini model unavailable after fallback resolution:", {
        model: modelConfig.modelName,
        source: modelConfig.source,
        fallbackBehavior: modelConfig.fallbackBehavior,
        status: getErrorStatus(error),
        message: getErrorText(error),
      });

      return new Response(
        `The configured Gemini model "${modelConfig.modelName}" is invalid or unavailable for this API key. Update QAGENIUS_GEMINI_MODEL or GEMINI_MODEL to a supported model.`,
        { status: 400 },
      );
    }

    if (getErrorStatus(error) === 503 || getErrorStatus(error) === 504) {
      return new Response(
        "Gemini is temporarily unavailable or experiencing high demand. Please wait a moment and try generating again.",
        { status: 503 },
      );
    }

    if (error instanceof GeminiJsonParseError) {
      return new Response(error.message, { status: 502 });
    }

    return new Response(
      "QA Genius could not generate valid structured test cases. Please try again with a clearer requirement.",
      { status: 500 },
    );
  }
}
