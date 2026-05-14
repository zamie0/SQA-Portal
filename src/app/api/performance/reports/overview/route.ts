import { NextResponse } from "next/server";
import { listReportsGroupedByProject } from "@/app/api/performance/lib/performance-metadata";

export const runtime = "nodejs";

export async function GET() {
  const groups = await listReportsGroupedByProject();
  return NextResponse.json({ groups });
}
