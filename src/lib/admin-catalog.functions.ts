import { createServerFn } from "@tanstack/react-start";

import {
  adminTokenSchema,
  clearLeadsSchema,
  leadIdSchema,
  paymentSettingsSchema,
  paymentStatusSchema,
  paypurSecretsSchema,
  screenshotUrlSchema,
  symbolIdSchema,
  symbolSaveSchema,
  uploadTargetSchema,
} from "./admin-catalog.schema";
import type { AdminPaymentSettings, AdminSymbol } from "./catalog.schema";

const SIGNED_TTL = 300;

/** Full catalog (active and inactive) for the admin console. */
export const adminSymbols = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: rows, error } = await db
      .from("election_symbols")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("party_name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    const paths = (rows ?? []).map((r) => r.symbol_image_path).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await db.storage
        .from("election-symbols")
        .createSignedUrls(paths, SIGNED_TTL);
      for (const item of urls ?? []) {
        if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
      }
    }

    return {
      symbols: (rows ?? []).map<AdminSymbol>((r) => ({
        id: r.id,
        party_name: r.party_name,
        symbol_name: r.symbol_name,
        symbol_image_path: r.symbol_image_path,
        image_url: r.symbol_image_path ? (signed.get(r.symbol_image_path) ?? null) : null,
        active: r.active,
        sort_order: r.sort_order,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  });

export const adminSaveSymbol = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => symbolSaveSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const payload = {
      party_name: data.party_name,
      symbol_name: data.symbol_name,
      active: data.active,
      sort_order: data.sort_order,
      ...(data.symbol_image_path !== undefined ? { symbol_image_path: data.symbol_image_path } : {}),
    };

    if (data.id) {
      const { error } = await db.from("election_symbols").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }

    const { data: row, error } = await db
      .from("election_symbols")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

/** Deleting a catalog entry never rewrites the snapshots stored on past orders. */
export const adminDeleteSymbol = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => symbolIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: row } = await db
      .from("election_symbols")
      .select("symbol_image_path")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await db.from("election_symbols").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row?.symbol_image_path) {
      await db.storage.from("election-symbols").remove([row.symbol_image_path]);
    }
    return { ok: true as const };
  });

/** Short-lived signed upload target so the browser never sees service keys. */
export const adminUploadTarget = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => uploadTargetSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const folder = data.kind === "symbol" ? "symbols" : "qr";
    const path = `${folder}/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await db.storage
      .from(data.bucket)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, bucket: data.bucket };
  });

export const adminPaymentSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const [{ data: settings }, { data: secrets }] = await Promise.all([
      db.from("payment_settings").select("*").eq("singleton", true).maybeSingle(),
      db.from("payment_secrets").select("paypur_api_key, paypur_signing_secret").eq("singleton", true).maybeSingle(),
    ]);

    let qrUrl: string | null = null;
    if (settings?.qr_image_path) {
      const { data: signed } = await db.storage
        .from("payment-assets")
        .createSignedUrl(settings.qr_image_path, SIGNED_TTL);
      qrUrl = signed?.signedUrl ?? null;
    }

    const result: AdminPaymentSettings = {
      display_name: settings?.display_name ?? null,
      upi_id: settings?.upi_id ?? null,
      instructions: settings?.instructions ?? null,
      amount: settings?.amount == null ? null : Number(settings.amount),
      qr_image_path: settings?.qr_image_path ?? null,
      qr_url: qrUrl,
      paypur_enabled: Boolean(settings?.paypur_enabled),
      paypur_base_url: settings?.paypur_base_url ?? "https://upi.paypur.in",
      paypur_amount: settings?.paypur_amount == null ? null : Number(settings.paypur_amount),
      paypur_success_url: settings?.paypur_success_url ?? null,
      paypur_failure_url: settings?.paypur_failure_url ?? null,
      // Only presence is ever reported back — the values stay server-side.
      has_api_key: Boolean(secrets?.paypur_api_key),
      has_signing_secret: Boolean(secrets?.paypur_signing_secret),
    };
    return result;
  });

export const adminSavePaymentSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paymentSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: existing } = await db
      .from("payment_settings")
      .select("qr_image_path")
      .eq("singleton", true)
      .maybeSingle();

    const { error } = await db
      .from("payment_settings")
      .update({
        display_name: data.display_name ?? null,
        upi_id: data.upi_id ?? null,
        instructions: data.instructions ?? null,
        amount: data.amount ?? null,
        ...(data.qr_image_path !== undefined ? { qr_image_path: data.qr_image_path } : {}),
        paypur_enabled: data.paypur_enabled,
        paypur_base_url: data.paypur_base_url,
        paypur_amount: data.paypur_amount ?? null,
        paypur_success_url: data.paypur_success_url ?? null,
        paypur_failure_url: data.paypur_failure_url ?? null,
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);

    // Drop a replaced QR image so old files don't linger in storage.
    const previous = existing?.qr_image_path;
    if (previous && data.qr_image_path !== undefined && data.qr_image_path !== previous) {
      await db.storage.from("payment-assets").remove([previous]);
    }
    return { ok: true as const };
  });

export const adminSavePaypurSecrets = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paypurSecretsSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const patch: { paypur_api_key?: string | null; paypur_signing_secret?: string | null } = {};
    if (data.api_key !== undefined) patch.paypur_api_key = data.api_key;
    if (data.signing_secret !== undefined) patch.paypur_signing_secret = data.signing_secret;
    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await db.from("payment_secrets").update(patch).eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminUpdatePaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paymentStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db
      .from("orders")
      .update({ payment_status: data.payment_status, payment_updated_at: new Date().toISOString() })
      .eq("order_id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminScreenshotUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => screenshotUrlSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { data: signed, error } = await db.storage
      .from("payment-assets")
      .createSignedUrl(data.path, SIGNED_TTL, data.download ? { download: true } : undefined);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

/** Per-row removal of a visitor/IP log. Orders are never touched here. */
export const adminDeleteLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db.from("visitor_leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Clears the entire visitor/IP log. Scoped strictly to visitor_leads. */
export const adminClearLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => clearLeadsSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error, count } = await db
      .from("visitor_leads")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true as const, deleted: count ?? 0 };
  });
