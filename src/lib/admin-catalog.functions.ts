import { createServerFn } from "@tanstack/react-start";

import {
  adminTokenSchema,
  clearLeadsSchema,
  leadIdSchema,
  paymentConfigSchema,
  paymentStatusSchema,
  phonepeSecretsSchema,
  sampleQuerySchema,
  sampleStatusSchema,
  symbolIdSchema,
  symbolSaveSchema,
  uploadTargetSchema,
} from "./admin-catalog.schema";
import type { AdminPaymentConfig, AdminSymbol } from "./catalog.schema";

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

    const path = `symbols/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await db.storage.from(data.bucket).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, bucket: data.bucket };
  });

/** Pricing + PhonePe onboarding settings. Secrets are reported as flags only. */
export const adminPaymentConfig = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    await assertSession(data.token);
    const { loadPaymentConfig, loadCredentialPresence } = await import("./payment-config.server");
    const [cfg, presence] = await Promise.all([loadPaymentConfig(), loadCredentialPresence()]);
    const result: AdminPaymentConfig = { ...cfg, ...presence };
    return result;
  });

export const adminSavePaymentConfig = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paymentConfigSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db
      .from("payment_config")
      .update({
        rate_per_voter: data.rate_per_voter,
        min_order_amount: data.min_order_amount ?? null,
        free_sample_voter_count: data.free_sample_voter_count,
        phonepe_enabled: data.phonepe_enabled,
        phonepe_environment: data.phonepe_environment,
        phonepe_merchant_id: data.phonepe_merchant_id ?? null,
        phonepe_client_id: data.phonepe_client_id ?? null,
        phonepe_redirect_url: data.phonepe_redirect_url ?? null,
        phonepe_callback_url: data.phonepe_callback_url ?? null,
        cashfree_enabled: data.cashfree_enabled,
        cashfree_env: data.cashfree_env ?? null,
        cashfree_app_id: data.cashfree_app_id ?? null,
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminSavePhonePeSecrets = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => phonepeSecretsSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const patch: {
      phonepe_client_secret?: string | null;
      phonepe_salt_key?: string | null;
      phonepe_salt_index?: string | null;
      cashfree_secret_key?: string | null;
    } = {};
    if (data.client_secret !== undefined) patch.phonepe_client_secret = data.client_secret ?? null;
    if (data.salt_key !== undefined) patch.phonepe_salt_key = data.salt_key ?? null;
    if (data.salt_index !== undefined) patch.phonepe_salt_index = data.salt_index ?? null;
    if (data.cashfree_secret_key !== undefined) patch.cashfree_secret_key = data.cashfree_secret_key ?? null;
    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await db.from("payment_credentials").update(patch).eq("singleton", true);
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

export const adminSampleRequests = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sampleQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession, sanitizeSearch } = await import("./admin.server");
    const db = await assertSession(data.token);

    const from = (data.page - 1) * data.page_size;
    let query = db
      .from("sample_requests")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    const term = sanitizeSearch(data.search);
    if (term) {
      query = query.or(
        ["request_id", "candidate_name", "contact_number", "district", "gram_panchayat"]
          .map((c) => `${c}.ilike.%${term}%`)
          .join(","),
      );
    }

    const res = await query.range(from, from + data.page_size - 1);
    if (res.error) throw new Error(res.error.message);
    return { requests: res.data ?? [], total: res.count ?? (res.data?.length ?? 0) };
  });

export const adminUpdateSampleStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sampleStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db
      .from("sample_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
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
