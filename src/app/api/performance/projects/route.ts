import { NextResponse } from "next/server";
import {
  deletePerformanceProjectMetadata,
  syncPerformanceProjects,
} from "@/app/api/performance/lib/performance-metadata";

export const runtime = "nodejs";

type IncomingProject = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projects = Array.isArray((body as { projects?: unknown })?.projects)
    ? ((body as { projects: IncomingProject[] }).projects ?? [])
    : [];

  if (projects.length === 0) {
    return NextResponse.json({ message: "projects payload is required." }, { status: 400 });
  }

  await syncPerformanceProjects(projects);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = String((body as { projectId?: unknown })?.projectId ?? "").trim();

  if (!projectId) {
    return NextResponse.json({ message: "projectId is required." }, { status: 400 });
  }

  await deletePerformanceProjectMetadata(projectId);
  return NextResponse.json({ ok: true });
}
