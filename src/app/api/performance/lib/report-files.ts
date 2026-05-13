import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type ReportFileEntry = {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  downloadUrl: string;
};

const REPORTS_DIRECTORY = path.join(process.cwd(), "performance", "reports");

export function getReportsDirectory() {
  return REPORTS_DIRECTORY;
}

export async function ensureReportsDirectory() {
  await mkdir(REPORTS_DIRECTORY, { recursive: true });
  return REPORTS_DIRECTORY;
}

export function slugifyProjectName(projectName: string) {
  const normalized = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "performance-test";
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

export async function createUniqueReportPath(projectName: string) {
  await ensureReportsDirectory();

  const baseName = `${slugifyProjectName(projectName)}_${formatTimestamp(new Date())}`;
  let candidate = `${baseName}.csv`;
  let attempt = 1;

  while (true) {
    const reportPath = path.join(REPORTS_DIRECTORY, candidate);

    try {
      await stat(reportPath);
      candidate = `${baseName}-${attempt}.csv`;
      attempt += 1;
    } catch {
      return {
        fileName: candidate,
        reportPath,
      };
    }
  }
}

export function isSafeCsvFileName(fileName: string) {
  if (!fileName.toLowerCase().endsWith(".csv")) return false;
  if (fileName !== path.basename(fileName)) return false;
  if (fileName.includes("/") || fileName.includes("\\")) return false;
  return /^[a-zA-Z0-9._-]+$/.test(fileName);
}

export function resolveReportPath(fileName: string) {
  if (!isSafeCsvFileName(fileName)) {
    throw new Error("Invalid report file name.");
  }

  const resolved = path.resolve(REPORTS_DIRECTORY, fileName);
  const reportsRoot = path.resolve(REPORTS_DIRECTORY);
  if (!resolved.startsWith(reportsRoot + path.sep) && resolved !== reportsRoot) {
    throw new Error("Invalid report path.");
  }

  return resolved;
}

export async function listProjectReports(projectName: string) {
  await ensureReportsDirectory();
  const prefix = `${slugifyProjectName(projectName)}_`;
  const files = await readdir(REPORTS_DIRECTORY, { withFileTypes: true });

  const entries = await Promise.all(
    files
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        if (!entry.name.toLowerCase().endsWith(".csv")) return null;
        if (!entry.name.startsWith(prefix)) return null;

        const filePath = path.join(REPORTS_DIRECTORY, entry.name);
        const metadata = await stat(filePath);

        return {
          fileName: entry.name,
          createdAt: metadata.birthtime.toISOString(),
          sizeBytes: metadata.size,
          downloadUrl: `/api/performance/results/${encodeURIComponent(entry.name)}`,
          sortKey: metadata.birthtimeMs || metadata.mtimeMs,
        };
      }),
  );

  return entries
    .filter((entry): entry is ReportFileEntry & { sortKey: number } => Boolean(entry))
    .sort((left, right) => right.sortKey - left.sortKey)
    .map(({ sortKey: _sortKey, ...entry }) => entry);
}
