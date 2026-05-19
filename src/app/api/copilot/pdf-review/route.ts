import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { inflateSync } from "node:zlib";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const MAX_OCR_PAGES = 6;

const SYSTEM_PROMPT = `You are SQA Copilot's PDF reviewer for software quality teams.

Read the uploaded PDF content and produce a clear, reusable testing-context summary.
Focus on requirements, scope, business rules, workflows, acceptance criteria, test evidence, defects, risks, environments, integrations, constraints, and open questions.
Support requirement documents, test reports, specifications, and similar QA PDFs.
If the PDF appears scanned or unreadable, say that the document could not be read clearly.
Keep the output concise but specific enough for test case generation, bug report generation, and QA assistant follow-up.

Return Markdown only using this exact structure:

## Document Snapshot
- **Type:** ...
- **Purpose:** ...
- **Audience/System:** ...

## Key Points
- ...

## Testable Requirements
- ...

## QA Risks and Edge Cases
- ...

## Data, Environment, and Dependencies
- ...

## Open Questions
- ...

## Reusable Context
One short paragraph other SQA tools can use as context.

Rules:
- Keep bullets short and specific.
- Use "Not specified" when the PDF does not provide a detail.
- Do not include code fences.
- Do not invent details not supported by the document.`;

type PdfReviewBody = {
  name: string;
  mimeType: string;
  size: number;
  data: string;
};

function isPdfReviewBody(value: unknown): value is PdfReviewBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<PdfReviewBody>;

  return (
    typeof body.name === "string" &&
    typeof body.mimeType === "string" &&
    typeof body.size === "number" &&
    typeof body.data === "string"
  );
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function decodePdfString(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const map: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      return map[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function decodeHexPdfString(value: string) {
  const clean = value.replace(/\s+/g, "");
  const bytes: number[] = [];

  for (let index = 0; index < clean.length; index += 2) {
    const byte = parseInt(clean.slice(index, index + 2).padEnd(2, "0"), 16);
    if (Number.isFinite(byte)) bytes.push(byte);
  }

  const buffer = Buffer.from(bytes);
  const hasUtf16Bom =
    buffer.length >= 2 &&
    ((buffer[0] === 0xfe && buffer[1] === 0xff) || (buffer[0] === 0xff && buffer[1] === 0xfe));

  return hasUtf16Bom ? buffer.toString("utf16le").replace(/^\uFEFF/, "") : buffer.toString("utf8");
}

function extractTextOperators(streamText: string) {
  const chunks: string[] = [];
  const textBlocks = streamText.match(/BT[\s\S]*?ET/g) ?? [];

  for (const block of textBlocks) {
    const literalMatches = block.matchAll(/\((?:\\.|[^\\)])*\)\s*(?:Tj|'|"|TJ)/g);
    for (const match of literalMatches) {
      chunks.push(decodePdfString(match[0].replace(/\)\s*(?:Tj|'|"|TJ).*$/s, "").slice(1)));
    }

    const arrayMatches = block.matchAll(
      /\[((?:\s*(?:\((?:\\.|[^\\)])*\)|<[\da-fA-F\s]+>|-?\d+(?:\.\d+)?)\s*)+)\]\s*TJ/g,
    );
    for (const match of arrayMatches) {
      const arrayBody = match[1] ?? "";
      const strings = Array.from(arrayBody.matchAll(/\((?:\\.|[^\\)])*\)|<[\da-fA-F\s]+>/g)).map(
        ([raw]) =>
          raw.startsWith("<")
            ? decodeHexPdfString(raw.slice(1, -1))
            : decodePdfString(raw.slice(1, -1)),
      );
      chunks.push(strings.join(""));
    }

    const hexMatches = block.matchAll(/<([\da-fA-F\s]+)>\s*Tj/g);
    for (const match of hexMatches) {
      chunks.push(decodeHexPdfString(match[1] ?? ""));
    }
  }

  return chunks.join(" ");
}

function inflatePdfStream(stream: Buffer) {
  try {
    return inflateSync(stream).toString("latin1");
  } catch {
    return stream.toString("latin1");
  }
}

function extractPdfText(base64Data: string) {
  const buffer = Buffer.from(base64Data, "base64");
  const pdfText = buffer.toString("latin1");
  const streamMatches = Array.from(pdfText.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g));
  const chunks: string[] = [];

  for (const match of streamMatches) {
    const streamStart = match.index ?? 0;
    const objectStart = pdfText.lastIndexOf("obj", streamStart);
    const objectHeader = pdfText.slice(Math.max(0, objectStart), streamStart);
    const rawStream = Buffer.from(match[1] ?? "", "latin1");
    const streamText = objectHeader.includes("/FlateDecode")
      ? inflatePdfStream(rawStream)
      : rawStream.toString("latin1");

    const extracted = extractTextOperators(streamText);
    if (extracted.trim()) chunks.push(extracted);
  }

  return chunks
    .join("\n")
    .split(String.fromCharCode(0))
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 120_000);
}

async function ocrImage(imagePath: string) {
  const { stdout } = await execFileAsync(
    "tesseract",
    [imagePath, "stdout", "-l", "eng", "--psm", "6"],
    {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  return stdout.trim();
}

async function extractPdfTextWithOcr(base64Data: string) {
  const [{ createCanvas }, pdfjsLib] = await Promise.all([
    import("@napi-rs/canvas"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);
  const buffer = Buffer.from(base64Data, "base64");
  const tempDir = await mkdtemp(join(tmpdir(), "sqa-pdf-ocr-"));

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    });
    const document = await loadingTask.promise;
    const pageCount = Math.min(document.numPages, MAX_OCR_PAGES);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      } as unknown as Parameters<typeof page.render>[0]).promise;

      const imagePath = join(tempDir, `page-${pageNumber}.png`);
      await writeFile(imagePath, canvas.toBuffer("image/png"));
      const pageText = await ocrImage(imagePath);
      if (pageText) pages.push(`Page ${pageNumber}\n${pageText}`);
    }

    await document.destroy();

    return pages
      .join("\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 120_000);
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }
}

async function summarizePdfText({
  apiKey,
  modelName,
  fileName,
  size,
  extractedText,
}: {
  apiKey: string;
  modelName: string;
  fileName: string;
  size: number;
  extractedText: string;
}) {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.2 },
  });

  const result =
    await model.generateContent(`Review this extracted PDF text for QA reuse: ${fileName} (${Math.round(
      size / 1024,
    )} KB).

Use the required Markdown structure from the system instructions.

Extracted PDF text:
${extractedText}`);

  return result.response.text().trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!isPdfReviewBody(body)) {
    return new Response("Invalid PDF review payload.", { status: 400 });
  }

  if (body.mimeType !== "application/pdf") {
    return new Response("Only PDF files can be reviewed by this endpoint.", { status: 400 });
  }

  if (!body.data || body.size <= 0 || body.size > 8 * 1024 * 1024) {
    return new Response("PDF cannot be read. Upload a PDF up to 8 MB.", { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!apiKey) {
    return new Response("SQA Copilot is not configured. Missing GEMINI_API_KEY.", {
      status: 500,
    });
  }

  try {
    const extractedText = extractPdfText(body.data);
    if (extractedText.length >= 80) {
      const summary = await summarizePdfText({
        apiKey,
        modelName,
        fileName: body.name,
        size: body.size,
        extractedText,
      });

      if (summary) {
        return NextResponse.json({
          summary,
          reviewedAt: new Date().toISOString(),
          extraction: "text",
        });
      }
    }

    const ocrText = await extractPdfTextWithOcr(body.data).catch((error) => {
      console.warn("SQA Copilot PDF OCR fallback failed:", error);
      return "";
    });

    if (ocrText.length >= 80) {
      const summary = await summarizePdfText({
        apiKey,
        modelName,
        fileName: body.name,
        size: body.size,
        extractedText: ocrText,
      });

      if (summary) {
        return NextResponse.json({
          summary,
          reviewedAt: new Date().toISOString(),
          extraction: "ocr",
        });
      }
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.2 },
    });

    const result = await model.generateContent([
      {
        text: `Review this PDF for QA reuse: ${body.name} (${Math.round(body.size / 1024)} KB).

Use the required Markdown structure from the system instructions.`,
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: body.data,
        },
      },
    ]);

    const summary = result.response.text().trim();
    if (!summary) {
      return new Response("PDF review returned no readable summary.", { status: 422 });
    }

    return NextResponse.json({
      summary,
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SQA Copilot PDF review error:", error);
    if (getErrorStatus(error) === 429) {
      return new Response("Gemini quota is currently exceeded. Please try again later.", {
        status: 429,
      });
    }

    return new Response("PDF cannot be read. Try a text-based PDF or paste the content.", {
      status: 422,
    });
  }
}
