import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listPerformanceReportsForProject } from "@/app/api/performance/lib/performance-metadata";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) {
    return NextResponse.json({ message: "projectId query parameter is required." }, { status: 400 });
  }

  try {
    const results = await listPerformanceReportsForProject(projectId);
    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load performance result files.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
