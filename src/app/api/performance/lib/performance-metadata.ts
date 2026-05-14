import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { getMongoDb } from "@/shared/lib/mongodb";
import {
  inferReportType,
  toRelativePerformancePath,
  type PerformanceReportType,
} from "@/app/api/performance/lib/performance-storage";

export type PerformanceRunStatus =
  | "running"
  | "completed"
  | "failed"
  | "setup_required"
  | "passed";

export type PerformanceRunSummary = {
  samples: number;
  failures: number;
  errorRate: number;
  averageMs: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughput: number | null;
};

type PerformanceProjectDocument = {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type PerformanceScenarioDocument = {
  _id: string;
  projectId: string;
  projectName: string;
  scenarioName: string;
  jmxFileId?: string;
  jmxFileName?: string;
  createdAt: string;
  updatedAt: string;
};

type PerformanceRunDocument = {
  _id: string;
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  jmxFileId: string;
  jmxFileName: string;
  threads: number;
  rampUp: number;
  loops: number;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: PerformanceRunStatus;
  message?: string;
  command?: string[];
  summary?: PerformanceRunSummary;
  reportFileNames: string[];
};

type PerformanceReportDocument = {
  _id: string;
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  runId: string;
  fileName: string;
  filePath: string;
  fileType: PerformanceReportType;
  fileSize: number;
  createdAt: string;
  status: PerformanceRunStatus;
};

type PerformanceFileDocument = {
  _id: string;
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  fileName: string;
  filePath: string;
  fileType: "JMX";
  fileSize: number;
  createdAt: string;
};

const COLLECTIONS = {
  projects: "performanceProjects",
  scenarios: "performanceScenarios",
  runs: "performanceRuns",
  reports: "performanceReports",
  files: "performanceFiles",
} as const;

async function db() {
  return getMongoDb();
}

function nowIso() {
  return new Date().toISOString();
}

export async function ensurePerformanceProject(input: {
  projectId: string;
  name: string;
  description?: string;
}) {
  const database = await db();
  const timestamp = nowIso();
  const document: PerformanceProjectDocument = {
    _id: input.projectId,
    name: input.name,
    description: input.description?.trim() || "Performance testing project",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await database.collection<PerformanceProjectDocument>(COLLECTIONS.projects).updateOne(
    { _id: input.projectId },
    {
      $set: {
        name: document.name,
        description: document.description,
        updatedAt: timestamp,
      },
      $setOnInsert: {
        createdAt: timestamp,
      },
    },
    { upsert: true },
  );

  return document;
}

export async function upsertPerformanceScenario(input: {
  projectId: string;
  projectName: string;
  scenarioName: string;
  jmxFileId?: string;
  jmxFileName?: string;
}) {
  const database = await db();
  const timestamp = nowIso();
  const scenarioId = randomUUID();

  const existing = await database.collection<PerformanceScenarioDocument>(COLLECTIONS.scenarios).findOne({
    projectId: input.projectId,
    scenarioName: input.scenarioName,
  });

  const _id = existing?._id ?? scenarioId;

  await database.collection<PerformanceScenarioDocument>(COLLECTIONS.scenarios).updateOne(
    { _id },
    {
      $set: {
        projectId: input.projectId,
        projectName: input.projectName,
        scenarioName: input.scenarioName,
        jmxFileId: input.jmxFileId,
        jmxFileName: input.jmxFileName,
        updatedAt: timestamp,
      },
      $setOnInsert: {
        createdAt: timestamp,
      },
    },
    { upsert: true },
  );

  return {
    _id,
    projectId: input.projectId,
    projectName: input.projectName,
    scenarioName: input.scenarioName,
    jmxFileId: input.jmxFileId,
    jmxFileName: input.jmxFileName,
  };
}

export async function createPerformanceUploadFile(input: {
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  fileName: string;
  absolutePath: string;
}) {
  const metadata = await stat(input.absolutePath);
  const timestamp = nowIso();
  const document: PerformanceFileDocument = {
    _id: randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    fileName: input.fileName,
    filePath: toRelativePerformancePath(input.absolutePath),
    fileType: "JMX",
    fileSize: metadata.size,
    createdAt: timestamp,
  };

  const database = await db();
  await database.collection<PerformanceFileDocument>(COLLECTIONS.files).insertOne(document);
  return document;
}

export async function findPerformanceUploadFile(fileId: string) {
  const database = await db();
  return database.collection<PerformanceFileDocument>(COLLECTIONS.files).findOne({ _id: fileId });
}

export async function createPerformanceRun(input: {
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  jmxFileId: string;
  jmxFileName: string;
  threads: number;
  rampUp: number;
  loops: number;
}) {
  const document: PerformanceRunDocument = {
    _id: randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    jmxFileId: input.jmxFileId,
    jmxFileName: input.jmxFileName,
    threads: input.threads,
    rampUp: input.rampUp,
    loops: input.loops,
    startedAt: nowIso(),
    status: "running",
    reportFileNames: [],
  };

  const database = await db();
  await database.collection<PerformanceRunDocument>(COLLECTIONS.runs).insertOne(document);
  return document;
}

export async function updatePerformanceRun(
  runId: string,
  patch: Partial<
    Pick<
      PerformanceRunDocument,
      "status" | "endedAt" | "durationMs" | "message" | "command" | "summary" | "reportFileNames"
    >
  >,
) {
  const database = await db();
  await database.collection<PerformanceRunDocument>(COLLECTIONS.runs).updateOne(
    { _id: runId },
    {
      $set: patch,
    },
  );
}

export async function createPerformanceReport(input: {
  projectId: string;
  projectName: string;
  scenarioId: string;
  scenarioName: string;
  runId: string;
  absolutePath: string;
  status: PerformanceRunStatus;
}) {
  const metadata = await stat(input.absolutePath);
  const fileName = input.absolutePath.split(/[\\/]/).pop() ?? "report.csv";
  const document: PerformanceReportDocument = {
    _id: randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    runId: input.runId,
    fileName,
    filePath: toRelativePerformancePath(input.absolutePath),
    fileType: inferReportType(fileName),
    fileSize: metadata.size,
    createdAt: nowIso(),
    status: input.status,
  };

  const database = await db();
  await database.collection<PerformanceReportDocument>(COLLECTIONS.reports).insertOne(document);
  return document;
}

export async function listPerformanceReportsForProject(projectId: string) {
  const database = await db();
  const results = await database
    .collection<PerformanceReportDocument>(COLLECTIONS.reports)
    .find({ projectId })
    .sort({ createdAt: -1 })
    .toArray();

  return results.map((report) => ({
    fileName: report.fileName,
    createdAt: report.createdAt,
    sizeBytes: report.fileSize,
    fileType: report.fileType,
    status: report.status,
    projectName: report.projectName,
    scenarioName: report.scenarioName,
    downloadUrl: `/api/performance/results/${encodeURIComponent(report.fileName)}`,
    viewUrl: `/api/performance/results/${encodeURIComponent(report.fileName)}`,
  }));
}

export async function listReportsGroupedByProject() {
  const database = await db();
  const reports = await database
    .collection<PerformanceReportDocument>(COLLECTIONS.reports)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const grouped = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      reports: Array<{
        runId: string;
        scenarioId: string;
        scenarioName: string;
        fileName: string;
        fileType: PerformanceReportType;
        createdAt: string;
        sizeBytes: number;
        status: PerformanceRunStatus;
        downloadUrl: string;
        viewUrl: string;
      }>;
    }
  >();

  for (const report of reports) {
    const current = grouped.get(report.projectId) ?? {
      projectId: report.projectId,
      projectName: report.projectName,
      reports: [],
    };

    current.reports.push({
      runId: report.runId,
      scenarioId: report.scenarioId,
      scenarioName: report.scenarioName,
      fileName: report.fileName,
      fileType: report.fileType,
      createdAt: report.createdAt,
      sizeBytes: report.fileSize,
      status: report.status,
      downloadUrl: `/api/performance/results/${encodeURIComponent(report.fileName)}`,
      viewUrl: `/api/performance/results/${encodeURIComponent(report.fileName)}`,
    });
    grouped.set(report.projectId, current);
  }

  return Array.from(grouped.values());
}

export async function listPerformanceRunsWithReports() {
  const database = await db();
  const [runs, reports] = await Promise.all([
    database
      .collection<PerformanceRunDocument>(COLLECTIONS.runs)
      .find({})
      .sort({ startedAt: -1 })
      .toArray(),
    database.collection<PerformanceReportDocument>(COLLECTIONS.reports).find({}).toArray(),
  ]);

  const reportsByRun = new Map<string, PerformanceReportDocument[]>();
  for (const report of reports) {
    const group = reportsByRun.get(report.runId) ?? [];
    group.push(report);
    reportsByRun.set(report.runId, group);
  }

  return runs.map((run) => ({
    id: run._id,
    projectId: run.projectId,
    projectName: run.projectName,
    scenarioId: run.scenarioId,
    scenarioName: run.scenarioName,
    jmxFileName: run.jmxFileName,
    threads: run.threads,
    rampUp: run.rampUp,
    loops: run.loops,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    durationMs: run.durationMs,
    status: run.status,
    message: run.message,
    reports: (reportsByRun.get(run._id) ?? [])
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((report) => ({
        fileName: report.fileName,
        fileType: report.fileType,
        status: report.status,
        downloadUrl: `/api/performance/results/${encodeURIComponent(report.fileName)}`,
      })),
  }));
}

export async function syncPerformanceProjects(
  projects: Array<{ id: string; name: string; description: string; createdAt: string }>,
) {
  const database = await db();
  const timestamp = nowIso();

  for (const project of projects) {
    await database.collection<PerformanceProjectDocument>(COLLECTIONS.projects).updateOne(
      { _id: project.id },
      {
        $set: {
          name: project.name,
          description: project.description,
          updatedAt: timestamp,
        },
        $setOnInsert: {
          createdAt: project.createdAt || timestamp,
        },
      },
      { upsert: true },
    );
  }
}

export async function deletePerformanceProjectMetadata(projectId: string) {
  const database = await db();
  await Promise.all([
    database.collection(COLLECTIONS.projects).deleteOne({ _id: projectId }),
    database.collection(COLLECTIONS.scenarios).deleteMany({ projectId }),
    database.collection(COLLECTIONS.files).deleteMany({ projectId }),
    database.collection(COLLECTIONS.runs).deleteMany({ projectId }),
    database.collection(COLLECTIONS.reports).deleteMany({ projectId }),
  ]);
}
