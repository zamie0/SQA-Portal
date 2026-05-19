import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import mammoth from "mammoth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AIProviderNotImplementedError,
  generateAIText,
  getConfiguredAIProvider,
  getOpenAIModel,
  getQaGeniusGeminiApiKey,
} from "@/shared/lib/ai-provider";
import {
  normalizeUatTestCases,
  type UatTestCase,
} from "@/modules/tools/qa-genius/lib/uat-test-cases";

type GenerateRequestBody = {
  requirement: string;
  attachments?: RequirementAttachment[];
};

type RequirementAttachment = {
  name: string;
  mimeType: string;
  size: number;
  data: string;
};

type PreparedRequirementAttachments = {
  textSections: string[];
  comparisonTexts: string[];
  inlineParts: Part[];
};

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME_TYPE = "application/msword";

const SYSTEM_PROMPT = `You are QA Genius, a professional SQA engineer for TMR&D / SQA Portal users.

Generate formal UAT test cases from uploaded or pasted URS/SYRS requirement documents. Match the disciplined PRTG/Meraki-style UAT test case format: grouped by relevant system part/module, written for tester execution, and suitable for stakeholder review.

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
- Return a JSON array of test case objects only, already ordered by the relevant parts/modules you identify from the URS/SYRS.
- Each test case object must include these keys:
  - part
  - jiraUserStorySummary
  - tcId
  - testScenario
  - objective
  - testProcedure
  - expectedResults
  - actualResults
  - priority
  - remarks
  - tags

Content rules:
- Decide the best test case coverage, modules/parts, priorities, tags, number of test cases, and scenarios from the URS/SYRS content. Do not depend on user-selected test type, priority, or count.
- Group test cases by meaningful parts/modules derived from the source content, for example Customer Profile, Alarm View, Ticketing, Notification, Report, Admin, or better names when the document implies them.
- The part order does not need to be fixed, but every URS/SYRS requirement must be covered without duplicate filler cases.
- tcId must use TC01, TC02, TC03, and continue sequentially across all parts.
- jiraUserStorySummary must be written per part in this exact style: "As a [user role], I want to [function], so that [benefit]."
- Generate only the keys listed above. Do not add extra metadata or identifier fields.
- testProcedure must be an array of clear numbered-step content. Each step must be executable by a UAT tester.
- expectedResults must be an array of numbered expected outcomes aligned to the procedure.
- actualResults must always be "Not Started".
- priority must be decided from business risk and requirement criticality.
- tags must be an array of concise labels relevant to the module, requirement, risk, or workflow.
- remarks must be an empty string unless the source document provides a useful note or assumption.
- objective must be real and specific to the test scenario. It must explain the exact business behavior or quality risk being verified.
- testScenario must describe the scenario being tested, not just repeat the requirement.
- Include positive, negative, edge, validation, access-control, notification, reporting, integration, usability, or performance cases when relevant to the URS/SYRS.
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

class AttachmentProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentProcessingError";
  }
}

class SourceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceConflictError";
  }
}

function isGenerateRequestBody(body: unknown): body is GenerateRequestBody {
  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as Partial<GenerateRequestBody>;
  return typeof candidate.requirement === "string";
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

function getAttachmentExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isDocxAttachment(attachment: RequirementAttachment) {
  return (
    attachment.mimeType === DOCX_MIME_TYPE || getAttachmentExtension(attachment.name) === "docx"
  );
}

function isLegacyDocAttachment(attachment: RequirementAttachment) {
  return attachment.mimeType === DOC_MIME_TYPE || getAttachmentExtension(attachment.name) === "doc";
}

function isTextRequirementAttachment(attachment: RequirementAttachment) {
  const extension = getAttachmentExtension(attachment.name);
  return (
    attachment.mimeType.startsWith("text/") ||
    ["txt", "md", "csv", "json", "xml", "yaml", "yml"].includes(extension) ||
    ["application/json", "application/xml", "text/xml"].includes(attachment.mimeType)
  );
}

function isGeminiInlineSupportedAttachment(attachment: RequirementAttachment) {
  return (
    attachment.mimeType === "application/pdf" ||
    attachment.mimeType.startsWith("image/") ||
    attachment.mimeType.startsWith("audio/") ||
    attachment.mimeType.startsWith("video/")
  );
}

function decodeAttachmentText(data: string) {
  return Buffer.from(data, "base64").toString("utf8").trim();
}

async function extractDocxText(attachment: RequirementAttachment) {
  const buffer = Buffer.from(attachment.data, "base64");
  const result = await mammoth.extractRawText({ buffer });
  const extractedText = result.value?.trim();

  if (!extractedText) {
    throw new AttachmentProcessingError(
      `Unable to extract text from the uploaded DOCX file "${attachment.name}". Please save it again as DOCX, export it as PDF, or paste the URS/SYRS text directly.`,
    );
  }

  return extractedText;
}

function attachmentLabel(attachment: RequirementAttachment) {
  return `Requirement attachment: ${attachment.name} (${attachment.mimeType}, ${Math.round(
    attachment.size / 1024,
  )} KB)`;
}

async function prepareRequirementAttachments(
  attachments: RequirementAttachment[],
): Promise<PreparedRequirementAttachments> {
  const textSections: string[] = [];
  const comparisonTexts: string[] = [];
  const inlineParts: Part[] = [];

  for (const attachment of attachments) {
    const label = attachmentLabel(attachment);

    if (isDocxAttachment(attachment)) {
      const extractedText = await extractDocxText(attachment);
      textSections.push(`${label}\nDOCX text extracted on the server:\n${extractedText}`);
      comparisonTexts.push(extractedText);
      continue;
    }

    if (isLegacyDocAttachment(attachment)) {
      throw new AttachmentProcessingError(
        `QA Genius cannot read legacy .doc files directly. Please save "${attachment.name}" as .docx or PDF, then upload it again.`,
      );
    }

    if (isTextRequirementAttachment(attachment)) {
      const decodedText = decodeAttachmentText(attachment.data);

      if (!decodedText) {
        throw new AttachmentProcessingError(
          `Unable to read text from "${attachment.name}". Please paste the URS/SYRS content directly or upload a readable text file.`,
        );
      }

      textSections.push(`${label}\n${decodedText}`);
      comparisonTexts.push(decodedText);
      continue;
    }

    if (isGeminiInlineSupportedAttachment(attachment)) {
      inlineParts.push(
        { text: label },
        {
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data,
          },
        },
      );
      continue;
    }

    throw new AttachmentProcessingError(
      `Unsupported requirement file type for "${attachment.name}" (${attachment.mimeType}). Upload TXT, MD, CSV, JSON, XML, PDF, or DOCX files.`,
    );
  }

  return { textSections, comparisonTexts, inlineParts };
}

const sourceComparisonStopWords = new Set([
  "about",
  "above",
  "after",
  "again",
  "against",
  "also",
  "and",
  "are",
  "because",
  "before",
  "being",
  "between",
  "both",
  "case",
  "cases",
  "could",
  "document",
  "each",
  "file",
  "from",
  "generate",
  "have",
  "into",
  "must",
  "need",
  "needs",
  "only",
  "requirement",
  "requirements",
  "shall",
  "should",
  "source",
  "story",
  "system",
  "test",
  "testing",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "this",
  "through",
  "uat",
  "upload",
  "uploaded",
  "user",
  "users",
  "using",
  "when",
  "where",
  "with",
  "will",
  "would",
]);

function stripAttachmentPlaceholderText(value: string) {
  return value
    .replace(
      /\s*Uploaded requirement source:[^\n]*(?:\n(?:File attached\.[^\n]*|Attached document from SQA Copilot\.[^\n]*))*\s*/gi,
      "\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenizeSourceText(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9_-]{2,}/g)
        ?.filter((token) => token.length >= 4 && !sourceComparisonStopWords.has(token)) ?? [],
    ),
  );
}

function hasSharedRequirementIdentifier(left: string, right: string) {
  const identifierPattern = /\b[A-Z][A-Z0-9]+-\d+\b|\b(?:URS|SYRS|REQ|JIRA|EPIC|US)[-_ ]?\d+\b/gi;
  const leftIdentifiers = new Set(
    left.match(identifierPattern)?.map((value) => value.toUpperCase()),
  );
  if (leftIdentifiers.size === 0) return false;

  return (
    right.match(identifierPattern)?.some((value) => leftIdentifiers.has(value.toUpperCase())) ??
    false
  );
}

function sourceSimilarity(left: string, right: string) {
  const leftTokens = tokenizeSourceText(left);
  const rightTokens = tokenizeSourceText(right);

  if (leftTokens.length < 12 || rightTokens.length < 15) {
    return 1;
  }

  const rightTokenSet = new Set(rightTokens);
  const sharedTokenCount = leftTokens.filter((token) => rightTokenSet.has(token)).length;
  return sharedTokenCount / Math.min(leftTokens.length, rightTokens.length);
}

function assertNoObviousSourceConflict({
  userNotes,
  uploadedDocumentText,
}: {
  userNotes: string;
  uploadedDocumentText: string;
}) {
  if (userNotes.length < 180 || uploadedDocumentText.length < 300) return;
  if (hasSharedRequirementIdentifier(userNotes, uploadedDocumentText)) return;

  const similarity = sourceSimilarity(userNotes, uploadedDocumentText);
  if (similarity >= 0.08) return;

  throw new SourceConflictError(
    "The pasted text and uploaded document appear to describe different requirements. Please choose one source, remove the unrelated text, or rewrite the text as clarification for the uploaded document.",
  );
}

function buildSourcePrompt({
  userNotes,
  preparedAttachments,
}: {
  userNotes: string;
  preparedAttachments: PreparedRequirementAttachments;
}) {
  const hasUploadedDocuments =
    preparedAttachments.textSections.length > 0 || preparedAttachments.inlineParts.length > 0;

  if (!hasUploadedDocuments) {
    return `Primary source: pasted URS/SYRS text\n${userNotes}`;
  }

  const uploadedText =
    preparedAttachments.textSections.length > 0
      ? preparedAttachments.textSections.join("\n\n---\n\n")
      : "Uploaded document content is attached to this request as supported Gemini file content.";
  const additionalNotes = userNotes || "None provided.";

  return `Primary source: uploaded requirement document
${uploadedText}

Additional pasted text / user notes:
${additionalNotes}

Source handling rules:
- Treat the uploaded document as the authoritative URS/SYRS source.
- Use pasted text only as clarification, constraints, or Jira notes.
- Do not merge unrelated pasted text with the uploaded document.
- If the pasted text contradicts the uploaded document, prioritize the uploaded document and include the concern in Remarks only when it affects a specific test case.`;
}

function parseGeminiJsonObject(rawText: string): Record<string, unknown> | null {
  const cleanedText = cleanGeminiText(rawText);

  try {
    const parsed = JSON.parse(cleanedText) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const start = cleanedText.indexOf("{");
    const end = cleanedText.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) return null;

    try {
      const parsed = JSON.parse(cleanedText.slice(start, end + 1)) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}

async function assertNoInlineSourceConflict({
  apiKey,
  modelName,
  userNotes,
  inlineParts,
}: {
  apiKey?: string;
  modelName: string;
  userNotes: string;
  inlineParts: Part[];
}) {
  if (!apiKey || userNotes.length < 180 || inlineParts.length === 0) return;

  const conflictPrompt = `Compare the pasted text with the uploaded requirement document.

Pasted text:
${userNotes}

Return only JSON with this exact shape:
{"conflict": boolean, "reason": string}

Set conflict to true only when the pasted text and uploaded document clearly describe different products, modules, workflows, or business requirements. Set conflict to false when the pasted text looks like notes, Jira context, clarification, or a partial summary of the uploaded document.`;

  const rawCheck = (
    await new GoogleGenerativeAI(apiKey)
      .getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      })
      .generateContent([{ text: conflictPrompt }, ...inlineParts])
  ).response
    .text()
    .trim();
  const parsedCheck = parseGeminiJsonObject(rawCheck);

  if (parsedCheck?.conflict !== true) return;

  const reason = typeof parsedCheck.reason === "string" ? parsedCheck.reason.trim() : "";
  throw new SourceConflictError(
    reason
      ? `The pasted text and uploaded document appear to describe different requirements: ${reason}. Please choose one source, remove the unrelated text, or rewrite the text as clarification for the uploaded document.`
      : "The pasted text and uploaded document appear to describe different requirements. Please choose one source, remove the unrelated text, or rewrite the text as clarification for the uploaded document.",
  );
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

function isUnsupportedMimeTypeError(error: unknown) {
  return getErrorText(error).toLowerCase().includes("unsupported mime type");
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

function normalizeTestCases(value: unknown, requirement: string): UatTestCase[] {
  const testCases = normalizeUatTestCases(value, requirement);

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

  const requirementAttachments = cleanRequirementAttachments(body.attachments);
  const requirement = body.requirement.trim();
  if (!requirement && requirementAttachments.length === 0) {
    return new Response("Requirement text or an uploaded requirement document is required.", {
      status: 400,
    });
  }

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

    const preparedAttachments = await prepareRequirementAttachments(requirementAttachments);
    const userNotes =
      requirementAttachments.length > 0 ? stripAttachmentPlaceholderText(requirement) : requirement;
    const uploadedDocumentText = preparedAttachments.comparisonTexts.join("\n\n");

    assertNoObviousSourceConflict({
      userNotes,
      uploadedDocumentText,
    });

    if (provider === "gemini") {
      await assertNoInlineSourceConflict({
        apiKey,
        modelName: modelConfig.modelName,
        userNotes,
        inlineParts: preparedAttachments.inlineParts,
      });
    }

    const sourceContent = buildSourcePrompt({
      userNotes,
      preparedAttachments,
    });
    const prompt = `URS/SYRS source content:
${sourceContent}

Generate a complete formal UAT test case table from this source.
Decide the relevant coverage, modules/parts, priority, tags, number of test cases, and test scenarios based on the URS/SYRS content.
Use the exact JSON keys required by the system prompt so the UI can render these columns in order:
Jira User Story Summary, TC ID, Test Scenario, Objective, Test Procedure, Expected Results, Actual Results, Priority, Remarks, Tags.
${
  requirementAttachments.length > 0
    ? "Use the uploaded requirement/scenario document content as source material. DOCX and text files have already been extracted into prompt text. PDF and supported media attachments may be provided as file content."
    : ""
}`;

    const parts: Part[] = [{ text: prompt }, ...preparedAttachments.inlineParts];

    const reply =
      provider === "gemini" && preparedAttachments.inlineParts.length > 0
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
    const testCases = normalizeTestCases(parsed, sourceContent);

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

    if (error instanceof AttachmentProcessingError) {
      return new Response(error.message, { status: 400 });
    }

    if (error instanceof SourceConflictError) {
      return new Response(error.message, { status: 409 });
    }

    if (isUnsupportedMimeTypeError(error)) {
      console.warn("QA Genius unsupported attachment MIME type:", {
        status: getErrorStatus(error),
        message: getErrorText(error),
      });

      return new Response(
        "QA Genius could not process one of the uploaded file types. Upload TXT, MD, CSV, JSON, XML, PDF, or DOCX files. DOCX files are extracted as text before generation.",
        { status: 400 },
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
