import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  createPerformanceUploadFile,
  ensurePerformanceProject,
  upsertPerformanceScenario,
} from "@/app/api/performance/lib/performance-metadata";
import {
  createUploadPath,
  ensurePerformanceDirectories,
} from "@/app/api/performance/lib/performance-storage";

export const runtime = "nodejs";

function scenarioNameFromFile(fileName: string) {
  return path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, " ").trim();
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid multipart payload." }, { status: 400 });
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const description = String(formData.get("projectDescription") ?? "").trim();
  const uploaded = formData.get("plan");

  if (!projectId || !projectName) {
    return NextResponse.json({ message: "projectId and projectName are required." }, { status: 400 });
  }

  if (!(uploaded instanceof File)) {
    return NextResponse.json({ message: "A .jmx file upload is required." }, { status: 400 });
  }

  if (!uploaded.name.toLowerCase().endsWith(".jmx")) {
    return NextResponse.json({ message: "Only .jmx files are accepted." }, { status: 400 });
  }

  await ensurePerformanceDirectories();
  await ensurePerformanceProject({
    projectId,
    name: projectName,
    description,
  });

  const uploadPath = await createUploadPath(projectName, uploaded.name);
  await writeFile(uploadPath.absolutePath, new Uint8Array(await uploaded.arrayBuffer()));

  const scenarioName = scenarioNameFromFile(uploaded.name) || "Uploaded scenario";
  const scenario = await upsertPerformanceScenario({
    projectId,
    projectName,
    scenarioName,
    jmxFileName: uploadPath.fileName,
  });

  const file = await createPerformanceUploadFile({
    projectId,
    projectName,
    scenarioId: scenario._id,
    scenarioName,
    fileName: uploadPath.fileName,
    absolutePath: uploadPath.absolutePath,
  });

  await upsertPerformanceScenario({
    projectId,
    projectName,
    scenarioName,
    jmxFileId: file._id,
    jmxFileName: file.fileName,
  });

  return NextResponse.json({
    fileId: file._id,
    fileName: file.fileName,
    scenarioId: scenario._id,
    scenarioName,
    filePath: file.filePath,
    createdAt: file.createdAt,
  });
}
