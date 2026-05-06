import type { ComponentType } from "react";
import {
  BookOpen,
  ClipboardList,
  Cpu,
  Plug,
  PlayCircle,
  BarChart3,
  CalendarClock,
} from "lucide-react";

export type TutorialStep = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  summary: string;
  detail: string[];
};

export const faqGroups = [
  {
    label: "Getting started",
    items: [
      {
        q: "What is QE Automation Hub?",
        a: "QE Automation Hub is a unified workspace where QE teams manage Test Automation suites and RPA bots. You can create folder-style projects, store scripts (Playwright, Cypress, Robot Framework, Python), define API endpoints, build RPA flows, run tests, and review results — all in one place.",
      },
      {
        q: "How do I create a new project?",
        a: "Open the **Projects** page from the sidebar, click **+ Create project**, give it a name, description, and pick a type (`Test Automation` or `RPA`). The new project appears as a card and opens into a full workspace with tabs for Cases, Scripts, APIs, Execution, and Results.",
      },
      {
        q: "What's the difference between Test Automation and RPA projects?",
        a: "**Test Automation** projects expose tabs for Scripts, Mobile, and Web & Suites — built for QE engineers running Selenium / Cypress / Playwright. **RPA** projects swap the Scripts tab for an **RPA Builder** with a step-based flow editor (Open → Click → Extract → Save), aimed at back-office automations.",
      },
    ],
  },
  {
    label: "Test cases & scripts",
    items: [
      {
        q: "How do I add a test case?",
        a: "Inside a project go to the **Test Cases** tab and click **+ New case**. You can add steps, expected result, priority, tags, and link the case to an API endpoint or automation script. Click any row to open the detail drawer with attachments and history.",
      },
      {
        q: "Which automation frameworks are supported?",
        a: "Out of the box: **Playwright** (TypeScript), **Cypress**, **Selenium**, **Robot Framework** (`.robot`), and standalone **Python** / **JavaScript** scripts. Each script keeps its own version, file path, and linked test case count.",
      },
      {
        q: "Can I edit scripts inside the app?",
        a: "Yes — open the **Scripts** tab and pick a file. The built-in editor shows the source with syntax-aware formatting. A full Monaco editor with save & diff is on the roadmap.",
      },
    ],
  },
  {
    label: "Execution & results",
    items: [
      {
        q: "How do I run a test or suite?",
        a: "From a project, click **▶ Run all** in the hero, or open the **Execution** tab to start individual cases / suites. Live logs stream into the console panel and a new entry is added to the Results tab when the run completes.",
      },
      {
        q: "Can I schedule runs?",
        a: "Yes. Open the **Schedule** page from the sidebar to set daily / weekly / cron-style triggers per suite. Scheduled runs appear in the global **Runs** log with the `Scheduled` trigger badge.",
      },
      {
        q: "Where do I find screenshots and logs for failed tests?",
        a: "Go to the project's **Results** tab → click a failed run → the artifacts panel lists screenshots, videos, and `.log` files. You can download or preview each artifact, and export the full report to PDF or Excel.",
      },
    ],
  },
  {
    label: "API & RPA",
    items: [
      {
        q: "How does the API Testing module work?",
        a: "Inside a project open the **API Testing** tab, click **+ Add endpoint**, fill in method / URL / headers / body, then press **Send**. The response panel shows status, headers, body, and validation against your expected status. You can save the endpoint as a test case in one click.",
      },
      {
        q: "How do I build an RPA flow?",
        a: "In an RPA project open the **RPA Builder** tab. Each flow is a sequence of typed steps — **Open** a website, **Input** credentials, **Click** elements, **Extract** data, call an **API**, or **Save** to file. Reorder steps and trigger the bot from the Execution tab.",
      },
    ],
  },
  {
    label: "Integrations & settings",
    items: [
      {
        q: "Can I connect CI/CD?",
        a: "Yes. The project **Settings** tab has a CI/CD section for **Jenkins**, **GitHub Actions**, and **GitLab CI**. Once connected, every push or pipeline run can trigger a suite and write results back into the Runs log.",
      },
      {
        q: "How do I manage environments and secrets?",
        a: "Each project has Dev / UAT / Prod environments under the **Web & Suites** tab. Add `BASE_URL`, `API_KEY`, and other variables — values marked **secret** are masked in the UI and never logged.",
      },
    ],
  },
];

export const tutorialSteps: TutorialStep[] = [
  {
    id: "create-project",
    title: "Create your first project",
    icon: BookOpen,
    summary: "Spin up a folder-style workspace for a Test Automation suite or an RPA bot.",
    detail: [
      "Open **Projects** from the left sidebar.",
      "Click the **+ Create project** button in the top right.",
      "Give the project a name (e.g. *Banking Regression*), short description, and pick **Test Automation** or **RPA**.",
      "Hit **Create project** — your new card appears in the grid. Click it to enter the workspace.",
    ],
  },
  {
    id: "add-cases",
    title: "Add test cases",
    icon: ClipboardList,
    summary: "Capture what you're testing — steps, expected result, priority, and tags.",
    detail: [
      "Inside a project open the **Test Cases** tab.",
      "Click **+ New case** and fill in title, steps, and expected result.",
      "Add tags like `login`, `payment`, `regression` to filter and group later.",
      "Optionally link the case to an **API endpoint** or **automation script** — handy for traceability.",
    ],
  },
  {
    id: "scripts",
    title: "Upload or write automation scripts",
    icon: Cpu,
    summary:
      "Store your Playwright, Cypress, Robot Framework, or Python scripts inside the project.",
    detail: [
      "Go to the **Scripts** tab (or **RPA Builder** for RPA projects).",
      "Drop a file or click **+ New script** and pick a framework.",
      "The built-in viewer highlights the code; each script tracks its own version and linked test cases.",
    ],
  },
  {
    id: "api",
    title: "Test an API endpoint",
    icon: Plug,
    summary: "Define endpoints once, send live requests, and turn responses into test cases.",
    detail: [
      "Open the **API Testing** tab and click **+ Add endpoint**.",
      "Choose method (GET / POST / PUT / DELETE), URL, headers, and body.",
      "Click **Send** — the response panel shows status, body, and validation against your expected status.",
      "Hit **Save as test case** to add it to the regression suite.",
    ],
  },
  {
    id: "run",
    title: "Run your tests",
    icon: PlayCircle,
    summary: "Trigger single cases, suites, or the entire project — locally or on CI.",
    detail: [
      "Click **Run all** in the project hero, or open the **Execution** tab for finer control.",
      "Logs stream live into the console panel.",
      "Failed steps automatically capture screenshots and `.log` files.",
    ],
  },
  {
    id: "results",
    title: "Review results & share reports",
    icon: BarChart3,
    summary: "Spot trends, drill into failures, and export reports.",
    detail: [
      "Open the **Results** tab for pass/fail history, flaky test insights, and failure analysis charts.",
      "Click a run to see artifacts (screenshots, videos, logs).",
      "Use **Export** to generate a PDF or Excel report for stakeholders.",
    ],
  },
  {
    id: "schedule",
    title: "Schedule and integrate",
    icon: CalendarClock,
    summary: "Run nightly suites, hook up CI/CD, and route notifications.",
    detail: [
      "Open the **Schedule** page from the sidebar to set daily / weekly cron triggers.",
      "From the project **Settings** tab connect **Jenkins**, **GitHub Actions**, or **GitLab CI**.",
      "Add team members and set roles (Admin / QE / Viewer) to control access.",
    ],
  },
];
