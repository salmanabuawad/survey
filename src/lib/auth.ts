import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin access is a single shared password held in ADMIN_PASSWORD. On success
 * the server sets an HMAC-signed, httpOnly cookie carrying nothing but an
 * expiry — there is no user table, and nothing about the respondents is
 * involved either way.
 */

export const SESSION_COOKIE = "kidsphere_survey_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (need 16+ chars)");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Constant-time compare that tolerates length mismatch without leaking it. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Still burn a comparison so the failure takes the same shape.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not set");
  return safeEqual(candidate, expected);
}

export function createSessionValue(): { value: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = String(expiresAt);
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_SECONDS };
}

export function isValidSessionValue(raw: string | undefined): boolean {
  if (!raw) return false;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!safeEqual(signature, sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionValue(store.get(SESSION_COOKIE)?.value);
}
