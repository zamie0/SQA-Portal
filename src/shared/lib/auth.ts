// Local-only demo auth + admin approval system (localStorage backed).
// All names are lowercase for case-insensitive matching.

export type UserStatus = "pending" | "approved" | "rejected";
export type UserRole = "admin" | "project_manager" | "project_leader" | "member" | "pending";

export interface PortalUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
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

const SESSION_KEY = "sqa.session";
const EVENT = "sqa.auth.changed";

function isBrowser() {
  return typeof window !== "undefined";
}

function readSessionId() {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as string | null) : null;
  } catch {
    return null;
  }
}

async function authRequest<T>(payload: Record<string, unknown>): Promise<T> {
  const sessionId = readSessionId();
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorId: sessionId, ...payload }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

function dispatchAuthChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export async function getAllUsers(): Promise<PortalUser[]> {
  const response = await fetch("/api/auth");
  const data = (await response.json()) as { users: PortalUser[] };
  return data.users;
}

export async function getResetRequests(): Promise<ResetRequest[]> {
  const response = await fetch("/api/auth");
  const data = (await response.json()) as { resets: ResetRequest[] };
  return data.resets;
}

export async function getAuthSnapshot(): Promise<{ users: PortalUser[]; resets: ResetRequest[] }> {
  const response = await fetch("/api/auth");
  return (await response.json()) as { users: PortalUser[]; resets: ResetRequest[] };
}

export async function getSession(): Promise<PortalUser | null> {
  if (!isBrowser()) return null;
  const sessionId = readSessionId();
  if (!sessionId) return null;
  const data = await authRequest<{ user: PortalUser | null }>({ action: "session", id: sessionId });
  return data.user;
}

export function setSession(userId: string | null) {
  if (!isBrowser()) return;
  if (userId) localStorage.setItem(SESSION_KEY, JSON.stringify(userId));
  else localStorage.removeItem(SESSION_KEY);
  dispatchAuthChanged();
}

export type LoginResult =
  | { ok: true; user: PortalUser }
  | { ok: false; reason: "invalid" | "pending" | "rejected" };

export async function login(usernameOrEmail: string, password: string): Promise<LoginResult> {
  const result = await authRequest<LoginResult>({
    action: "login",
    usernameOrEmail,
    password,
  });
  if (result.ok) setSession(result.user.id);
  return result;
}

export function logout() {
  const sessionId = readSessionId();
  if (sessionId) {
    void fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: sessionId, action: "logout", id: sessionId }),
    }).catch(() => undefined);
  }
  setSession(null);
}

export type RegisterInput = {
  username: string;
  fullName: string;
  email: string;
  password: string;
};

export type RegisterResult = { ok: true } | { ok: false; reason: "username-taken" | "email-taken" };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const result = await authRequest<RegisterResult>({ action: "register", ...input });
  dispatchAuthChanged();
  return result;
}

export async function setUserStatus(id: string, status: UserStatus) {
  await authRequest({ action: "setUserStatus", id, status });
  dispatchAuthChanged();
}

export async function setUserRole(id: string, role: UserRole) {
  await authRequest({ action: "setUserRole", id, role });
  dispatchAuthChanged();
}

export async function deleteUser(id: string) {
  await authRequest({ action: "deleteUser", id });
  dispatchAuthChanged();
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

export async function updateUserProfile(
  id: string,
  input: ProfileUpdate,
): Promise<UpdateProfileResult> {
  const result = await authRequest<UpdateProfileResult>({
    action: "updateProfile",
    id,
    profile: input,
  });
  dispatchAuthChanged();
  return result;
}

export type ChangeEmailResult =
  | { ok: true; user: PortalUser }
  | { ok: false; reason: "email-taken" | "bad-password" | "missing-user" };

export async function changeUserEmail(
  id: string,
  newEmail: string,
  password: string,
): Promise<ChangeEmailResult> {
  const result = await authRequest<ChangeEmailResult>({
    action: "changeEmail",
    id,
    newEmail,
    password,
  });
  dispatchAuthChanged();
  return result;
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "bad-password" | "missing-user" };

export async function changeUserPassword(
  id: string,
  oldPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  return authRequest<ChangePasswordResult>({
    action: "changePassword",
    id,
    oldPassword,
    newPassword,
  });
}

export async function requestPasswordReset(usernameOrEmail: string): Promise<boolean> {
  const result = await authRequest<{ ok: boolean }>({
    action: "requestPasswordReset",
    usernameOrEmail,
  });
  dispatchAuthChanged();
  return result.ok;
}

export async function approveReset(resetId: string, newPassword: string) {
  await authRequest({ action: "approveReset", id: resetId, newPassword });
  dispatchAuthChanged();
}

export async function rejectReset(resetId: string) {
  await authRequest({ action: "rejectReset", id: resetId });
  dispatchAuthChanged();
}

export async function pendingUserCount(): Promise<number> {
  return (await getAllUsers()).filter((u) => u.status === "pending").length;
}

export async function pendingResetCount(): Promise<number> {
  return (await getResetRequests()).filter((r) => r.status === "pending").length;
}

export const AUTH_EVENT = EVENT;
