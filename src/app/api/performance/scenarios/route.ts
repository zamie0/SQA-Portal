import { NextResponse } from "next/server";
import { listPerformanceRunsWithReports } from "@/app/api/performance/lib/performance-metadata";

export const runtime = "nodejs";

export async function GET() {
  const runs = await listPerformanceRunsWithReports();
  return NextResponse.json({ runs });
}
