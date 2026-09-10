/**
 * Server-only payment configuration.
 *
 * PhonePe credentials live in a deny-all table that only the service-role
 * client can read, and never leave this module. Nothing here is bundled for
 * the browser (the file name ends in `.server.ts`).
 */
import { DEFAULT_RATE_PER_VOTER, DEFAULT_SAMPLE_VOTER_COUNT } from "./pricing";
import type { PhonePeEnvironment } from "./catalog.schema";

export type PaymentConfig = {
  rate_per_voter: number;
  min_order_amount: number | null;
  free_sample_voter_count: number;
  phonepe_enabled: boolean;
  phonepe_environment: PhonePeEnvironment;
  phonepe_merchant_id: string | null;
  phonepe_client_id: string | null;
  phonepe_redirect_url: string | null;
  phonepe_callback_url: string | null;
};

export async function loadPaymentConfig(): Promise<PaymentConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_config")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();

  return {
    rate_per_voter: data?.rate_per_voter == null ? DEFAULT_RATE_PER_VOTER : Number(data.rate_per_voter),
    min_order_amount: data?.min_order_amount == null ? null : Number(data.min_order_amount),
    free_sample_voter_count: data?.free_sample_voter_count ?? DEFAULT_SAMPLE_VOTER_COUNT,
    phonepe_enabled: Boolean(data?.phonepe_enabled),
    phonepe_environment: (data?.phonepe_environment as PhonePeEnvironment) ?? "SANDBOX",
    phonepe_merchant_id: data?.phonepe_merchant_id ?? null,
    phonepe_client_id: data?.phonepe_client_id ?? null,
    phonepe_redirect_url: data?.phonepe_redirect_url ?? null,
    phonepe_callback_url: data?.phonepe_callback_url ?? null,
  };
}

/** Presence flags only — the secret values themselves stay in this module. */
export async function loadCredentialPresence() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_credentials")
    .select("phonepe_client_secret, phonepe_salt_key")
    .eq("singleton", true)
    .maybeSingle();
  return {
    has_client_secret: Boolean(data?.phonepe_client_secret),
    has_salt_key: Boolean(data?.phonepe_salt_key),
  };
}
