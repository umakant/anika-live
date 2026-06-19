import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "anika_session";
const SESSION_HOURS = 24;

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "dev-secret-change-in-production";
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin";
}

function signPayload(payload: string): string {
  const hmac = crypto.createHmac("sha256", getAuthSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (signPayload(payload) !== signature) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp: number;
    };
    return Date.now() < data.exp;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

export function verifyPassword(password: string): boolean {
  return password === getAdminPassword();
}
