/**
 * Server-only admin helpers.
 *
 * This file is named `*.server.ts`, so the bundler refuses to include it in any
 * client bundle. Nothing here — including the admin password comparison and the
 * session lookup — can ever reach the browser.
 */
import { getRequestHeader } from "@tanstack/react-start/server";

/** Thrown whenever a caller presents a missing/expired/forged session token. */
export const UNAUTHORIZED = "UNAUTHORIZED";
/** Thrown when the login endpoint is rate limited. */
export const RATE_LIMITED = "RATE_LIMITED";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Length-independent constant-time compare. Both sides are hashed to a
 * fixed-width digest first so the raw password length cannot leak via timing.
 */
export async function constantTimeEqual(a: string, b: string) {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

/** Stable, privacy-preserving per-caller key used only for login rate limiting. */
export async function clientKey() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-real-ip") ||
    "unknown";
  return sha256(`admin-login:${ip}`);
}

type RateLimitState = { locked: boolean; retryAfterSeconds: number; failedCount: number };

export async function getLoginRateLimit(key: string): Promise<RateLimitState> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("failed_count, locked_until, first_failed_at")
    .eq("client_key", key)
    .maybeSingle();

  if (!data) return { locked: false, retryAfterSeconds: 0, failedCount: 0 };

  const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : 0;
  if (lockedUntil > Date.now()) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((lockedUntil - Date.now()) / 1000),
      failedCount: data.failed_count,
    };
  }

  // Attempts outside the rolling window no longer count.
  const windowStart = new Date(data.first_failed_at).getTime();
  const failedCount = Date.now() - windowStart > ATTEMPT_WINDOW_MS ? 0 : data.failed_count;
  return { locked: false, retryAfterSeconds: 0, failedCount };
}

/** Records a failed attempt and returns the new failure count within the window. */
export async function recordLoginFailure(key: string, currentCount: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nextCount = currentCount + 1;
  const now = new Date().toISOString();
  const lockedUntil =
    nextCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null;

  await supabaseAdmin.from("admin_login_attempts").upsert(
    {
      client_key: key,
      failed_count: nextCount,
      locked_until: lockedUntil,
      ...(currentCount === 0 ? { first_failed_at: now } : {}),
      last_failed_at: now,
      updated_at: now,
    },
    { onConflict: "client_key" },
  );

  return nextCount;
}

export async function clearLoginFailures(key: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_login_attempts").delete().eq("client_key", key);
}

export async function createSession() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error } = await supabaseAdmin
    .from("admin_sessions")
    .insert({ token_hash: await sha256(token), expires_at: expiresAt });
  if (error) throw new Error(error.message);

  // Opportunistic cleanup of expired sessions and stale rate-limit rows.
  const nowIso = new Date().toISOString();
  await Promise.all([
    supabaseAdmin.from("admin_sessions").delete().lt("expires_at", nowIso),
    supabaseAdmin
      .from("admin_login_attempts")
      .delete()
      .lt("last_failed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return { token, expires_at: expiresAt };
}

export async function destroySession(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_sessions").delete().eq("token_hash", await sha256(token));
}

/**
 * The single authorization gate for every admin operation.
 *
 * A token from `localStorage` is meaningless on its own: it is only accepted
 * when its SHA-256 hash matches a live, unexpired row in `admin_sessions`.
 * Forged or edited tokens therefore fail here before any data is touched.
 */
export async function assertSession(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, expires_at")
    .eq("token_hash", await sha256(token))
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(UNAUTHORIZED);

  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("admin_sessions").delete().eq("id", data.id);
    throw new Error(UNAUTHORIZED);
  }

  return supabaseAdmin;
}

/** Escapes PostgREST `or`/`ilike` metacharacters in user-supplied search text. */
export function sanitizeSearch(raw: string) {
  return raw.trim().replace(/[%_,().\\]/g, (m) => `\\${m}`).slice(0, 80);
}
