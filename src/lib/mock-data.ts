export type ProjectType = "Test Automation" | "RPA";
export type RunStatus = "passed" | "failed" | "running" | "skipped";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface TestCase {
  id: string;
  title: string;
  steps: string[];
  expected: string;
  priority: "P1" | "P2" | "P3";
  status: RunStatus;
  lastRun: string;
  durationMs: number;
  tags: string[];
  linkedApi?: string;
  linkedScript?: string;
  attachments: { name: string; type: "screenshot" | "data" | "log" }[];
}

export interface Script {
  id: string;
  name: string;
  framework: "Selenium" | "Cypress" | "Playwright" | "Robot Framework" | "Python" | "JavaScript";
  cases: number;
  updated: string;
  language: "robot" | "python" | "javascript" | "typescript";
  version: string;
  content: string;
  path: string;
}

export interface RpaFlow {
  id: string;
  name: string;
  steps: { label: string; type: "open" | "input" | "click" | "extract" | "save" | "api" }[];
  schedule: string;
  lastRun: string;
  status: RunStatus;
}

export interface RunRecord {
  id: string;
  name: string;
  date: string;
  duration: string;
  passed: number;
  failed: number;
  skipped: number;
  trigger: "Manual" | "Scheduled" | "CI/CD";
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  expectedStatus: number;
  lastStatus?: number;
  lastDurationMs?: number;
  tags: string[];
}

export interface MobileDevice {
  id: string;
  name: string;
  os: "Android" | "iOS";
  version: string;
  status: "online" | "offline" | "busy";
}

export interface MobileBuild {
  id: string;
  name: string;
  platform: "Android" | "iOS";
  size: string;
  uploaded: string;
  version: string;
}

export interface Environment {
  id: string;
  name: "Dev" | "UAT" | "Prod";
  baseUrl: string;
  variables: { key: string; value: string; secret?: boolean }[];
}

export interface TestSuite {
  id: string;
  name: string;
  caseIds: string[];
  schedule?: string;
}

export interface DiscussionPost {
  id: string;
  author: string;
  initials: string;
  date: string;
  title: string;
  body: string;
  replies: number;
  linkedTo?: { type: "case" | "api" | "run"; id: string; label: string };
  tags: string[];
}

export interface FlakyTest {
  id: string;
  title: string;
  failureRate: number;
  lastFailures: number;
}

export interface Coverage {
  ui: number;
  api: number;
  mobile: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  color: string;
  initials: string;
  cases: number;
  passRate: number;
  lastRun: string;
  members: number;
  scripts: Script[];
  flows: RpaFlow[];
  testCases: TestCase[];
  runs: RunRecord[];
  apis: ApiEndpoint[];
  devices: MobileDevice[];
  builds: MobileBuild[];
  environments: Environment[];
  suites: TestSuite[];
  discussions: DiscussionPost[];
  flaky: FlakyTest[];
  coverage: Coverage;
  trend: { day: string; pass: number; fail: number }[];
}

const tmforceTrend = [
  { day: "Mon", pass: 92, fail: 8 },
  { day: "Tue", pass: 95, fail: 5 },
  { day: "Wed", pass: 88, fail: 12 },
  { day: "Thu", pass: 96, fail: 4 },
  { day: "Fri", pass: 91, fail: 9 },
  { day: "Sat", pass: 97, fail: 3 },
  { day: "Sun", pass: 96, fail: 4 },
];

const inttTrend = [
  { day: "Mon", pass: 89, fail: 11 },
  { day: "Tue", pass: 90, fail: 10 },
  { day: "Wed", pass: 86, fail: 14 },
  { day: "Thu", pass: 92, fail: 8 },
  { day: "Fri", pass: 91, fail: 9 },
  { day: "Sat", pass: 93, fail: 7 },
  { day: "Sun", pass: 91, fail: 9 },
];

const cameliaTrend = [
  { day: "Mon", pass: 90, fail: 10 },
  { day: "Tue", pass: 88, fail: 12 },
  { day: "Wed", pass: 92, fail: 8 },
  { day: "Thu", pass: 85, fail: 15 },
  { day: "Fri", pass: 80, fail: 20 },
  { day: "Sat", pass: 88, fail: 12 },
  { day: "Sun", pass: 88, fail: 12 },
];

const robotSample = `*** Settings ***
Library    SeleniumLibrary
Library    RequestsLibrary

*** Variables ***
\${BASE_URL}      \${ENV.BASE_URL}
\${BROWSER}       chrome

*** Test Cases ***
Login With Valid SSO
    Open Browser    \${BASE_URL}/login    \${BROWSER}
    Click Element    id=sso-button
    Input Text       id=email       \${ENV.SSO_USER}
    Input Password   id=password    \${ENV.SSO_PASS}
    Click Button     id=submit
    Wait Until Page Contains    Dashboard    timeout=10s
    Close Browser
`;

const playwrightSample = `import { test, expect } from '@playwright/test';

test.describe('Leads pipeline', () => {
  test('create new lead', async ({ page }) => {
    await page.goto(process.env.BASE_URL + '/pipeline');
    await page.getByRole('button', { name: '+ Lead' }).click();
    await page.fill('[name=name]', 'Acme Corp');
    await page.fill('[name=value]', '120000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Acme Corp')).toBeVisible();
  });
});
`;

const pythonSample = `import requests, os

BASE = os.environ["BASE_URL"]
TOKEN = os.environ["API_KEY"]

def test_orders_endpoint():
    r = requests.post(
        f"{BASE}/v2/orders",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json={"sku": "X-100", "qty": 2},
    )
    assert r.status_code == 201
    assert "order_id" in r.json()
`;

export const projects: Project[] = [
  {
    id: "tmforce",
    name: "TMForce",
    description: "End-to-end automation suite for the TMForce sales workforce platform.",
    type: "Test Automation",
    color: "from-violet-400 to-indigo-500",
    initials: "TM",
    cases: 184,
    passRate: 96,
    lastRun: "2 hours ago",
    members: 8,
    coverage: { ui: 78, api: 92, mobile: 54 },
    trend: tmforceTrend,
    scripts: [
      {
        id: "s1",
        name: "auth.spec.ts",
        framework: "Playwright",
        cases: 12,
        updated: "Today",
        language: "typescript",
        version: "v1.4.2",
        path: "/automation/auth/auth.spec.ts",
        content: playwrightSample,
      },
      {
        id: "s2",
        name: "leads-pipeline.spec.ts",
        framework: "Playwright",
        cases: 28,
        updated: "Yesterday",
        language: "typescript",
        version: "v2.1.0",
        path: "/automation/leads/leads-pipeline.spec.ts",
        content: playwrightSample,
      },
      {
        id: "s3",
        name: "login_flow.robot",
        framework: "Robot Framework",
        cases: 9,
        updated: "2d ago",
        language: "robot",
        version: "v1.0.5",
        path: "/automation/robot/login_flow.robot",
        content: robotSample,
      },
    ],
    flows: [],
    apis: [
      {
        id: "a1",
        name: "Login (SSO)",
        method: "POST",
        url: "https://api.tmforce.io/v1/auth/sso",
        headers: { "Content-Type": "application/json" },
        body: `{\n  "email": "qe@tmforce.io",\n  "token": "{{SSO_TOKEN}}"\n}`,
        expectedStatus: 200,
        lastStatus: 200,
        lastDurationMs: 412,
        tags: ["auth", "smoke"],
      },
      {
        id: "a2",
        name: "Create lead",
        method: "POST",
        url: "https://api.tmforce.io/v1/leads",
        headers: { Authorization: "Bearer {{API_KEY}}", "Content-Type": "application/json" },
        body: `{\n  "name": "Acme Corp",\n  "value": 120000,\n  "stage": "new"\n}`,
        expectedStatus: 201,
        lastStatus: 201,
        lastDurationMs: 287,
        tags: ["leads", "regression"],
      },
      {
        id: "a3",
        name: "Export report",
        method: "GET",
        url: "https://api.tmforce.io/v1/reports/weekly",
        headers: { Authorization: "Bearer {{API_KEY}}" },
        expectedStatus: 200,
        lastStatus: 500,
        lastDurationMs: 8800,
        tags: ["reports"],
      },
    ],
    devices: [
      { id: "d1", name: "Pixel 8 Pro", os: "Android", version: "14", status: "online" },
      { id: "d2", name: "iPhone 15", os: "iOS", version: "17.4", status: "online" },
      { id: "d3", name: "Galaxy S23", os: "Android", version: "13", status: "busy" },
    ],
    builds: [
      {
        id: "b1",
        name: "tmforce-mobile-v3.4.0.apk",
        platform: "Android",
        size: "48 MB",
        uploaded: "Today",
        version: "3.4.0",
      },
      {
        id: "b2",
        name: "tmforce-mobile-v3.4.0.ipa",
        platform: "iOS",
        size: "52 MB",
        uploaded: "Today",
        version: "3.4.0",
      },
    ],
    environments: [
      {
        id: "e1",
        name: "Dev",
        baseUrl: "https://dev.tmforce.io",
        variables: [
          { key: "BASE_URL", value: "https://dev.tmforce.io" },
          { key: "API_KEY", value: "tm_dev_***", secret: true },
        ],
      },
      {
        id: "e2",
        name: "UAT",
        baseUrl: "https://uat.tmforce.io",
        variables: [
          { key: "BASE_URL", value: "https://uat.tmforce.io" },
          { key: "API_KEY", value: "tm_uat_***", secret: true },
        ],
      },
      {
        id: "e3",
        name: "Prod",
        baseUrl: "https://app.tmforce.io",
        variables: [
          { key: "BASE_URL", value: "https://app.tmforce.io" },
          { key: "API_KEY", value: "tm_prod_***", secret: true },
        ],
      },
    ],
    suites: [
      { id: "su1", name: "Smoke suite", caseIds: ["TM-001", "TM-002"], schedule: "Every push" },
      {
        id: "su2",
        name: "Nightly regression",
        caseIds: ["TM-001", "TM-002", "TM-003", "TM-004"],
        schedule: "Daily 02:00",
      },
      { id: "su3", name: "Reports module", caseIds: ["TM-003"] },
    ],
    discussions: [
      {
        id: "p1",
        author: "Sara Lim",
        initials: "SL",
        date: "2h ago",
        title: "Reports export endpoint returning 500",
        body: "GET /v1/reports/weekly is consistently returning 500 on UAT since this morning. Linked the failing API + recent run.",
        replies: 4,
        linkedTo: { type: "api", id: "a3", label: "GET /v1/reports/weekly" },
        tags: ["bug", "uat"],
      },
      {
        id: "p2",
        author: "Marco V.",
        initials: "MV",
        date: "Yesterday",
        title: "Flaky: bulk reassign sometimes times out",
        body: "TM-004 fails ~1 in 8 runs. Possibly related to debounce on the reassign call.",
        replies: 2,
        linkedTo: { type: "case", id: "TM-004", label: "TM-004 Bulk reassign" },
        tags: ["flaky"],
      },
    ],
    flaky: [
      { id: "TM-004", title: "Bulk reassign leads to manager", failureRate: 12, lastFailures: 3 },
      { id: "TM-007", title: "Pipeline drag & drop on Safari", failureRate: 18, lastFailures: 5 },
    ],
    testCases: [
      {
        id: "TM-001",
        title: "Login with valid SSO credentials",
        steps: ["Open /login", "Click SSO", "Enter credentials", "Submit"],
        expected: "User lands on dashboard",
        priority: "P1",
        status: "passed",
        lastRun: "2h ago",
        durationMs: 4200,
        tags: ["login", "smoke", "auth"],
        linkedApi: "a1",
        linkedScript: "s1",
        attachments: [{ name: "dashboard.png", type: "screenshot" }],
      },
      {
        id: "TM-002",
        title: "Create new lead from pipeline view",
        steps: ["Open Pipeline", "Click + Lead", "Fill form", "Save"],
        expected: "Lead appears in column 'New'",
        priority: "P1",
        status: "passed",
        lastRun: "2h ago",
        durationMs: 6100,
        tags: ["leads", "regression"],
        linkedApi: "a2",
        linkedScript: "s2",
        attachments: [{ name: "lead-data.json", type: "data" }],
      },
      {
        id: "TM-003",
        title: "Export weekly performance report",
        steps: ["Open Reports", "Select week range", "Click Export"],
        expected: "PDF downloads with correct totals",
        priority: "P2",
        status: "failed",
        lastRun: "2h ago",
        durationMs: 8800,
        tags: ["reports", "export"],
        linkedApi: "a3",
        attachments: [
          { name: "failure-screenshot.png", type: "screenshot" },
          { name: "trace.log", type: "log" },
        ],
      },
      {
        id: "TM-004",
        title: "Bulk reassign leads to manager",
        steps: ["Filter leads", "Select all", "Reassign"],
        expected: "Leads updated for manager",
        priority: "P2",
        status: "passed",
        lastRun: "2h ago",
        durationMs: 5400,
        tags: ["leads", "bulk", "flaky"],
        attachments: [],
      },
    ],
    runs: [
      {
        id: "r1",
        name: "Nightly regression #482",
        date: "Today, 02:00",
        duration: "12m 04s",
        passed: 176,
        failed: 6,
        skipped: 2,
        trigger: "Scheduled",
      },
      {
        id: "r2",
        name: "PR #1284 smoke",
        date: "Today, 09:14",
        duration: "3m 18s",
        passed: 24,
        failed: 0,
        skipped: 0,
        trigger: "CI/CD",
      },
      {
        id: "r3",
        name: "Manual exploratory",
        date: "Yesterday, 17:42",
        duration: "8m 51s",
        passed: 60,
        failed: 1,
        skipped: 4,
        trigger: "Manual",
      },
    ],
  },
  {
    id: "intt",
    name: "INTT",
    description: "Intelligent network testing toolkit covering API, contract and UI layers.",
    type: "Test Automation",
    color: "from-sky-400 to-cyan-500",
    initials: "IN",
    cases: 312,
    passRate: 91,
    lastRun: "27 minutes ago",
    members: 12,
    coverage: { ui: 64, api: 96, mobile: 28 },
    trend: inttTrend,
    scripts: [
      {
        id: "s1",
        name: "billing-api.spec.ts",
        framework: "Playwright",
        cases: 42,
        updated: "Today",
        language: "typescript",
        version: "v3.0.1",
        path: "/automation/api/billing-api.spec.ts",
        content: playwrightSample,
      },
      {
        id: "s2",
        name: "checkout_test.py",
        framework: "Python",
        cases: 18,
        updated: "Today",
        language: "python",
        version: "v1.7.0",
        path: "/automation/python/checkout_test.py",
        content: pythonSample,
      },
      {
        id: "s3",
        name: "contracts.robot",
        framework: "Robot Framework",
        cases: 22,
        updated: "3d ago",
        language: "robot",
        version: "v2.2.0",
        path: "/automation/robot/contracts.robot",
        content: robotSample,
      },
    ],
    flows: [],
    apis: [
      {
        id: "a1",
        name: "Create order",
        method: "POST",
        url: "https://api.intt.dev/v2/orders",
        headers: { Authorization: "Bearer {{API_KEY}}" },
        body: `{\n  "sku": "X-100",\n  "qty": 2\n}`,
        expectedStatus: 201,
        lastStatus: 201,
        lastDurationMs: 142,
        tags: ["orders"],
      },
      {
        id: "a2",
        name: "Retry payment",
        method: "POST",
        url: "https://api.intt.dev/v2/payments/retry",
        headers: { Authorization: "Bearer {{API_KEY}}" },
        body: `{\n  "payment_id": "p_42"\n}`,
        expectedStatus: 200,
        lastStatus: 504,
        lastDurationMs: 9700,
        tags: ["payments", "flaky"],
      },
      {
        id: "a3",
        name: "Pricing schema",
        method: "GET",
        url: "https://api.intt.dev/v3/pricing/schema",
        headers: {},
        expectedStatus: 200,
        lastStatus: 200,
        lastDurationMs: 88,
        tags: ["contract"],
      },
    ],
    devices: [
      { id: "d1", name: "Pixel 7", os: "Android", version: "13", status: "online" },
      { id: "d2", name: "iPhone 14", os: "iOS", version: "17.2", status: "offline" },
    ],
    builds: [
      {
        id: "b1",
        name: "intt-checker-v1.2.0.apk",
        platform: "Android",
        size: "22 MB",
        uploaded: "Yesterday",
        version: "1.2.0",
      },
    ],
    environments: [
      {
        id: "e1",
        name: "Dev",
        baseUrl: "https://dev.api.intt.dev",
        variables: [
          { key: "BASE_URL", value: "https://dev.api.intt.dev" },
          { key: "API_KEY", value: "intt_dev_***", secret: true },
        ],
      },
      {
        id: "e2",
        name: "UAT",
        baseUrl: "https://uat.api.intt.dev",
        variables: [
          { key: "BASE_URL", value: "https://uat.api.intt.dev" },
          { key: "API_KEY", value: "intt_uat_***", secret: true },
        ],
      },
      {
        id: "e3",
        name: "Prod",
        baseUrl: "https://api.intt.dev",
        variables: [
          { key: "BASE_URL", value: "https://api.intt.dev" },
          { key: "API_KEY", value: "intt_prod_***", secret: true },
        ],
      },
    ],
    suites: [
      {
        id: "su1",
        name: "API regression",
        caseIds: ["INT-101", "INT-102", "INT-103"],
        schedule: "Daily 11:00",
      },
      { id: "su2", name: "Contract checks", caseIds: ["INT-103"], schedule: "Hourly" },
    ],
    discussions: [
      {
        id: "p1",
        author: "Aiden K.",
        initials: "AK",
        date: "30m ago",
        title: "Payment retry consistently times out at gateway",
        body: "INT-102 + a2 are red. Gateway sandbox seems to return 504. Anyone seeing this elsewhere?",
        replies: 6,
        linkedTo: { type: "api", id: "a2", label: "POST /v2/payments/retry" },
        tags: ["bug", "p1"],
      },
    ],
    flaky: [
      {
        id: "INT-102",
        title: "Checkout retry after gateway timeout",
        failureRate: 22,
        lastFailures: 4,
      },
    ],
    testCases: [
      {
        id: "INT-101",
        title: "POST /v2/orders returns 201",
        steps: ["Auth as user", "POST order payload"],
        expected: "201 with order id",
        priority: "P1",
        status: "passed",
        lastRun: "27m ago",
        durationMs: 1100,
        tags: ["api", "orders"],
        linkedApi: "a1",
        linkedScript: "s1",
        attachments: [],
      },
      {
        id: "INT-102",
        title: "Checkout retry after gateway timeout",
        steps: ["Simulate timeout", "Retry payment"],
        expected: "Second attempt succeeds",
        priority: "P1",
        status: "failed",
        lastRun: "27m ago",
        durationMs: 9700,
        tags: ["api", "payments", "flaky"],
        linkedApi: "a2",
        linkedScript: "s2",
        attachments: [{ name: "gateway.log", type: "log" }],
      },
      {
        id: "INT-103",
        title: "Contract: pricing v3 schema",
        steps: ["Run pact test"],
        expected: "Schema valid",
        priority: "P2",
        status: "passed",
        lastRun: "27m ago",
        durationMs: 800,
        tags: ["contract"],
        linkedApi: "a3",
        linkedScript: "s3",
        attachments: [],
      },
    ],
    runs: [
      {
        id: "r1",
        name: "API regression #211",
        date: "Today, 11:00",
        duration: "6m 22s",
        passed: 284,
        failed: 8,
        skipped: 20,
        trigger: "Scheduled",
      },
      {
        id: "r2",
        name: "Release 4.7 candidate",
        date: "Yesterday, 19:00",
        duration: "22m 09s",
        passed: 305,
        failed: 7,
        skipped: 0,
        trigger: "CI/CD",
      },
    ],
  },
  {
    id: "camelia",
    name: "Camelia",
    description: "RPA bots for back-office finance reconciliation and reporting workflows.",
    type: "RPA",
    color: "from-rose-400 to-pink-500",
    initials: "CA",
    cases: 24,
    passRate: 88,
    lastRun: "1 day ago",
    members: 5,
    coverage: { ui: 40, api: 60, mobile: 0 },
    trend: cameliaTrend,
    scripts: [],
    flows: [
      {
        id: "f1",
        name: "Daily ledger reconciliation",
        steps: [
          { label: "Open SAP", type: "open" },
          { label: "Login as bot user", type: "input" },
          { label: "Export ledger CSV", type: "extract" },
          { label: "Compare with Snowflake", type: "api" },
          { label: "Email diff to finance", type: "save" },
        ],
        schedule: "Daily · 06:30",
        lastRun: "Today 06:30",
        status: "passed",
      },
      {
        id: "f2",
        name: "Vendor invoice scraping",
        steps: [
          { label: "Open vendor portal", type: "open" },
          { label: "Iterate invoice list", type: "click" },
          { label: "Download PDFs", type: "extract" },
          { label: "Push to S3 bucket", type: "save" },
        ],
        schedule: "Weekly · Mon 08:00",
        lastRun: "Mon 08:00",
        status: "passed",
      },
      {
        id: "f3",
        name: "Weekly KPI deck builder",
        steps: [
          { label: "Pull BI dashboards", type: "api" },
          { label: "Screenshot panels", type: "extract" },
          { label: "Compose .pptx", type: "save" },
          { label: "Upload to SharePoint", type: "save" },
        ],
        schedule: "Weekly · Fri 17:00",
        lastRun: "Fri 17:00",
        status: "failed",
      },
    ],
    apis: [
      {
        id: "a1",
        name: "Snowflake ledger query",
        method: "POST",
        url: "https://camelia.snowflake.com/api/v2/query",
        headers: { Authorization: "Bearer {{SNOWFLAKE_TOKEN}}" },
        body: `{ "sql": "SELECT * FROM ledger WHERE date = CURRENT_DATE()" }`,
        expectedStatus: 200,
        lastStatus: 200,
        lastDurationMs: 1240,
        tags: ["rpa", "ledger"],
      },
    ],
    devices: [],
    builds: [],
    environments: [
      {
        id: "e1",
        name: "Dev",
        baseUrl: "https://dev.bots.camelia.io",
        variables: [
          { key: "BOT_USER", value: "bot_dev" },
          { key: "SNOWFLAKE_TOKEN", value: "sf_dev_***", secret: true },
        ],
      },
      {
        id: "e2",
        name: "Prod",
        baseUrl: "https://bots.camelia.io",
        variables: [
          { key: "BOT_USER", value: "bot_prod" },
          { key: "SNOWFLAKE_TOKEN", value: "sf_prod_***", secret: true },
        ],
      },
    ],
    suites: [
      { id: "su1", name: "Daily finance bots", caseIds: ["CA-001"], schedule: "Daily 06:30" },
    ],
    discussions: [
      {
        id: "p1",
        author: "Priya N.",
        initials: "PN",
        date: "Fri 18:10",
        title: "KPI deck bot fails on SharePoint upload",
        body: "Bot CA-002 / flow f3 throws on the upload step. Token may have rotated.",
        replies: 3,
        linkedTo: { type: "case", id: "CA-002", label: "CA-002 KPI deck rendering" },
        tags: ["bug"],
      },
    ],
    flaky: [{ id: "CA-002", title: "Bot: KPI deck rendering", failureRate: 30, lastFailures: 2 }],
    testCases: [
      {
        id: "CA-001",
        title: "Bot: ledger export end-to-end",
        steps: ["Trigger flow", "Verify output file"],
        expected: "Ledger.csv created with 2k+ rows",
        priority: "P1",
        status: "passed",
        lastRun: "1d ago",
        durationMs: 42000,
        tags: ["rpa", "ledger"],
        attachments: [],
      },
      {
        id: "CA-002",
        title: "Bot: KPI deck rendering",
        steps: ["Trigger flow", "Verify SharePoint upload"],
        expected: "File present, ≥10 slides",
        priority: "P2",
        status: "failed",
        lastRun: "1d ago",
        durationMs: 78000,
        tags: ["rpa", "kpi"],
        attachments: [{ name: "sharepoint-error.log", type: "log" }],
      },
    ],
    runs: [
      {
        id: "r1",
        name: "Daily ledger #128",
        date: "Today, 06:30",
        duration: "1m 42s",
        passed: 1,
        failed: 0,
        skipped: 0,
        trigger: "Scheduled",
      },
      {
        id: "r2",
        name: "KPI deck #44",
        date: "Fri, 17:00",
        duration: "3m 12s",
        passed: 0,
        failed: 1,
        skipped: 0,
        trigger: "Scheduled",
      },
    ],
  },
];

export const getProject = (id: string) => projects.find((p) => p.id === id);

export const trendData = tmforceTrend;
