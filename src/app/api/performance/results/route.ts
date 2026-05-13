import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listProjectReports } from "@/app/api/performance/lib/report-files";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projectName = request.nextUrl.searchParams.get("project")?.trim() ?? "";
  if (!projectName) {
    return NextResponse.json({ message: "project query parameter is required." }, { status: 400 });
  }

  try {
    const results = await listProjectReports(projectName);
    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load performance result files.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
