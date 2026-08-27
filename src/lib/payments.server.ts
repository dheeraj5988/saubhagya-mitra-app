/**
 * Server-only payment helpers. PayPur credentials live in a deny-all table that
 * only the service-role client can read, and never leave this module.
 */
export type PaypurConfig = {
  enabled: boolean;
  base_url: string;
  amount: number | null;
  success_url: string | null;
  failure_url: string | null;
  api_key: string | null;
  signing_secret: string | null;
};

export async function loadPaymentSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_settings")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();
  return data;
}

export async function loadPaymentSecrets() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_secrets")
    .select("paypur_api_key, paypur_signing_secret")
    .eq("singleton", true)
    .maybeSingle();
  return data;
}

export async function loadPaypurConfig(): Promise<PaypurConfig> {
  const [settings, secrets] = await Promise.all([loadPaymentSettings(), loadPaymentSecrets()]);
  return {
    enabled: Boolean(settings?.paypur_enabled),
    base_url: (settings?.paypur_base_url || "https://upi.paypur.in").replace(/\/+$/, ""),
    amount: settings?.paypur_amount == null ? null : Number(settings.paypur_amount),
    success_url: settings?.paypur_success_url ?? null,
    failure_url: settings?.paypur_failure_url ?? null,
    api_key: secrets?.paypur_api_key ?? null,
    signing_secret: secrets?.paypur_signing_secret ?? null,
  };
}

export function isPaypurReady(cfg: PaypurConfig) {
  return Boolean(
    cfg.enabled &&
      cfg.api_key &&
      cfg.signing_secret &&
      cfg.base_url &&
      cfg.success_url &&
      cfg.failure_url &&
      cfg.amount != null,
  );
}

/** HMAC-SHA256 over the contract's pipe-joined payload, hex encoded. */
export async function hmacHex(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeHexEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
