import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  isSafeReportFileName,
  resolveReportDownloadPath,
} from "@/app/api/performance/lib/performance-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await context.params;
  const decodedFileName = decodeURIComponent(fileName);

  if (!isSafeReportFileName(decodedFileName)) {
    return NextResponse.json({ message: "Invalid report file name." }, { status: 400 });
  }

  try {
    const filePath = resolveReportDownloadPath(decodedFileName);
    const fileBuffer = await readFile(filePath);
    const ext = path.extname(decodedFileName).toLowerCase();
    const contentType =
      ext === ".html" ? "text/html; charset=utf-8" : "text/csv; charset=utf-8";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${path.basename(decodedFileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to download the requested CSV file.";
    const status = /invalid/i.test(message) ? 400 : 404;
    return NextResponse.json({ message }, { status });
  }
}
