import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  createPerformanceReport,
  createPerformanceRun,
  ensurePerformanceProject,
  findPerformanceUploadFile,
  type PerformanceRunStatus,
  updatePerformanceRun,
} from "@/app/api/performance/lib/performance-metadata";
import {
  createReportOutputPaths,
  ensurePerformanceDirectories,
} from "@/app/api/performance/lib/performance-storage";

export const runtime = "nodejs";

type RunnerPayload = {
  status: "completed" | "failed" | "setup_required";
  message?: string;
  stdout?: string;
  stderr?: string;
  command?: string[];
  resultPath?: string;
  aggregatePath?: string;
  summaryPath?: string;
  summary?: {
    samples: number;
    failures: number;
    errorRate: number;
    averageMs: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
    throughput: number | null;
  };
};

const MAX_JMETER_PATH_LENGTH = 512;

const PYTHON_CANDIDATES =
  process.platform === "win32"
    ? [
        { command: "py", prefixArgs: ["-3"] },
        { command: "python", prefixArgs: [] },
        { command: "python3", prefixArgs: [] },
      ]
    : [
        { command: "python3", prefixArgs: [] },
        { command: "python", prefixArgs: [] },
      ];

function parseNumericField(
  value: FormDataEntryValue | null,
  field: string,
  min: number,
  max: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: `${field} is required.` };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return { ok: false, error: `${field} must be a whole number.` };
  }

  if (numeric < min || numeric > max) {
    return { ok: false, error: `${field} must be between ${min} and ${max}.` };
  }

  return { ok: true, value: numeric };
}

function parseOptionalJMeterPath(value: FormDataEntryValue | null) {
  if (value === null) return { ok: true, value: undefined } as const;
  if (typeof value !== "string") {
    return { ok: false, error: "JMeter path must be a string." } as const;
  }

  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, value: undefined } as const;

  if (trimmed.length > MAX_JMETER_PATH_LENGTH) {
    return {
      ok: false,
      error: `JMeter path must be ${MAX_JMETER_PATH_LENGTH} characters or fewer.`,
    } as const;
  }

  return { ok: true, value: trimmed } as const;
}

function absolutePathFromRelative(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

async function runPythonRunner(args: {
  jmxPath: string;
  jmeterPath?: string;
  threads: number;
  rampUp: number;
  loops: number;
  resultPath: string;
  aggregatePath: string;
  summaryPath: string;
}) {
  const scriptPath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "performance",
    "hub-run",
    "jmeter_runner.py",
  );

  for (const candidate of PYTHON_CANDIDATES) {
    const runnerArgs = [
      ...candidate.prefixArgs,
      scriptPath,
      "--jmx",
      args.jmxPath,
      "--threads",
      String(args.threads),
      "--ramp-up",
      String(args.rampUp),
      "--loops",
      String(args.loops),
      "--results",
      args.resultPath,
      "--aggregate",
      args.aggregatePath,
      "--summary",
      args.summaryPath,
    ];

    if (args.jmeterPath) {
      runnerArgs.push("--jmeter-path", args.jmeterPath);
    }

    const execution = await spawnProcess(candidate.command, runnerArgs);
    if (execution.kind === "missing") continue;

    try {
      return JSON.parse(execution.stdout) as RunnerPayload;
    } catch {
      return {
        status: "failed",
        message: "The Python runner returned an unexpected response.",
        stdout: execution.stdout,
        stderr: execution.stderr,
      } satisfies RunnerPayload;
    }
  }

  return {
    status: "setup_required",
    message:
      "Python 3 is not available on PATH. Install Python and ensure the python or py command is accessible before running performance tests.",
  } satisfies RunnerPayload;
}

function spawnProcess(command: string, args: string[]) {
  return new Promise<
    | { kind: "missing" }
    | { kind: "completed"; stdout: string; stderr: string; exitCode: number | null }
  >((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        resolve({ kind: "missing" });
        return;
      }

      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({ kind: "completed", stdout, stderr, exitCode });
    });
  });
}

async function fileExists(absolutePath: string) {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function finalStatusFromRunner(payload: RunnerPayload): PerformanceRunStatus {
  if (payload.status === "failed") return "failed";
  if (payload.status === "setup_required") return "setup_required";
  if (payload.summary && payload.summary.failures === 0) return "passed";
  return "completed";
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid multipart form data." }, { status: 400 });
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const uploadedFileId = String(formData.get("uploadedFileId") ?? "").trim();
  const threads = parseNumericField(formData.get("threads"), "threads", 1, 500);
  const rampUp = parseNumericField(formData.get("rampUp"), "ramp-up", 1, 3600);
  const loops = parseNumericField(formData.get("loops"), "loop count", 1, 1000);
  const jmeterPath = parseOptionalJMeterPath(formData.get("jmeterPath"));

  if (!projectId || !projectName) {
    return NextResponse.json({ message: "projectId and projectName are required." }, { status: 400 });
  }

  if (!uploadedFileId) {
    return NextResponse.json({ message: "uploadedFileId is required." }, { status: 400 });
  }

  if (!threads.ok) return NextResponse.json({ message: threads.error }, { status: 400 });
  if (!rampUp.ok) return NextResponse.json({ message: rampUp.error }, { status: 400 });
  if (!loops.ok) return NextResponse.json({ message: loops.error }, { status: 400 });
  if (!jmeterPath.ok) return NextResponse.json({ message: jmeterPath.error }, { status: 400 });

  const uploadedFile = await findPerformanceUploadFile(uploadedFileId);
  if (!uploadedFile) {
    return NextResponse.json({ message: "Uploaded JMX metadata could not be found." }, { status: 404 });
  }

  const uploadedFilePath = absolutePathFromRelative(uploadedFile.filePath);
  if (!(await fileExists(uploadedFilePath))) {
    return NextResponse.json({ message: "Uploaded JMX file is missing on disk." }, { status: 404 });
  }

  await ensurePerformanceDirectories();
  await ensurePerformanceProject({
    projectId,
    name: projectName,
    description: "Performance testing project",
  });

  const outputPaths = await createReportOutputPaths(projectName, uploadedFile.scenarioName);
  const run = await createPerformanceRun({
    projectId,
    projectName,
    scenarioId: uploadedFile.scenarioId,
    scenarioName: uploadedFile.scenarioName,
    jmxFileId: uploadedFile._id,
    jmxFileName: uploadedFile.fileName,
    threads: threads.value,
    rampUp: rampUp.value,
    loops: loops.value,
  });

  const startedAt = Date.now();

  try {
    const payload = await runPythonRunner({
      jmxPath: uploadedFilePath,
      jmeterPath: jmeterPath.value,
      threads: threads.value,
      rampUp: rampUp.value,
      loops: loops.value,
      resultPath: outputPaths.rawResults.absolutePath,
      aggregatePath: outputPaths.aggregate.absolutePath,
      summaryPath: outputPaths.summary.absolutePath,
    });

    const finalStatus = finalStatusFromRunner(payload);
    const reportFiles: string[] = [];

    for (const candidate of [
      outputPaths.rawResults.absolutePath,
      outputPaths.aggregate.absolutePath,
      outputPaths.summary.absolutePath,
    ]) {
      if (!(await fileExists(candidate))) continue;
      const report = await createPerformanceReport({
        projectId,
        projectName,
        scenarioId: uploadedFile.scenarioId,
        scenarioName: uploadedFile.scenarioName,
        runId: run._id,
        absolutePath: candidate,
        status: finalStatus,
      });
      reportFiles.push(report.fileName);
    }

    await updatePerformanceRun(run._id, {
      status: finalStatus,
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      message: payload.message,
      command: payload.command,
      summary: payload.summary,
      reportFileNames: reportFiles,
    });

    const statusCode =
      payload.status === "completed" ? 200 : payload.status === "setup_required" ? 503 : 500;

    return NextResponse.json(
      {
        ...payload,
        runId: run._id,
        scenarioId: uploadedFile.scenarioId,
        scenarioName: uploadedFile.scenarioName,
        reportFileNames: reportFiles,
      },
      { status: statusCode },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to invoke the Python performance runner.";

    await updatePerformanceRun(run._id, {
      status: "failed",
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      message,
      reportFileNames: [],
    });

    return NextResponse.json({ status: "failed", message }, { status: 500 });
  }
}
