export type PromptEvaluationCriterion =
  | "valid JSON"
  | "real objective"
  | "clear test procedure"
  | "relevant expected result"
  | "correct priority"
  | "no hallucinated unsupported features";

export type PromptEvaluationFeedback = {
  criterion: PromptEvaluationCriterion;
  passed: boolean;
  message: string;
};

export type PromptEvaluationResult = {
  score: number;
  maxScore: number;
  feedback: PromptEvaluationFeedback[];
};

export type GeneratedTestCaseCandidate = {
  id?: unknown;
  testScenario?: unknown;
  objective?: unknown;
  testProcedure?: unknown;
  expectedResults?: unknown;
  priority?: unknown;
  testType?: unknown;
};

export const qaGeniusSampleRequirements = {
  login:
    "Users must be able to log in to SQA Portal using a valid TMR&D email and password. Invalid credentials must show a clear error without revealing which field is wrong.",
  apiAuthentication:
    "The project API must require a valid bearer token for protected endpoints and return 401 for missing, expired, or malformed tokens.",
  fileUpload:
    "Users can upload requirement files in TXT, CSV, JSON, and XML format. Unsupported file types must be rejected with a helpful validation message.",
  performance:
    "The dashboard should load the project summary within 3 seconds for 100 concurrent users during Malaysian business hours.",
  security:
    "Admin-only pages must block non-admin users and prevent direct URL access to user management functions.",
} as const;

export const qaGeniusQualityCriteria: PromptEvaluationCriterion[] = [
  "valid JSON",
  "real objective",
  "clear test procedure",
  "relevant expected result",
  "correct priority",
  "no hallucinated unsupported features",
];

const unsupportedFeatureTerms = [
  "sent email",
  "sms",
  "whatsapp",
  "mongo",
  "mongodb",
  "jira",
  "servicenow",
  "auto-created",
  "automatically created",
  "payment",
];

function parseGeneratedResult(result: string | unknown): unknown {
  if (typeof result !== "string") return result;

  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

function asTestCases(result: unknown): GeneratedTestCaseCandidate[] {
  if (Array.isArray(result)) {
    return result.filter(
      (item): item is GeneratedTestCaseCandidate => !!item && typeof item === "object",
    );
  }

  if (result && typeof result === "object") {
    const testCases = (result as { testCases?: unknown }).testCases;
    if (Array.isArray(testCases)) {
      return testCases.filter(
        (item): item is GeneratedTestCaseCandidate => !!item && typeof item === "object",
      );
    }
  }

  return [];
}

function hasUsefulText(value: unknown, minLength = 12) {
  return typeof value === "string" && value.trim().length >= minLength;
}

function hasUsefulStringArray(value: unknown, minItems = 1) {
  return (
    Array.isArray(value) &&
    value.filter((item) => typeof item === "string" && item.trim().length >= 8).length >= minItems
  );
}

function hasWeakObjective(testCase: GeneratedTestCaseCandidate) {
  if (!hasUsefulText(testCase.objective, 24)) return true;

  const objective = String(testCase.objective).toLowerCase();
  return (
    objective.includes("dummy") ||
    objective.includes("placeholder") ||
    objective.includes("generated objective") ||
    objective === "objective" ||
    objective === "test objective"
  );
}

function matchesPriority(testCases: GeneratedTestCaseCandidate[], expectedPriority?: string) {
  if (!expectedPriority) return testCases.every((testCase) => hasUsefulText(testCase.priority, 2));

  return testCases.every(
    (testCase) =>
      typeof testCase.priority === "string" &&
      testCase.priority.toLowerCase() === expectedPriority.toLowerCase(),
  );
}

function includesUnsupportedFeatures(testCases: GeneratedTestCaseCandidate[]) {
  const content = JSON.stringify(testCases).toLowerCase();
  return unsupportedFeatureTerms.some((term) => content.includes(term));
}

function toFeedback(
  criterion: PromptEvaluationCriterion,
  passed: boolean,
  passMessage: string,
  failMessage: string,
): PromptEvaluationFeedback {
  return {
    criterion,
    passed,
    message: passed ? passMessage : failMessage,
  };
}

export function scoreGeneratedTestCaseResult({
  generatedResult,
  expectedPriority,
}: {
  generatedResult: string | unknown;
  expectedPriority?: string;
}): PromptEvaluationResult {
  const parsed = parseGeneratedResult(generatedResult);
  const testCases = asTestCases(parsed);
  const hasTestCases = testCases.length > 0;

  const validJson = typeof generatedResult === "string" ? parsed !== null : hasTestCases;
  const realObjective = hasTestCases && testCases.every((testCase) => !hasWeakObjective(testCase));
  const clearProcedure =
    hasTestCases && testCases.every((testCase) => hasUsefulStringArray(testCase.testProcedure, 1));
  const relevantExpectedResult =
    hasTestCases && testCases.every((testCase) => hasUsefulStringArray(testCase.expectedResults, 1));
  const correctPriority = hasTestCases && matchesPriority(testCases, expectedPriority);
  const noUnsupportedFeatures = hasTestCases && !includesUnsupportedFeatures(testCases);

  const feedback: PromptEvaluationFeedback[] = [
    toFeedback(
      "valid JSON",
      validJson && hasTestCases,
      "Output is parseable and contains test case objects.",
      "Output must be valid JSON containing at least one test case.",
    ),
    toFeedback(
      "real objective",
      realObjective,
      "Each test case has a specific, meaningful objective.",
      "One or more objectives are missing, too short, or look like placeholders.",
    ),
    toFeedback(
      "clear test procedure",
      clearProcedure,
      "Each test case has executable procedure steps.",
      "One or more test cases need clearer testProcedure steps.",
    ),
    toFeedback(
      "relevant expected result",
      relevantExpectedResult,
      "Each test case has observable expected results.",
      "One or more test cases need relevant expectedResults.",
    ),
    toFeedback(
      "correct priority",
      correctPriority,
      expectedPriority
        ? `All test cases match the expected ${expectedPriority} priority.`
        : "All test cases include a priority.",
      expectedPriority
        ? `One or more test cases do not match the expected ${expectedPriority} priority.`
        : "One or more test cases are missing priority.",
    ),
    toFeedback(
      "no hallucinated unsupported features",
      noUnsupportedFeatures,
      "No obvious unsupported feature claims were detected.",
      "Output appears to mention unsupported actions or integrations.",
    ),
  ];

  return {
    score: feedback.filter((item) => item.passed).length,
    maxScore: qaGeniusQualityCriteria.length,
    feedback,
  };
}
