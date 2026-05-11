// Local-only demo auth + admin approval system (localStorage backed).
// All names are lowercase for case-insensitive matching.

export type UserStatus = "pending" | "approved" | "rejected";
export type UserRole = "admin" | "staff" | "intern" | "user";

export interface PortalUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  password: string; // demo only — plain text
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  phone?: string;
  website?: string;
  address?: string;
  birthdate?: string;
  about?: string;
  skills?: string;
  profilePicture?: string;
  lastLoginAt?: number;
}

export interface ResetRequest {
  id: string;
  userId: string;
  username: string;
  status: "pending" | "approved" | "rejected";
  newPassword?: string;
  createdAt: number;
}

const USERS_KEY = "sqa.users";
const SESSION_KEY = "sqa.session";
const RESETS_KEY = "sqa.resets";
const EVENT = "sqa.auth.changed";

const ADMIN: PortalUser = {
  id: "admin-seed",
  username: "adminpower",
  fullName: "System Administrator",
  email: "admin@sqa.local",
  password: "adminpowertocontrol",
  role: "admin",
  status: "approved",
  createdAt: 0,
  about: "System administrator for SQA Portal.",
  skills: "User approval, QA governance, portal administration",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function getAllUsers(): PortalUser[] {
  const users = read<PortalUser[]>(USERS_KEY, []);
  if (!users.find((u) => u.username.toLowerCase() === ADMIN.username)) {
    const seeded = [ADMIN, ...users];
    write(USERS_KEY, seeded);
    return seeded;
  }
  return users;
}

export function getResetRequests(): ResetRequest[] {
  return read<ResetRequest[]>(RESETS_KEY, []);
}

function saveUsers(users: PortalUser[]) {
  write(USERS_KEY, users);
}

function saveResets(resets: ResetRequest[]) {
  write(RESETS_KEY, resets);
}

export function getSession(): PortalUser | null {
  if (!isBrowser()) return null;
  const id = read<string | null>(SESSION_KEY, null);
  if (!id) return null;
  return getAllUsers().find((u) => u.id === id) ?? null;
}

export function setSession(userId: string | null) {
  if (!isBrowser()) return;
  if (userId) localStorage.setItem(SESSION_KEY, JSON.stringify(userId));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export type LoginResult =
  | { ok: true; user: PortalUser }
  | { ok: false; reason: "invalid" | "pending" | "rejected" };

export function login(usernameOrEmail: string, password: string): LoginResult {
  const id = usernameOrEmail.trim().toLowerCase();
  const user = getAllUsers().find(
    (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id,
  );
  if (!user || user.password !== password) return { ok: false, reason: "invalid" };
  if (user.status === "pending") return { ok: false, reason: "pending" };
  if (user.status === "rejected") return { ok: false, reason: "rejected" };
  saveUsers(getAllUsers().map((u) => (u.id === user.id ? { ...u, lastLoginAt: Date.now() } : u)));
  setSession(user.id);
  return { ok: true, user: { ...user, lastLoginAt: Date.now() } };
}

export function logout() {
  setSession(null);
}

export type RegisterInput = {
  username: string;
  fullName: string;
  email: string;
  password: string;
};

export type RegisterResult = { ok: true } | { ok: false; reason: "username-taken" | "email-taken" };

export function register(input: RegisterInput): RegisterResult {
  const users = getAllUsers();
  const u = input.username.trim().toLowerCase();
  const e = input.email.trim().toLowerCase();
  if (users.some((x) => x.username.toLowerCase() === u))
    return { ok: false, reason: "username-taken" };
  if (users.some((x) => x.email.toLowerCase() === e)) return { ok: false, reason: "email-taken" };
  const next: PortalUser = {
    id: crypto.randomUUID(),
    username: input.username.trim(),
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    password: input.password,
    role: "user",
    status: "pending",
    createdAt: Date.now(),
  };
  saveUsers([...users, next]);
  return { ok: true };
}

export function setUserStatus(id: string, status: UserStatus) {
  const users = getAllUsers().map((u) => (u.id === id ? { ...u, status } : u));
  saveUsers(users);
}

export function setUserRole(id: string, role: UserRole) {
  const users = getAllUsers().map((u) => (u.id === id ? { ...u, role } : u));
  saveUsers(users);
}

export function deleteUser(id: string) {
  saveUsers(getAllUsers().filter((u) => u.id !== id));
}

export type ProfileUpdate = Partial<
  Pick<
    PortalUser,
    | "fullName"
    | "username"
    | "phone"
    | "website"
    | "address"
    | "birthdate"
    | "about"
    | "skills"
    | "profilePicture"
  >
>;

export type UpdateProfileResult =
  | { ok: true; user: PortalUser }
  | { ok: false; reason: "username-taken" | "missing-user" };

export function updateUserProfile(id: string, input: ProfileUpdate): UpdateProfileResult {
  const users = getAllUsers();
  const current = users.find((u) => u.id === id);
  if (!current) return { ok: false, reason: "missing-user" };
  const nextUsername = input.username?.trim();
  if (
    nextUsername &&
    users.some((u) => u.id !== id && u.username.toLowerCase() === nextUsername.toLowerCase())
  ) {
    return { ok: false, reason: "username-taken" };
  }
  const nextUser: PortalUser = {
    ...current,
    ...input,
    fullName: input.fullName?.trim() || current.fullName,
    username: nextUsername || current.username,
  };
  saveUsers(users.map((u) => (u.id === id ? nextUser : u)));
  return { ok: true, user: nextUser };
}

export type ChangeEmailResult =
  | { ok: true; user: PortalUser }
  | { ok: false; reason: "email-taken" | "bad-password" | "missing-user" };

export function changeUserEmail(id: string, newEmail: string, password: string): ChangeEmailResult {
  const users = getAllUsers();
  const current = users.find((u) => u.id === id);
  if (!current) return { ok: false, reason: "missing-user" };
  if (current.password !== password) return { ok: false, reason: "bad-password" };
  const email = newEmail.trim().toLowerCase();
  if (users.some((u) => u.id !== id && u.email.toLowerCase() === email)) {
    return { ok: false, reason: "email-taken" };
  }
  const nextUser = { ...current, email: newEmail.trim() };
  saveUsers(users.map((u) => (u.id === id ? nextUser : u)));
  return { ok: true, user: nextUser };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "bad-password" | "missing-user" };

export function changeUserPassword(
  id: string,
  oldPassword: string,
  newPassword: string,
): ChangePasswordResult {
  const users = getAllUsers();
  const current = users.find((u) => u.id === id);
  if (!current) return { ok: false, reason: "missing-user" };
  if (current.password !== oldPassword) return { ok: false, reason: "bad-password" };
  saveUsers(users.map((u) => (u.id === id ? { ...u, password: newPassword } : u)));
  return { ok: true };
}

export function requestPasswordReset(usernameOrEmail: string): boolean {
  const id = usernameOrEmail.trim().toLowerCase();
  const user = getAllUsers().find(
    (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id,
  );
  if (!user) return false;
  const reset: ResetRequest = {
    id: crypto.randomUUID(),
    userId: user.id,
    username: user.username,
    status: "pending",
    createdAt: Date.now(),
  };
  saveResets([...getResetRequests(), reset]);
  return true;
}

export function approveReset(resetId: string, newPassword: string) {
  const resets = getResetRequests();
  const r = resets.find((x) => x.id === resetId);
  if (!r) return;
  saveResets(resets.map((x) => (x.id === resetId ? { ...x, status: "approved", newPassword } : x)));
  saveUsers(getAllUsers().map((u) => (u.id === r.userId ? { ...u, password: newPassword } : u)));
}

export function rejectReset(resetId: string) {
  saveResets(getResetRequests().map((x) => (x.id === resetId ? { ...x, status: "rejected" } : x)));
}

export function pendingUserCount(): number {
  return getAllUsers().filter((u) => u.status === "pending").length;
}

export function pendingResetCount(): number {
  return getResetRequests().filter((r) => r.status === "pending").length;
}

export const AUTH_EVENT = EVENT;
