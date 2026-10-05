/**
 * PhonePe Payment Gateway — Standard Checkout v2 (server only).
 *
 * Keys are read ONLY from environment variables (Vercel → Settings →
 * Environment Variables). Nothing here is stored in the database or shown in
 * the admin panel, and this file is never bundled for the browser.
 *
 *   PHONEPE_ENABLED            "true" to switch the gateway on (default off)
 *   PHONEPE_ENV                "SANDBOX" (default) or "PRODUCTION"
 *   PHONEPE_CLIENT_ID          from the PhonePe dashboard
 *   PHONEPE_CLIENT_SECRET      from the PhonePe dashboard
 *   PHONEPE_CLIENT_VERSION     from the PhonePe dashboard (default 1)
 *   PHONEPE_WEBHOOK_USERNAME   optional — the username set for the webhook
 *   PHONEPE_WEBHOOK_PASSWORD   optional — the password set for the webhook
 *   SITE_URL                   optional — default https://saubhagya.net
 *
 * Docs: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference
 */

const HOSTS = {
  SANDBOX: {
    auth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    pg: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  },
  PRODUCTION: {
    auth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pg: "https://api.phonepe.com/apis/pg",
  },
} as const;

export type PhonePeState = "COMPLETED" | "FAILED" | "PENDING";

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function phonePeEnvironment(): keyof typeof HOSTS {
  return env("PHONEPE_ENV").toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
}

/** True only when the switch is on AND both keys are present. */
export function isPhonePeEnabled() {
  return (
    env("PHONEPE_ENABLED").toLowerCase() === "true" &&
    Boolean(env("PHONEPE_CLIENT_ID")) &&
    Boolean(env("PHONEPE_CLIENT_SECRET"))
  );
}

export function siteUrl() {
  return (env("SITE_URL") || "https://saubhagya.net").replace(/\/+$/, "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let cachedToken: { value: string; expiresAtMs: number; key: string } | null = null;

async function accessToken(): Promise<string> {
  const clientId = env("PHONEPE_CLIENT_ID");
  const clientSecret = env("PHONEPE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("PhonePe keys are not configured");
  const mode = phonePeEnvironment();
  const cacheKey = `${mode}:${clientId}`;
  if (cachedToken && cachedToken.key === cacheKey && cachedToken.expiresAtMs - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_version: env("PHONEPE_CLIENT_VERSION") || "1",
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch(HOSTS[mode].auth, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_at?: number;
    message?: string;
    code?: string;
  } | null;
  if (!res.ok || !json?.access_token) {
    throw new Error(
      `PhonePe login failed (${res.status}${json?.code ? ` ${json.code}` : ""}). Check the Client ID, Client Secret, Client Version and PHONEPE_ENV.`,
    );
  }
  // expires_at is epoch seconds.
  const expiresAtMs = json.expires_at ? json.expires_at * 1000 : Date.now() + 10 * 60_000;
  cachedToken = { value: json.access_token, expiresAtMs, key: cacheKey };
  return json.access_token;
}

/** PhonePe allows letters, digits, "_" and "-", up to 63 characters. */
export function makeMerchantOrderId(orderRef: string) {
  const clean = orderRef.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return `${clean}-${Date.now().toString(36)}`;
}

/** The order reference (e.g. SBG-1234 or VS1811) inside a merchantOrderId. */
export function orderRefOf(merchantOrderId: string) {
  const i = merchantOrderId.lastIndexOf("-");
  return i > 0 ? merchantOrderId.slice(0, i) : merchantOrderId;
}

export async function createPhonePePayment(input: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  message?: string;
}) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    throw new Error("Amount must be at least ₹1");
  }
  const token = await accessToken();
  const res = await fetch(`${HOSTS[phonePeEnvironment()].pg}/checkout/v2/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${token}` },
    body: JSON.stringify({
      merchantOrderId: input.merchantOrderId,
      amount: input.amountPaise,
      expireAfter: 1800,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: (input.message ?? "Saubhagya order").slice(0, 100),
        merchantUrls: { redirectUrl: input.redirectUrl },
      },
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    orderId?: string;
    state?: string;
    redirectUrl?: string;
    code?: string;
    message?: string;
  } | null;
  if (!res.ok || !json?.redirectUrl) {
    throw new Error(
      `PhonePe could not start the payment (${res.status}${json?.code ? ` ${json.code}` : ""}${json?.message ? `: ${json.message}` : ""})`,
    );
  }
  return { phonePeOrderId: json.orderId ?? null, redirectUrl: json.redirectUrl };
}

/**
 * The only trusted answer to "was this paid?". Redirects and webhooks are
 * treated as hints; this call to PhonePe decides.
 */
export async function getPhonePeOrderStatus(merchantOrderId: string) {
  const token = await accessToken();
  const res = await fetch(
    `${HOSTS[phonePeEnvironment()].pg}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false`,
    { headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${token}` } },
  );
  const json = (await res.json().catch(() => null)) as {
    orderId?: string;
    state?: string;
    amount?: number;
    code?: string;
  } | null;
  if (!res.ok || !json?.state) {
    throw new Error(`PhonePe status check failed (${res.status}${json?.code ? ` ${json.code}` : ""})`);
  }
  const state: PhonePeState =
    json.state === "COMPLETED" ? "COMPLETED" : json.state === "FAILED" ? "FAILED" : "PENDING";
  return { state, amountPaise: Number(json.amount ?? 0), phonePeOrderId: json.orderId ?? null };
}

/**
 * PhonePe sends `Authorization: SHA256(username:password)`.
 * Returns "ok", "bad", or "unset" (no username/password configured).
 */
export async function checkWebhookAuth(header: string | null): Promise<"ok" | "bad" | "unset"> {
  const user = env("PHONEPE_WEBHOOK_USERNAME");
  const pass = env("PHONEPE_WEBHOOK_PASSWORD");
  if (!user || !pass) return "unset";
  const expected = await sha256Hex(`${user}:${pass}`);
  const got = (header ?? "").replace(/^SHA256\s*/i, "").trim().toLowerCase();
  return timingSafeEqualStr(got, expected) ? "ok" : "bad";
}

/**
 * Checks one payment with PhonePe and records the result.
 *  - Always written to `payment_events` (the PC reads its VS#### payments there).
 *  - If it belongs to a website order in Supabase and the amount matches,
 *    that order is marked PAID.
 */
export async function settlePhonePePayment(merchantOrderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const status = await getPhonePeOrderStatus(merchantOrderId);
  const orderRef = orderRefOf(merchantOrderId);

  if (status.state !== "PENDING") {
    const { error } = await db.from("payment_events").upsert(
      {
        provider: "PHONEPE",
        event: status.state === "COMPLETED" ? "checkout.order.completed" : "checkout.order.failed",
        merchant_order_id: merchantOrderId,
        order_ref: orderRef,
        amount_paise: status.amountPaise,
        state: status.state,
        verified: true,
        raw: status,
      },
      { onConflict: "provider,merchant_order_id,state", ignoreDuplicates: true },
    );
    if (error) console.error("[PhonePe] payment_events write failed:", error.message);
  }

  const { data: order } = await db
    .from("orders")
    .select("id, order_id, amount, payment_status")
    .eq("payment_gateway_order_id", merchantOrderId)
    .maybeSingle();

  if (order && status.state === "COMPLETED" && order.payment_status !== "PAID") {
    const expectedPaise = Math.round(Number(order.amount ?? 0) * 100);
    if (expectedPaise > 0 && expectedPaise === status.amountPaise) {
      const { error } = await db
        .from("orders")
        .update({
          payment_status: "PAID",
          payment_method: "PHONEPE",
          payment_intent_id: status.phonePeOrderId,
          payment_amount: status.amountPaise / 100,
          payment_updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .neq("payment_status", "PAID");
      if (error) console.error("[PhonePe] order update failed:", error.message);
    } else {
      console.error(
        `[PhonePe] amount mismatch for ${order.order_id}: expected ${expectedPaise}, paid ${status.amountPaise}`,
      );
    }
  }

  return { ...status, orderRef, isWebsiteOrder: Boolean(order) };
}
