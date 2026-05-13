import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isSafeCsvFileName, resolveReportPath } from "@/app/api/performance/lib/report-files";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await context.params;
  const decodedFileName = decodeURIComponent(fileName);

  if (!isSafeCsvFileName(decodedFileName)) {
    return NextResponse.json({ message: "Invalid CSV file name." }, { status: 400 });
  }

  try {
    const filePath = resolveReportPath(decodedFileName);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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
