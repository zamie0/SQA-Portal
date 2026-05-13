import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createUniqueReportPath, slugifyProjectName } from "@/app/api/performance/lib/report-files";

export const runtime = "nodejs";

type RunStatus = "completed" | "failed" | "setup_required";

type RunnerPayload = {
  status: RunStatus;
  message?: string;
  stdout?: string;
  stderr?: string;
  command?: string[];
  resultPath?: string;
  reportFileName?: string;
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

const MAX_PLAN_SIZE_BYTES = 5 * 1024 * 1024;
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

function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned.toLowerCase().endsWith(".jmx") ? cleaned : `${cleaned}.jmx`;
}

async function savePlan(file: File) {
  const runId = randomUUID();
  const runDir = path.join(tmpdir(), "sqa-performance-hub", runId);
  const planPath = path.join(runDir, sanitizeFilename(file.name));

  await mkdir(runDir, { recursive: true });
  await writeFile(planPath, new Uint8Array(await file.arrayBuffer()));

  return { planPath };
}

async function runPythonRunner(args: {
  planPath: string;
  jmeterPath?: string;
  threads: number;
  rampUp: number;
  loops: number;
  resultPath: string;
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

  let lastFailure: { stdout: string; stderr: string; exitCode: number | null } | null = null;

  for (const candidate of PYTHON_CANDIDATES) {
    const runnerArgs = [
      ...candidate.prefixArgs,
      scriptPath,
      "--jmx",
      args.planPath,
      "--threads",
      String(args.threads),
      "--ramp-up",
      String(args.rampUp),
      "--loops",
      String(args.loops),
      "--results",
      args.resultPath,
    ];

    if (args.jmeterPath) {
      runnerArgs.push("--jmeter-path", args.jmeterPath);
    }

    const execution = await spawnProcess(candidate.command, runnerArgs);

    if (execution.kind === "missing") {
      continue;
    }

    lastFailure = {
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode,
    };

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

function parseProjectName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return slugifyProjectName("performance-test");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "performance-test";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: "Invalid multipart form data." }, { status: 400 });
  }

  const plan = formData.get("plan");
  if (!(plan instanceof File)) {
    return NextResponse.json({ message: "A .jmx file upload is required." }, { status: 400 });
  }

  if (plan.size === 0) {
    return NextResponse.json({ message: "Uploaded .jmx file is empty." }, { status: 400 });
  }

  if (!plan.name.toLowerCase().endsWith(".jmx")) {
    return NextResponse.json({ message: "Only .jmx files are accepted." }, { status: 400 });
  }

  if (plan.size > MAX_PLAN_SIZE_BYTES) {
    return NextResponse.json(
      { message: "The uploaded .jmx file exceeds the 5 MB safety limit." },
      { status: 400 },
    );
  }

  const threads = parseNumericField(formData.get("threads"), "threads", 1, 500);
  const rampUp = parseNumericField(formData.get("rampUp"), "ramp-up", 1, 3600);
  const loops = parseNumericField(formData.get("loops"), "loop count", 1, 1000);
  const jmeterPath = parseOptionalJMeterPath(formData.get("jmeterPath"));
  const projectName = parseProjectName(formData.get("projectName"));

  if (!threads.ok) {
    return NextResponse.json({ message: threads.error }, { status: 400 });
  }

  if (!rampUp.ok) {
    return NextResponse.json({ message: rampUp.error }, { status: 400 });
  }

  if (!loops.ok) {
    return NextResponse.json({ message: loops.error }, { status: 400 });
  }

  if (!jmeterPath.ok) {
    return NextResponse.json({ message: jmeterPath.error }, { status: 400 });
  }

  const savedPlan = await savePlan(plan);
  const reportFile = await createUniqueReportPath(projectName);

  try {
    const payload = await runPythonRunner({
      planPath: savedPlan.planPath,
      jmeterPath: jmeterPath.value,
      threads: threads.value,
      rampUp: rampUp.value,
      loops: loops.value,
      resultPath: reportFile.reportPath,
    });

    payload.reportFileName ??= reportFile.fileName;

    const statusCode =
      payload.status === "completed" ? 200 : payload.status === "setup_required" ? 503 : 500;

    return NextResponse.json(payload, { status: statusCode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to invoke the Python performance runner.";

    return NextResponse.json({ status: "failed", message }, { status: 500 });
  }
}
