import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomBytes, scryptSync } from "node:crypto";
import { MongoClient } from "mongodb";

const cwd = process.cwd();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(cwd, ".env.local"));
loadEnvFile(path.join(cwd, ".env"));

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || "sqa-portal";

if (!mongoUri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const collections = [
  "users",
  "roles",
  "permissions",
  "password_resets",
  "projects",
  "project_members",
  "tools",
  "help_items",
  "help_faq_groups",
  "help_faq_items",
  "help_tutorial_steps",
  "help_contact",
  "project_tools",
  "files",
  "gallery_items",
  "forum_threads",
  "forum_messages",
  "meetings",
  "copilot_chats",
  "copilot_attachments",
  "sonarqube_configs",
  "sonarqube_scans",
  "sonarqube_issues",
  "audit_logs",
];

const permissions = [
  {
    _id: "manage_users",
    name: "Manage users",
    description: "Create, update, approve, and remove users.",
  },
  {
    _id: "approve_users",
    name: "Approve users",
    description: "Approve or reject pending registrations.",
  },
  {
    _id: "manage_projects",
    name: "Manage projects",
    description: "Create, update, archive, and delete projects.",
  },
  {
    _id: "assign_project_members",
    name: "Assign project members",
    description: "Add or remove users from projects.",
  },
  {
    _id: "assign_project_leader",
    name: "Assign project leader",
    description: "Set or change a project leader.",
  },
  {
    _id: "manage_tools",
    name: "Manage tools",
    description: "Create, update, disable, and delete tools.",
  },
  {
    _id: "enable_project_tools",
    name: "Enable project tools",
    description: "Enable or disable tools for a project.",
  },
  {
    _id: "manage_files",
    name: "Manage files",
    description: "Upload, edit, move, and delete project files.",
  },
  {
    _id: "manage_gallery",
    name: "Manage gallery",
    description: "Upload, update, and remove project gallery items.",
  },
  {
    _id: "manage_forum",
    name: "Manage forum",
    description: "Create threads, reply, and moderate project discussions.",
  },
  {
    _id: "schedule_meetings",
    name: "Schedule meetings",
    description: "Create and update project meetings.",
  },
  {
    _id: "manage_sonarqube",
    name: "Manage SonarQube",
    description: "Configure SonarQube projects and scans.",
  },
  {
    _id: "view_audit_logs",
    name: "View audit logs",
    description: "View system and project audit history.",
  },
  {
    _id: "use_sqa_copilot",
    name: "Use SQA Copilot",
    description: "Use SQA Copilot chat, attachments, and OCR features.",
  },
];

const roles = [
  {
    _id: "admin",
    name: "Admin",
    description: "Full system access.",
    permissions: permissions.map((permission) => permission._id),
  },
  {
    _id: "project_manager",
    name: "Project Manager",
    description: "Manages project setup, members, tools, and delivery workflow.",
    permissions: [
      "manage_projects",
      "assign_project_members",
      "assign_project_leader",
      "manage_tools",
      "enable_project_tools",
      "manage_files",
      "manage_gallery",
      "manage_forum",
      "schedule_meetings",
      "manage_sonarqube",
      "use_sqa_copilot",
    ],
  },
  {
    _id: "project_leader",
    name: "Project Leader",
    description: "Leads daily project execution and collaboration.",
    permissions: [
      "enable_project_tools",
      "manage_files",
      "manage_gallery",
      "manage_forum",
      "schedule_meetings",
      "use_sqa_copilot",
    ],
  },
  {
    _id: "member",
    name: "Member",
    description: "Works inside assigned projects.",
    permissions: ["manage_forum", "schedule_meetings", "use_sqa_copilot"],
  },
  {
    _id: "pending",
    name: "Pending",
    description: "Waiting for admin approval.",
    permissions: [],
  },
];

const tools = [
  {
    _id: "tool-sonarqube",
    name: "Security Scanner",
    slug: "security-scanner",
    description: "Scanner for code quality and security issues",
    logoUrl: "/media/images/tools/Scanner.png",
    url: "/tools/security-scanner",
    category: "built-in",
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
  },
  {
    _id: "tool-stt",
    name: "STT",
    slug: "stt",
    description: "Video Streaming Test Tool",
    logoUrl: "",
    url: "/tools/stt",
    category: "built-in",
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
  },
  {
    _id: "tool-orca",
    name: "Orca",
    slug: "orca",
    description: "Automated Recording and Replaying User Interactions",
    logoUrl: "",
    url: "/tools/orca",
    category: "built-in",
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
  },
  {
    _id: "tool-qa-genius",
    name: "QA Genius",
    slug: "qa-genius",
    description: "AI Powered Test Case Generator",
    logoUrl: "",
    url: "/tools/qa-genius",
    category: "built-in",
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
  },
  {
    _id: "tool-qe-automation",
    name: "QE Robot Framework Automation",
    slug: "qe-robot-framework-automation",
    description: "Automation Framework Used for Test Automation and Robotic Process Automation",
    logoUrl: "",
    url: "/tools/qe",
    category: "built-in",
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
  },
  {
    _id: "tool-performance-testing",
    name: "Performance Testing",
    slug: "performance-testing",
    description: "Performance Testing",
    logoUrl: "",
    url: "/tools/performance",
    category: "built-in",
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
  },
];

const helpItems = [
  {
    _id: "help-faq",
    title: "FAQ",
    slug: "faq",
    description: "Answers to common questions about projects, runs, RPA and integrations.",
    href: "/help/faq",
    icon: "help-circle",
    color: "from-amber-400 to-rose-500",
    category: "support",
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "help-tutorial",
    title: "Tutorial",
    slug: "tutorial",
    description: "Step-by-step walkthrough to get productive in minutes.",
    href: "/help/tutorial",
    icon: "graduation-cap",
    color: "from-emerald-400 to-sky-500",
    category: "support",
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "help-contact",
    title: "Contact",
    slug: "contact",
    description: "Reach the system owner directly via phone or email.",
    href: "/help/contact",
    icon: "phone",
    color: "from-violet-500 to-indigo-500",
    category: "support",
    sortOrder: 30,
    isActive: true,
  },
];

const helpFaqGroups = [
  {
    _id: "faq-getting-started",
    label: "Getting started",
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "faq-test-cases-scripts",
    label: "Test cases & scripts",
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "faq-execution-results",
    label: "Execution & results",
    sortOrder: 30,
    isActive: true,
  },
  {
    _id: "faq-api-rpa",
    label: "API & RPA",
    sortOrder: 40,
    isActive: true,
  },
  {
    _id: "faq-integrations-settings",
    label: "Integrations & settings",
    sortOrder: 50,
    isActive: true,
  },
];

const helpFaqItems = [
  {
    _id: "faq-what-is-qe-automation-hub",
    groupId: "faq-getting-started",
    question: "What is QE Automation Hub?",
    answer:
      "QE Automation Hub is a unified workspace where QE teams manage Test Automation suites and RPA bots. You can create projects, store scripts, define API endpoints, build RPA flows, run tests, and review results in one place.",
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "faq-create-new-project",
    groupId: "faq-getting-started",
    question: "How do I create a new project?",
    answer:
      "Open the **Projects** page from the sidebar, click **Create project**, add a name, description, and project type, then submit the form.",
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "faq-project-types",
    groupId: "faq-getting-started",
    question: "What's the difference between Test Automation and RPA projects?",
    answer:
      "**Test Automation** projects focus on scripts, suites, and execution results. **RPA** projects focus on step-based automation flows such as Open, Click, Extract, and Save.",
    sortOrder: 30,
    isActive: true,
  },
  {
    _id: "faq-add-test-case",
    groupId: "faq-test-cases-scripts",
    question: "How do I add a test case?",
    answer:
      "Inside a project, open the **Test Cases** tab and create a new case with steps, expected result, priority, and tags.",
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "faq-frameworks",
    groupId: "faq-test-cases-scripts",
    question: "Which automation frameworks are supported?",
    answer:
      "The portal is designed around Playwright, Cypress, Selenium, Robot Framework, Python, and JavaScript automation scripts.",
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "faq-run-test",
    groupId: "faq-execution-results",
    question: "How do I run a test or suite?",
    answer:
      "Open a project and use the run controls from the project workspace. Results and logs are recorded after the run finishes.",
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "faq-schedule-runs",
    groupId: "faq-execution-results",
    question: "Can I schedule runs?",
    answer:
      "Yes. Open the **Schedule** page from the sidebar to configure recurring runs for selected suites.",
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "faq-api-testing",
    groupId: "faq-api-rpa",
    question: "How does the API Testing module work?",
    answer:
      "Inside a project, define an endpoint with method, URL, headers, and body, then send the request and review the response.",
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "faq-rpa-flow",
    groupId: "faq-api-rpa",
    question: "How do I build an RPA flow?",
    answer:
      "Create a sequence of typed steps such as Open, Input, Click, Extract, API, and Save, then run the flow from the project workspace.",
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "faq-cicd",
    groupId: "faq-integrations-settings",
    question: "Can I connect CI/CD?",
    answer:
      "Yes. The project settings area is intended for CI/CD integrations such as Jenkins, GitHub Actions, and GitLab CI.",
    sortOrder: 10,
    isActive: true,
  },
];

const helpTutorialSteps = [
  {
    _id: "tutorial-create-project",
    title: "Create your first project",
    icon: "book-open",
    summary: "Spin up a workspace for a Test Automation suite or an RPA bot.",
    detail: [
      "Open **Projects** from the left sidebar.",
      "Click the **Create project** button.",
      "Give the project a name, description, and type.",
      "Create the project and open its workspace.",
    ],
    sortOrder: 10,
    isActive: true,
  },
  {
    _id: "tutorial-add-cases",
    title: "Add test cases",
    icon: "clipboard-list",
    summary: "Capture what you're testing with steps, expected result, priority, and tags.",
    detail: [
      "Inside a project, open the **Test Cases** tab.",
      "Create a new case and fill in the main details.",
      "Add tags so the case is easier to filter later.",
      "Link it to scripts or API endpoints when needed.",
    ],
    sortOrder: 20,
    isActive: true,
  },
  {
    _id: "tutorial-scripts",
    title: "Upload or write automation scripts",
    icon: "cpu",
    summary: "Store your automation scripts inside the project workspace.",
    detail: [
      "Go to the **Scripts** tab.",
      "Upload a file or create a new script entry.",
      "Choose the framework or script type.",
      "Keep the script connected to the related test case.",
    ],
    sortOrder: 30,
    isActive: true,
  },
  {
    _id: "tutorial-run",
    title: "Run your tests",
    icon: "play-circle",
    summary: "Trigger single cases, suites, or the whole project.",
    detail: [
      "Open the execution area in the project.",
      "Choose what you want to run.",
      "Watch the status while the run is processed.",
      "Review logs and results after completion.",
    ],
    sortOrder: 40,
    isActive: true,
  },
  {
    _id: "tutorial-results",
    title: "Review results & share reports",
    icon: "bar-chart-3",
    summary: "Spot trends, drill into failures, and export reports.",
    detail: [
      "Open the **Results** tab.",
      "Select a run to inspect failures and artifacts.",
      "Use reports to share findings with stakeholders.",
    ],
    sortOrder: 50,
    isActive: true,
  },
];

const helpContact = [
  {
    _id: "primary",
    name: "Hazami",
    initials: "HZ",
    role: "System Developer & Owner",
    phone: "+60 19-736 6813",
    email: "muhdhazami157@gmail.com",
    availability: "Mon - Fri / 9:00 AM - 6:00 PM (GMT+8)",
    githubUrl: "https://github.com/zamie0",
    linkedinUrl: "https://www.linkedin.com/in/muhd-hazami-3a84112a2/",
    supportMessage:
      "For bug reports, account help, feature requests or anything else about QE Hub.",
  },
];

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const users = [
  {
    _id: "admin-seed",
    username: "adminpower",
    fullName: "System Administrator",
    email: "admin@sqa.local",
    passwordHash: hashPassword("adminpowertocontrol"),
    role: "admin",
    status: "approved",
    createdAt: 0,
    about: "System administrator for SQA Portal.",
    skills: "User approval, QA governance, portal administration",
  },
];

async function createCollectionIfMissing(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name);
  }
}

async function upsertSeed(collection, documents) {
  if (documents.length === 0) return;

  await collection.bulkWrite(
    documents.map((document) => ({
      replaceOne: {
        filter: { _id: document._id },
        replacement: {
          ...document,
          seededAt: new Date(),
          updatedAt: new Date(),
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

async function insertMissing(collection, documents) {
  for (const document of documents) {
    await collection.updateOne(
      { _id: document._id },
      {
        $setOnInsert: {
          ...document,
          seededAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

async function upsertTools(collection, documents) {
  for (const document of documents) {
    const { _id, ...tool } = document;
    await collection.updateOne(
      { slug: document.slug },
      {
        $set: {
          ...tool,
          updatedAt: new Date(),
        },
        $unset: {
          isScanner: "",
        },
        $setOnInsert: {
          _id,
          seededAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true }),
    db.collection("projects").createIndex({ name: 1 }),
    db.collection("password_resets").createIndex({ status: 1, createdAt: -1 }),
    db.collection("project_members").createIndex({ projectId: 1, userId: 1 }, { unique: true }),
    db.collection("tools").createIndex({ name: 1 }),
    db.collection("help_items").createIndex({ slug: 1 }, { unique: true }),
    db.collection("help_items").createIndex({ isActive: 1, sortOrder: 1 }),
    db.collection("help_faq_groups").createIndex({ sortOrder: 1 }),
    db.collection("help_faq_items").createIndex({ groupId: 1, sortOrder: 1 }),
    db.collection("help_tutorial_steps").createIndex({ sortOrder: 1 }),
    db.collection("project_tools").createIndex({ projectId: 1, toolId: 1 }, { unique: true }),
    db.collection("files").createIndex({ projectId: 1 }),
    db.collection("gallery_items").createIndex({ projectId: 1 }),
    db.collection("forum_threads").createIndex({ projectId: 1, updatedAt: -1 }),
    db.collection("forum_messages").createIndex({ threadId: 1, createdAt: 1 }),
    db.collection("meetings").createIndex({ projectId: 1, startsAt: 1 }),
    db.collection("copilot_chats").createIndex({ projectId: 1, updatedAt: -1 }),
    db.collection("copilot_attachments").createIndex({ chatId: 1 }),
    db.collection("sonarqube_configs").createIndex({ projectId: 1 }),
    db.collection("sonarqube_scans").createIndex({ projectId: 1, scannedAt: -1 }),
    db.collection("sonarqube_issues").createIndex({ scanId: 1 }),
    db.collection("audit_logs").createIndex({ createdAt: -1 }),
  ]);
}

async function seed() {
  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(mongoDbName);

  for (const collection of collections) {
    await createCollectionIfMissing(db, collection);
  }

  await upsertSeed(db.collection("permissions"), permissions);
  await upsertSeed(db.collection("roles"), roles);
  await upsertTools(db.collection("tools"), tools);
  await insertMissing(db.collection("help_items"), helpItems);
  await insertMissing(db.collection("help_faq_groups"), helpFaqGroups);
  await insertMissing(db.collection("help_faq_items"), helpFaqItems);
  await insertMissing(db.collection("help_tutorial_steps"), helpTutorialSteps);
  await insertMissing(db.collection("help_contact"), helpContact);
  await insertMissing(db.collection("users"), users);
  await ensureIndexes(db);

  await client.close();

  console.log(
    JSON.stringify(
      {
        status: "seeded",
        database: mongoDbName,
        collections: collections.length,
        roles: roles.length,
        permissions: permissions.length,
        users: users.length,
      },
      null,
      2,
    ),
  );
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
