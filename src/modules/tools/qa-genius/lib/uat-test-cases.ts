export type UatTestCase = {
  part: string;
  jiraUserStorySummary: string;
  tcId: string;
  testScenario: string;
  objective: string;
  testProcedure: string[];
  expectedResults: string[];
  actualResults: string;
  priority: string;
  remarks: string;
  tags: string[];
};

export type UatTestCaseGroup = {
  part: string;
  testCases: UatTestCase[];
};

export const uatTestCaseColumns = [
  "Jira User Story Summary",
  "TC ID",
  "Test Scenario",
  "Objective",
  "Test Procedure",
  "Expected Results",
  "Actual Results",
  "Priority",
  "Remarks",
  "Tags",
] as const;

const fallbackProcedure = "Review the requirement and execute the relevant UAT flow.";
const fallbackExpectedResult = "The system behaves according to the URS/SYRS requirement.";

function normalizeText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function normalizeOptionalText(value: unknown) {
  return normalizeText(value, "");
}

function stripListMarker(value: string) {
  return value.replace(/^\s*(?:\d+[).]|[-*])\s+/, "").trim();
}

function splitNumberedText(value: string) {
  return value
    .split(/\r?\n|(?=\s*\d+[).]\s+)/)
    .map(stripListMarker)
    .filter(Boolean);
}

export function normalizeSteps(value: unknown, fallback = fallbackProcedure) {
  if (Array.isArray(value)) {
    const steps = value
      .map((step) => normalizeText(step, ""))
      .map(stripListMarker)
      .filter(Boolean);

    return steps.length > 0 ? steps : [fallback];
  }

  if (typeof value === "string" && value.trim()) {
    const steps = splitNumberedText(value);
    return steps.length > 0 ? steps : [stripListMarker(value)];
  }

  return [fallback];
}

function normalizeTags(value: unknown, part: string) {
  const fallbackTags = [part, "UAT"]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/\s+/g, "-").toLowerCase());

  const tags = Array.isArray(value)
    ? value.map((tag) => normalizeText(tag, ""))
    : typeof value === "string"
      ? value.split(/[,;\n]/)
      : [];

  const cleanedTags = tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean);

  return Array.from(new Set(cleanedTags.length > 0 ? cleanedTags : fallbackTags));
}

function readField(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in item) return item[key];
  }

  return undefined;
}

function createTcId(index: number) {
  return `TC${String(index + 1).padStart(2, "0")}`;
}

function isUserStoryStyle(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.startsWith("as a ") &&
    normalized.includes(" i want to ") &&
    normalized.includes(" so that ")
  );
}

function sentenceCase(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return cleaned;
  return `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
}

function normalizeUserStorySummary(value: unknown, part: string, testScenario: string) {
  const summary = normalizeText(value, "");
  if (summary && isUserStoryStyle(summary)) {
    return summary.endsWith(".") ? summary : `${summary}.`;
  }

  const functionText = part.toLowerCase().includes("general")
    ? sentenceCase(testScenario)
    : `validate ${sentenceCase(part)} requirements`;

  return `As a business user, I want to ${functionText}, so that the intended workflow can be completed reliably.`;
}

function isWeakObjective(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("dummy") ||
    normalized.includes("placeholder") ||
    normalized.includes("generated objective") ||
    normalized.includes("ai-generated") ||
    normalized === "objective" ||
    normalized === "test objective" ||
    normalized.length < 24
  );
}

function summarizeRequirement(requirement = "") {
  return requirement.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function normalizeUatTestCases(value: unknown, requirement = ""): UatTestCase[] {
  if (!Array.isArray(value)) return [];

  const requirementSummary = summarizeRequirement(requirement);

  const normalized = value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index): UatTestCase => {
      const part = normalizeText(
        readField(item, ["part", "module", "area", "category", "Part", "Module"]),
        "General",
      );
      const testScenario = normalizeText(
        readField(item, ["testScenario", "Test Scenario", "title", "scenario"]),
        requirementSummary
          ? `UAT scenario for ${requirementSummary}`
          : `Generated UAT scenario ${index + 1}`,
      );
      const objectiveCandidate = normalizeText(
        readField(item, ["objective", "Objective", "description"]),
        "",
      );
      const objective =
        objectiveCandidate && !isWeakObjective(objectiveCandidate)
          ? objectiveCandidate
          : `Verify ${testScenario.toLowerCase()} so that the URS/SYRS requirement is satisfied.`;
      const testProcedure = normalizeSteps(
        readField(item, ["testProcedure", "Test Procedure", "steps", "testSteps"]),
        `Execute the ${testScenario.toLowerCase()} flow using suitable UAT test data.`,
      );
      const expectedResults = normalizeSteps(
        readField(item, ["expectedResults", "Expected Results", "expectedResult"]),
        fallbackExpectedResult,
      );

      return {
        part,
        jiraUserStorySummary: normalizeUserStorySummary(
          readField(item, ["jiraUserStorySummary", "Jira User Story Summary", "userStorySummary"]),
          part,
          testScenario,
        ),
        tcId: createTcId(index),
        testScenario,
        objective,
        testProcedure,
        expectedResults,
        actualResults: "Not Started",
        priority: normalizeText(readField(item, ["priority", "Priority"]), "Medium"),
        remarks: normalizeOptionalText(readField(item, ["remarks", "Remarks"])),
        tags: normalizeTags(readField(item, ["tags", "Tags"]), part),
      };
    });
  const summaryByPart = new Map<string, string>();

  for (const testCase of normalized) {
    if (!summaryByPart.has(testCase.part)) {
      summaryByPart.set(testCase.part, testCase.jiraUserStorySummary);
    }
  }

  return normalized.map((testCase) => ({
    ...testCase,
    jiraUserStorySummary: summaryByPart.get(testCase.part) ?? testCase.jiraUserStorySummary,
  }));
}

export function groupUatTestCasesByPart(testCases: UatTestCase[]): UatTestCaseGroup[] {
  const groups: UatTestCaseGroup[] = [];

  for (const testCase of testCases) {
    const part = testCase.part || "General";
    const existingGroup = groups.find((group) => group.part === part);

    if (existingGroup) {
      existingGroup.testCases.push(testCase);
    } else {
      groups.push({ part, testCases: [testCase] });
    }
  }

  return groups;
}

export function formatNumberedList(values: string[]) {
  return values.map((value, index) => `${index + 1}. ${value}`).join("\n");
}

export function formatTags(tags: string[]) {
  return tags.join(", ");
}

function toRow(testCase: UatTestCase) {
  return [
    testCase.jiraUserStorySummary,
    testCase.tcId,
    testCase.testScenario,
    testCase.objective,
    formatNumberedList(testCase.testProcedure),
    formatNumberedList(testCase.expectedResults),
    testCase.actualResults,
    testCase.priority,
    testCase.remarks,
    formatTags(testCase.tags),
  ];
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function formatUatTestCasesForCopy(testCases: UatTestCase[]) {
  return groupUatTestCasesByPart(testCases)
    .map((group) =>
      [
        `Part: ${group.part}`,
        ...group.testCases.map((testCase) =>
          uatTestCaseColumns
            .map((column, index) => `${column}: ${toRow(testCase)[index]}`)
            .join("\n"),
        ),
      ].join("\n\n"),
    )
    .join("\n\n");
}

export function formatUatTestCasesForCsv(testCases: UatTestCase[]) {
  const rows: string[][] = [Array.from(uatTestCaseColumns)];

  for (const group of groupUatTestCasesByPart(testCases)) {
    rows.push([`Part: ${group.part}`, ...Array(uatTestCaseColumns.length - 1).fill("")]);
    rows.push(...group.testCases.map(toRow));
  }

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellHtml(value: string, tag = "td") {
  return `<${tag}>${escapeHtml(value).replace(/\n/g, "<br />")}</${tag}>`;
}

export function formatUatTestCasesForExcelHtml(testCases: UatTestCase[]) {
  const header = `<tr>${uatTestCaseColumns.map((column) => cellHtml(column, "th")).join("")}</tr>`;
  const groups = groupUatTestCasesByPart(testCases)
    .map((group) => {
      const groupRow = `<tr><td colspan="${uatTestCaseColumns.length}">${escapeHtml(
        `Part: ${group.part}`,
      )}</td></tr>`;
      const rows = group.testCases
        .map(
          (testCase) =>
            `<tr>${toRow(testCase)
              .map((cell) => cellHtml(cell))
              .join("")}</tr>`,
        )
        .join("");

      return `${groupRow}${rows}`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1">${header}${groups}</table></body></html>`;
}
