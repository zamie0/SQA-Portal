import { copyFile, mkdir, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";

export const PERFORMANCE_ROOT = path.join(process.cwd(), "src", "app", "tools", "performance");
export const REPORTS_ROOT = path.join(PERFORMANCE_ROOT, "reports", "generated");
export const UPLOADS_ROOT = path.join(PERFORMANCE_ROOT, "uploads");
const LEGACY_REPORTS_ROOT = path.join(process.cwd(), "performance", "reports");

export type PerformanceReportType = "CSV" | "Aggregate" | "Summary" | "HTML" | "JTL";
export type PerformanceStoredFileType = "JMX" | PerformanceReportType;

const REPORT_EXTENSION_TO_TYPE: Record<string, PerformanceReportType> = {
  ".csv": "CSV",
  ".jtl": "JTL",
  ".html": "HTML",
};

const ALLOWED_REPORT_EXTENSIONS = new Set([".csv", ".jtl", ".html"]);

export function slugifyPerformanceName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "performance-item";
}

function formatTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function resolveWithinRoot(root: string, fileName: string) {
  const resolved = path.resolve(root, fileName);
  const resolvedRoot = path.resolve(root);
  if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
    throw new Error("Invalid file path.");
  }
  return resolved;
}

async function uniquePath(root: string, fileName: string) {
  const parsed = path.parse(fileName);
  let candidateName = `${parsed.name}${parsed.ext}`;
  let attempt = 1;

  while (true) {
    const candidatePath = resolveWithinRoot(root, candidateName);

    try {
      await stat(candidatePath);
      candidateName = `${parsed.name}-${attempt}${parsed.ext}`;
      attempt += 1;
    } catch {
      return {
        fileName: candidateName,
        absolutePath: candidatePath,
      };
    }
  }
}

async function migrateLegacyReports() {
  try {
    const entries = await readdir(LEGACY_REPORTS_ROOT, { withFileTypes: true });
    if (entries.length === 0) {
      await rm(LEGACY_REPORTS_ROOT, { recursive: true, force: true });
      return;
    }

    await mkdir(REPORTS_ROOT, { recursive: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const sourcePath = path.join(LEGACY_REPORTS_ROOT, entry.name);
      const destination = await uniquePath(REPORTS_ROOT, entry.name);

      try {
        await rename(sourcePath, destination.absolutePath);
      } catch {
        await copyFile(sourcePath, destination.absolutePath);
        await unlink(sourcePath);
      }
    }

    await rm(path.join(process.cwd(), "performance"), { recursive: true, force: true });
  } catch {
    // Legacy folder may not exist; nothing to migrate.
  }
}

export async function ensurePerformanceDirectories() {
  await migrateLegacyReports();
  await mkdir(REPORTS_ROOT, { recursive: true });
  await mkdir(UPLOADS_ROOT, { recursive: true });
}

export function toRelativePerformancePath(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

export async function createReportOutputPaths(projectName: string, scenarioName: string) {
  await ensurePerformanceDirectories();

  const timestamp = formatTimestamp(new Date());
  const projectSlug = slugifyPerformanceName(projectName);
  const scenarioSlug = slugifyPerformanceName(scenarioName);
  const baseName = `${projectSlug}_${timestamp}_${scenarioSlug}`;

  const rawResults = await uniquePath(REPORTS_ROOT, `${baseName}_results.csv`);
  const aggregate = await uniquePath(REPORTS_ROOT, `${baseName}_aggregate.csv`);
  const summary = await uniquePath(REPORTS_ROOT, `${baseName}_summary.csv`);

  return {
    timestamp,
    rawResults,
    aggregate,
    summary,
  };
}

export async function createUploadPath(projectName: string, originalFileName: string) {
  await ensurePerformanceDirectories();

  const ext = path.extname(originalFileName).toLowerCase();
  const baseName = `${slugifyPerformanceName(projectName)}_${formatTimestamp(new Date())}_${slugifyPerformanceName(
    path.basename(originalFileName, ext),
  )}${ext || ".jmx"}`;

  return uniquePath(UPLOADS_ROOT, baseName);
}

export function isSafeReportFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_REPORT_EXTENSIONS.has(ext)) return false;
  if (fileName !== path.basename(fileName)) return false;
  if (fileName.includes("/") || fileName.includes("\\")) return false;
  return /^[a-zA-Z0-9._-]+$/.test(fileName);
}

export function resolveReportDownloadPath(fileName: string) {
  if (!isSafeReportFileName(fileName)) {
    throw new Error("Invalid report file name.");
  }

  return resolveWithinRoot(REPORTS_ROOT, fileName);
}

export function inferReportType(fileName: string): PerformanceReportType {
  const lower = fileName.toLowerCase();
  if (lower.includes("_aggregate")) return "Aggregate";
  if (lower.includes("_summary")) return "Summary";
  return REPORT_EXTENSION_TO_TYPE[path.extname(lower)] ?? "CSV";
}
