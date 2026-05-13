import { pbkdf2Sync, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { writeAuditLog } from "@/shared/lib/audit";
import { getMongoDb } from "@/shared/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DbUser = {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  createdAt: number;
  phone?: string;
  website?: string;
  address?: string;
  birthdate?: string;
  about?: string;
  skills?: string;
  profilePicture?: string;
  lastLoginAt?: number;
};

type DbReset = {
  _id: string;
  userId: string;
  username: string;
  status: "pending" | "approved" | "rejected";
  newPassword?: string;
  createdAt: number;
};

type DbRole = {
  _id: string;
};

const adminUser = {
  _id: "admin-seed",
  username: "adminpower",
  fullName: "System Administrator",
  email: "admin@sqa.local",
  role: "admin",
  status: "approved",
  createdAt: 0,
  about: "System administrator for SQA Portal.",
  skills: "User approval, QA governance, portal administration",
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("django:")) return verifyDjangoPassword(password, stored);
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function verifyDjangoPassword(password: string, stored: string) {
  const [algorithm, iterations, salt, hash] = stored.slice("django:".length).split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !hash) return false;
  const expected = Buffer.from(hash);
  const actual = Buffer.from(
    pbkdf2Sync(password, salt, Number(iterations), 32, "sha256").toString("base64"),
  );
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function cleanUser(user: DbUser) {
  return {
    id: user._id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    phone: user.phone,
    website: user.website,
    address: user.address,
    birthdate: user.birthdate,
    about: user.about,
    skills: user.skills,
    profilePicture: user.profilePicture,
    lastLoginAt: user.lastLoginAt,
  };
}

async function usersCollection() {
  const db = await getMongoDb();
  return db.collection<DbUser>("users");
}

async function resetsCollection() {
  const db = await getMongoDb();
  return db.collection<DbReset>("password_resets");
}

async function ensureAdmin() {
  const users = await usersCollection();
  const existing = await users.findOne({ _id: adminUser._id });
  if (existing) return;
  await users.insertOne({
    ...adminUser,
    passwordHash: hashPassword("adminpowertocontrol"),
  });
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

export async function GET() {
  await ensureAdmin();
  const users = await usersCollection();
  const resets = await resetsCollection();
  const allUsers = await users.find().sort({ createdAt: 1 }).toArray();
  const allResets = await resets.find().sort({ createdAt: 1 }).toArray();

  return NextResponse.json({
    users: allUsers.map(cleanUser),
    resets: allResets.map((reset) => ({
      id: reset._id,
      userId: reset.userId,
      username: reset.username,
      status: reset.status,
      newPassword: reset.newPassword,
      createdAt: reset.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  await ensureAdmin();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid payload");

  const action = String((body as { action?: unknown }).action ?? "");
  const actorId = String((body as { actorId?: unknown }).actorId ?? "") || null;
  const users = await usersCollection();
  const resets = await resetsCollection();

  if (action === "session") {
    const id = String((body as { id?: unknown }).id ?? "");
    const user = await users.findOne({ _id: id });
    return NextResponse.json({ user: user ? cleanUser(user) : null });
  }

  if (action === "logout") {
    const id = String((body as { id?: unknown }).id ?? "");
    const user = await users.findOne({ _id: id });
    await writeAuditLog({
      actorId: id,
      targetUserId: id,
      action: "logout",
      objectType: "user",
      objectId: id,
      objectName: user?.username ?? id,
      message: `${user?.username ?? id} logged out`,
      category: "auth",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "login") {
    const id = String((body as { usernameOrEmail?: unknown }).usernameOrEmail ?? "")
      .trim()
      .toLowerCase();
    const password = String((body as { password?: unknown }).password ?? "");
    const user = await users.findOne({
      $or: [{ username: id }, { email: id }],
    });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await writeAuditLog({
        action: "login",
        objectType: "user",
        objectName: id,
        message: `Failed login attempt for ${id || "unknown user"}`,
        category: "auth",
        status: "failed",
      });
      return NextResponse.json({ ok: false, reason: "invalid" });
    }
    if (user.status === "pending") {
      await writeAuditLog({
        targetUserId: user._id,
        action: "login",
        objectType: "user",
        objectId: user._id,
        objectName: user.username,
        message: `${user.username} tried to log in before approval`,
        category: "auth",
        status: "blocked",
      });
      return NextResponse.json({ ok: false, reason: "pending" });
    }
    if (user.status === "rejected") {
      await writeAuditLog({
        targetUserId: user._id,
        action: "login",
        objectType: "user",
        objectId: user._id,
        objectName: user.username,
        message: `${user.username} tried to log in with a rejected account`,
        category: "auth",
        status: "blocked",
      });
      return NextResponse.json({ ok: false, reason: "rejected" });
    }
    const lastLoginAt = Date.now();
    await users.updateOne({ _id: user._id }, { $set: { lastLoginAt } });
    await writeAuditLog({
      actorId: user._id,
      targetUserId: user._id,
      action: "login",
      objectType: "user",
      objectId: user._id,
      objectName: user.username,
      message: `${user.username} logged in`,
      category: "auth",
    });
    return NextResponse.json({ ok: true, user: cleanUser({ ...user, lastLoginAt }) });
  }

  if (action === "register") {
    const input = body as {
      username?: unknown;
      fullName?: unknown;
      email?: unknown;
      password?: unknown;
    };
    const username = String(input.username ?? "").trim();
    const fullName = String(input.fullName ?? "").trim();
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(input.password ?? "");
    if (!username || !fullName || !email || !password) return badRequest("Missing fields");
    if (await users.findOne({ username: username.toLowerCase() })) {
      return NextResponse.json({ ok: false, reason: "username-taken" });
    }
    if (await users.findOne({ email })) {
      return NextResponse.json({ ok: false, reason: "email-taken" });
    }
    const newUser = {
      _id: randomUUID(),
      username: username.toLowerCase(),
      fullName,
      email,
      passwordHash: hashPassword(password),
      role: "pending",
      status: "pending",
      createdAt: Date.now(),
    };
    await users.insertOne(newUser);
    await writeAuditLog({
      targetUserId: newUser._id,
      action: "create",
      objectType: "user",
      objectId: newUser._id,
      objectName: newUser.username,
      message: `${newUser.username} registered and is pending approval`,
      category: "auth",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "setUserStatus") {
    const id = String((body as { id?: unknown }).id ?? "");
    const status = String((body as { status?: unknown }).status ?? "");
    if (!["pending", "approved", "rejected"].includes(status)) return badRequest("Invalid status");
    const user = await users.findOne({ _id: id });
    await users.updateOne({ _id: id }, { $set: { status } });
    await writeAuditLog({
      actorId,
      targetUserId: id,
      action: status === "approved" ? "approve" : status === "rejected" ? "reject" : "update",
      objectType: "user",
      objectId: id,
      objectName: user?.username ?? id,
      message: `${user?.username ?? id} status changed to ${status}`,
      category: "admin",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "setUserRole") {
    const id = String((body as { id?: unknown }).id ?? "");
    const role = String((body as { role?: unknown }).role ?? "");
    const db = await getMongoDb();
    const roleExists = await db.collection<DbRole>("roles").findOne({ _id: role });
    if (!roleExists) return badRequest("Invalid role");
    const user = await users.findOne({ _id: id });
    await users.updateOne({ _id: id }, { $set: { role } });
    await writeAuditLog({
      actorId,
      targetUserId: id,
      action: "update",
      objectType: "user_role",
      objectId: id,
      objectName: user?.username ?? id,
      message: `${user?.username ?? id} role changed to ${role}`,
      category: "admin",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteUser") {
    const id = String((body as { id?: unknown }).id ?? "");
    if (id === adminUser._id) return badRequest("Admin cannot be deleted");
    const user = await users.findOne({ _id: id });
    await users.deleteOne({ _id: id });
    await writeAuditLog({
      actorId,
      targetUserId: id,
      action: "delete",
      objectType: "user",
      objectId: id,
      objectName: user?.username ?? id,
      message: `${user?.username ?? id} was deleted`,
      category: "admin",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "updateProfile") {
    const input = body as { id?: unknown; profile?: Record<string, unknown> };
    const id = String(input.id ?? "");
    const current = await users.findOne({ _id: id });
    if (!current) return NextResponse.json({ ok: false, reason: "missing-user" });
    const profile = input.profile ?? {};
    const username =
      typeof profile.username === "string" ? profile.username.trim().toLowerCase() : "";
    if (username && username !== current.username && (await users.findOne({ username }))) {
      return NextResponse.json({ ok: false, reason: "username-taken" });
    }
    const patch = {
      fullName: String(profile.fullName ?? current.fullName).trim() || current.fullName,
      username: username || current.username,
      phone: typeof profile.phone === "string" ? profile.phone : current.phone,
      website: typeof profile.website === "string" ? profile.website : current.website,
      address: typeof profile.address === "string" ? profile.address : current.address,
      birthdate: typeof profile.birthdate === "string" ? profile.birthdate : current.birthdate,
      about: typeof profile.about === "string" ? profile.about : current.about,
      skills: typeof profile.skills === "string" ? profile.skills : current.skills,
      profilePicture:
        typeof profile.profilePicture === "string"
          ? profile.profilePicture
          : current.profilePicture,
    };
    await users.updateOne({ _id: id }, { $set: patch });
    const updated = await users.findOne({ _id: id });
    await writeAuditLog({
      actorId: id,
      targetUserId: id,
      action: "update",
      objectType: "profile",
      objectId: id,
      objectName: updated?.username ?? id,
      message: `${updated?.username ?? id} updated profile`,
      category: "account",
    });
    return NextResponse.json({ ok: true, user: updated ? cleanUser(updated) : null });
  }

  if (action === "changeEmail") {
    const id = String((body as { id?: unknown }).id ?? "");
    const newEmail = String((body as { newEmail?: unknown }).newEmail ?? "")
      .trim()
      .toLowerCase();
    const password = String((body as { password?: unknown }).password ?? "");
    const user = await users.findOne({ _id: id });
    if (!user) return NextResponse.json({ ok: false, reason: "missing-user" });
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, reason: "bad-password" });
    }
    const taken = await users.findOne({ email: newEmail, _id: { $ne: id } });
    if (taken) return NextResponse.json({ ok: false, reason: "email-taken" });
    await users.updateOne({ _id: id }, { $set: { email: newEmail } });
    const updated = await users.findOne({ _id: id });
    await writeAuditLog({
      actorId: id,
      targetUserId: id,
      action: "security",
      objectType: "email",
      objectId: id,
      objectName: user.username,
      message: `${user.username} changed email address`,
      category: "account",
    });
    return NextResponse.json({ ok: true, user: updated ? cleanUser(updated) : null });
  }

  if (action === "changePassword") {
    const id = String((body as { id?: unknown }).id ?? "");
    const oldPassword = String((body as { oldPassword?: unknown }).oldPassword ?? "");
    const newPassword = String((body as { newPassword?: unknown }).newPassword ?? "");
    const user = await users.findOne({ _id: id });
    if (!user) return NextResponse.json({ ok: false, reason: "missing-user" });
    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return NextResponse.json({ ok: false, reason: "bad-password" });
    }
    await users.updateOne({ _id: id }, { $set: { passwordHash: hashPassword(newPassword) } });
    await writeAuditLog({
      actorId: id,
      targetUserId: id,
      action: "security",
      objectType: "password",
      objectId: id,
      objectName: user.username,
      message: `${user.username} changed password`,
      category: "account",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "requestPasswordReset") {
    const usernameOrEmail = String((body as { usernameOrEmail?: unknown }).usernameOrEmail ?? "")
      .trim()
      .toLowerCase();
    const user = await users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });
    if (!user) return NextResponse.json({ ok: false });
    const reset = {
      _id: randomUUID(),
      userId: user._id,
      username: user.username,
      status: "pending" as const,
      createdAt: Date.now(),
    };
    await resets.insertOne(reset);
    await writeAuditLog({
      targetUserId: user._id,
      action: "request",
      objectType: "password_reset",
      objectId: reset._id,
      objectName: user.username,
      message: `${user.username} requested a password reset`,
      category: "account",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "approveReset") {
    const id = String((body as { id?: unknown }).id ?? "");
    const newPassword = String((body as { newPassword?: unknown }).newPassword ?? "");
    const reset = await resets.findOne({ _id: id });
    if (!reset) return NextResponse.json({ ok: true });
    await resets.updateOne({ _id: id }, { $set: { status: "approved", newPassword } });
    await users.updateOne(
      { _id: String(reset.userId) },
      { $set: { passwordHash: hashPassword(newPassword) } },
    );
    await writeAuditLog({
      actorId,
      targetUserId: String(reset.userId),
      action: "approve",
      objectType: "password_reset",
      objectId: id,
      objectName: reset.username,
      message: `${reset.username} password reset was approved`,
      category: "admin",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "rejectReset") {
    const id = String((body as { id?: unknown }).id ?? "");
    const reset = await resets.findOne({ _id: id });
    await resets.updateOne({ _id: id }, { $set: { status: "rejected" } });
    await writeAuditLog({
      actorId,
      targetUserId: reset ? String(reset.userId) : null,
      action: "reject",
      objectType: "password_reset",
      objectId: id,
      objectName: reset?.username ?? id,
      message: `${reset?.username ?? id} password reset was rejected`,
      category: "admin",
    });
    return NextResponse.json({ ok: true });
  }

  return badRequest("Unknown action");
}
