import type { User } from "../types";
import { ApiError, now, one, run } from "./db";
const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
export const randomToken = () =>
  hex(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function hashPassword(password: string, salt = randomToken()) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: enc.encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return `pbkdf2-sha256$100000$${salt}$${hex(bits)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  return equal(await hashPassword(password, parts[2]), stored);
}
export function safeUser(u: any): User {
  const { id, name, email, role, demo, workspace_id, status, created_at } = u;
  return { id, name, email, role, demo, workspace_id, status, created_at };
}
export function cookie(req: Request, token: string, age = 604800) {
  return `form_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function cookieToken(req: Request) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("form_session="))
      ?.slice(13) ?? ""
  );
}
export async function newSession(userId: string) {
  const token = randomToken();
  await run(
    "INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)",
    await digest(token),
    userId,
    Date.now() + 7 * 86400000,
    now(),
  );
  await run("DELETE FROM sessions WHERE expires_at < ?", Date.now());
  return token;
}
export async function authenticate(req: Request): Promise<User> {
  const token = cookieToken(req);
  if (!token) throw new ApiError(401, "Sign in to continue.");
  const u = await one(
    "SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
    await digest(token),
    Date.now(),
  );
  if (!u || u.status !== "active")
    throw new ApiError(
      401,
      "Your session has expired or your account is unavailable. Please sign in again.",
    );
  return safeUser(u);
}
export function admin(u: User) {
  if (u.role !== "admin")
    throw new ApiError(403, "Administrator access is required.");
}
export function csrf(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new ApiError(403, "This request did not come from this application.");
  if (req.headers.get("x-form-action") !== "1")
    throw new ApiError(403, "A secure application request is required.");
}
export async function rateLimit(key: string, max = 20, windowMs = 900000) {
  const hashed = await digest(key),
    time = Date.now();
  await run(
    "INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<? THEN 1 ELSE hits+1 END, expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END",
    hashed,
    time + windowMs,
    time,
    time,
  );
  const r = await one("SELECT hits FROM rate_limits WHERE key=?", hashed);
  if (r.hits > max)
    throw new ApiError(
      429,
      "Too many attempts. Please wait a few minutes and try again.",
    );
}
export async function cleanupLimits() {
  await run("DELETE FROM rate_limits WHERE expires_at<?", Date.now());
}
