import { createServerFn } from "@tanstack/react-start";

import {
  paypurStartSchema,
  screenshotSchema,
  type PublicPaymentPanel,
  type PublicSymbol,
} from "./catalog.schema";

const SIGNED_TTL = 3600;

/**
 * Public catalog read. Only active entries and only display fields are exposed;
 * symbol icons are served through short-lived signed URLs from a private bucket.
 */
export const listActiveSymbols = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("election_symbols")
    .select("id, party_name, symbol_name, symbol_image_path")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("party_name", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const paths = rows.map((r) => r.symbol_image_path).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabaseAdmin.storage
      .from("election-symbols")
      .createSignedUrls(paths, SIGNED_TTL);
    for (const item of urls ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
    }
  }

  return {
    symbols: rows.map<PublicSymbol>((r) => ({
      id: r.id,
      party_name: r.party_name,
      symbol_name: r.symbol_name,
      image_url: r.symbol_image_path ? (signed.get(r.symbol_image_path) ?? null) : null,
    })),
  };
});

/** Public payment panel — display-only settings plus a signed QR image URL. */
export const getPaymentPanel = createServerFn({ method: "GET" }).handler(async () => {
  const { loadPaypurConfig, loadPaymentSettings, isPaypurReady } = await import("./payments.server");
  const [settings, cfg] = await Promise.all([loadPaymentSettings(), loadPaypurConfig()]);

  let qrUrl: string | null = null;
  if (settings?.qr_image_path) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage
      .from("payment-assets")
      .createSignedUrl(settings.qr_image_path, SIGNED_TTL);
    qrUrl = data?.signedUrl ?? null;
  }

  const panel: PublicPaymentPanel = {
    display_name: settings?.display_name ?? null,
    upi_id: settings?.upi_id ?? null,
    instructions: settings?.instructions ?? null,
    amount: settings?.amount == null ? null : Number(settings.amount),
    qr_url: qrUrl,
    paypur_enabled: isPaypurReady(cfg),
  };
  return panel;
});

/** Associates an uploaded screenshot with an order and flags it for review. */
export const attachPaymentScreenshot = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => screenshotSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_screenshot_path: data.path,
        payment_status: "VERIFICATION_PENDING",
        payment_method: "MANUAL_QR",
        payment_updated_at: new Date().toISOString(),
      })
      .eq("order_id", data.order_id)
      .select("order_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Order not found");
    return { ok: true as const };
  });

/**
 * PayPur is strictly optional. Everything (key, signing secret, HMAC) happens
 * here on the server; the browser only ever receives the returned pay_url.
 */
export const startPaypurPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paypurStartSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadPaypurConfig, isPaypurReady, hmacHex } = await import("./payments.server");
    const cfg = await loadPaypurConfig();
    if (!isPaypurReady(cfg)) return { ok: false as const, pay_url: null };

    const amount = String(cfg.amount);
    const signature = await hmacHex(
      `${data.order_id}|${amount}|${cfg.success_url}|${cfg.failure_url}`,
      cfg.signing_secret!,
    );

    try {
      const res = await fetch(`${cfg.base_url}/api/merchant/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PAYPUR-KEY": cfg.api_key! },
        body: JSON.stringify({
          order_id: data.order_id,
          amount,
          surl: cfg.success_url,
          furl: cfg.failure_url,
          signature,
        }),
      });
      if (!res.ok) return { ok: false as const, pay_url: null };
      const json = (await res.json()) as { pay_url?: string; txn_id?: string };
      if (!json.pay_url) return { ok: false as const, pay_url: null };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("orders")
        .update({
          payment_txn_id: json.txn_id ?? null,
          payment_amount: cfg.amount,
          payment_method: "PAYPUR_GATEWAY",
          payment_updated_at: new Date().toISOString(),
        })
        .eq("order_id", data.order_id);

      return { ok: true as const, pay_url: json.pay_url };
    } catch (error) {
      console.error("PayPur init failed", error);
      return { ok: false as const, pay_url: null };
    }
  });
