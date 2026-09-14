/**
 * First-touch referral capture, SSR-safe.
 *
 * A stored code is never overwritten while it is still valid: the first
 * partner link a visitor opens keeps the credit for the full window.
 * WhatsApp's in-app browser frequently blocks localStorage, so a plain
 * cookie is written alongside it and used as a fallback on read.
 */
export const REF_STORAGE_KEY = "sbg_ref";
export const REF_COOKIE = "sbg_ref";
export const REF_TTL_DAYS = 30;

const REF_TTL_MS = REF_TTL_DAYS * 24 * 60 * 60 * 1000;

export const REFERRAL_CODE_RE = /^[A-Z0-9_-]{3,24}$/i;

export type StoredReferral = { code: string; captured_at: string };

export function isValidReferralCode(code: string | null | undefined): boolean {
  return typeof code === "string" && REFERRAL_CODE_RE.test(code.trim());
}

function isFresh(capturedAt: string): boolean {
  const ts = Date.parse(capturedAt);
  return Number.isFinite(ts) && Date.now() - ts < REF_TTL_MS;
}

function readCookie(): StoredReferral | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REF_COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(REF_COOKIE.length + 1)));
    if (isValidReferralCode(parsed?.code) && typeof parsed?.captured_at === "string") {
      return { code: String(parsed.code).toUpperCase(), captured_at: parsed.captured_at };
    }
  } catch {
    /* malformed cookie — treated as absent */
  }
  return null;
}

function writeCookie(value: StoredReferral) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + REF_TTL_MS).toUTCString();
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(
    JSON.stringify(value),
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${REF_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function readLocal(): StoredReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isValidReferralCode(parsed?.code) && typeof parsed?.captured_at === "string") {
      return { code: String(parsed.code).toUpperCase(), captured_at: parsed.captured_at };
    }
  } catch {
    /* storage blocked or malformed — fall back to the cookie */
  }
  return null;
}

/** Returns the live referral, clearing anything past the 30-day window. */
export function readReferral(): StoredReferral | null {
  if (typeof window === "undefined") return null;
  const stored = readLocal() ?? readCookie();
  if (!stored) return null;
  if (!isFresh(stored.captured_at)) {
    clearReferral();
    return null;
  }
  return stored;
}

/** First-touch write: ignored when a valid, unexpired code is already held. */
export function storeReferral(code: string): StoredReferral | null {
  if (typeof window === "undefined") return null;
  if (!isValidReferralCode(code)) return null;
  const existing = readReferral();
  if (existing) return existing;

  const value: StoredReferral = {
    code: code.trim().toUpperCase(),
    captured_at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* localStorage blocked — the cookie below is the fallback */
  }
  writeCookie(value);
  return value;
}

export function clearReferral() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
  clearCookie();
}
