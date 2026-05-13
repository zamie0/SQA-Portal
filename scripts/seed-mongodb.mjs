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
    url: "/sonarqube/",
    category: "built-in",
    isScanner: true,
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
    url: "",
    category: "built-in",
    isScanner: false,
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
    isScanner: false,
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
    isScanner: false,
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
    isScanner: false,
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
    isScanner: false,
    isBuiltIn: true,
    isActive: true,
    source: "built-in",
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
    await collection.updateOne(
      { slug: document.slug },
      {
        $set: {
          ...document,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: document._id,
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
