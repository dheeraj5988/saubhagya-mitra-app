import { createServerFn } from "@tanstack/react-start";

import {
  deleteSchema,
  leadsExportSchema,
  leadsQuerySchema,
  loginSchema,
  ordersExportSchema,
  ordersQuerySchema,
  photoSchema,
  statusSchema,
  tokenSchema,
  type AdminKpis,
  type AdminLead,
  type AdminOrder,
} from "./admin.schema";

/** Signed photo URLs are deliberately short-lived. */
const SIGNED_URL_TTL_SECONDS = 300;
const ORDER_SEARCH_COLUMNS = [
  "order_id",
  "candidate_name_hindi",
  "contact_number",
  "district",
  "panchayat_samiti",
  "gram_panchayat",
  "election_symbol",
  "ward_number",
  "party_name_snapshot",
  "symbol_name_snapshot",
  "payment_txn_id",
  "referral_code",
] as const;
const EXPORT_LIMIT = 5000;

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const {
      clearLoginFailures,
      clientKey,
      constantTimeEqual,
      createSession,
      getLoginRateLimit,
      recordLoginFailure,
    } = await import("./admin.server");

    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) {
      throw new Error("SETUP: ADMIN_PASSWORD is not set on the server (check the host's environment variables).");
    }
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      throw new Error("SETUP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set on the server.");
    }

    const key = await clientKey();
    const limit = await getLoginRateLimit(key);
    if (limit.locked) {
      return {
        ok: false as const,
        locked: true as const,
        retry_after_seconds: limit.retryAfterSeconds,
        hint: null,
      };
    }

    if (!(await constantTimeEqual(data.password, expected))) {
      const failures = await recordLoginFailure(key, limit.failedCount);
      // The hint is released only on the genuine first failure, counted on the
      // server — a client cannot replay it by resetting its own state.
      return {
        ok: false as const,
        locked: false as const,
        retry_after_seconds: 0,
        hint: failures === 1 ? (process.env["ADMIN_PASSWORD_HINT"] ?? null) : null,
      };
    }

    await clearLoginFailures(key);
    let session: Awaited<ReturnType<typeof createSession>>;
    try {
      session = await createSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`SETUP: database error while signing in — ${msg.slice(0, 160)}`);
    }
    return { ok: true as const, token: session.token, expires_at: session.expires_at };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession, destroySession, UNAUTHORIZED } = await import("./admin.server");

    // Validate server-side first so logout is a deliberate act on a real
    // session, not an unauthenticated way to probe/delete arbitrary rows.
    try {
      await assertSession(data.token);
    } catch (err) {
      // An already-expired or unknown session is not an error worth surfacing:
      // the caller wants to be signed out and the client clears its token
      // regardless. Anything else is a genuine failure.
      const message = err instanceof Error ? err.message : "";
      if (message.includes(UNAUTHORIZED)) return { ok: true as const, already_expired: true };
      throw err;
    }

    await destroySession(data.token);
    return { ok: true as const, already_expired: false };
  });

/** KPI counts computed by the database — never derived from a partial page. */
export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const countPayments = (paymentStatus?: string) => {
      let q = db.from("orders").select("id", { count: "exact", head: true });
      if (paymentStatus) q = q.eq("payment_status", paymentStatus);
      return q;
    };

    const [total, paid, pending, samples, leads, revenue, wardRows, referred, commissions] =
      await Promise.all([
      countPayments(),
      countPayments("PAID"),
      countPayments("PENDING"),
      db.from("sample_requests").select("id", { count: "exact", head: true }),
      db.from("visitor_leads").select("id", { count: "exact", head: true }),
      // Revenue is summed in the database so it covers every paid order, not
      // just the rows on the current page.
      db.rpc("admin_revenue"),
      // DISTINCT across the whole table via a security-definer function, so the
      // ward list stays complete past any row limit.
      db.rpc("admin_distinct_wards"),
        db
          .from("orders")
          .select("id", { count: "exact", head: true })
          .not("referral_partner_id", "is", null),
        // Payable = commissions approved but not yet paid out.
        db.from("referral_conversions").select("commission_amount").eq("status", "APPROVED").limit(10_000),
      ]);

    const kpis: AdminKpis = {
      total: total.count ?? 0,
      paid: paid.count ?? 0,
      pending: pending.count ?? 0,
      revenue: Number(revenue.data ?? 0),
      samples: samples.count ?? 0,
      leads: leads.count ?? 0,
      referral_orders: referred.count ?? 0,
      commission_payable: (
        (commissions.data ?? []) as { commission_amount: number | null }[]
      ).reduce((sum, r) => sum + Number(r.commission_amount ?? 0), 0),
    };

    const wards = ((wardRows.data ?? []) as { ward_number: string }[])
      .map((r) => r.ward_number)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return { kpis, wards };
  });

type OrdersQuery = ReturnType<typeof ordersQuerySchema.parse>;

async function selectOrders(
  db: Awaited<ReturnType<(typeof import("./admin.server"))["assertSession"]>>,
  filters: Pick<OrdersQuery, "search" | "ward" | "status" | "payment_status">,
  range: { from: number; to: number },
  withCount: boolean,
) {
  const { sanitizeSearch } = await import("./admin.server");
  let query = db
    .from("orders")
    .select(
      "*, referral_partners:referral_partner_id(full_name)",
      withCount ? { count: "exact" } : undefined,
    )
    .order("created_at", { ascending: false });

  if (filters.ward !== "all") query = query.eq("ward_number", filters.ward);
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.payment_status !== "all") query = query.eq("payment_status", filters.payment_status);

  const term = sanitizeSearch(filters.search);
  if (term) {
    query = query.or(ORDER_SEARCH_COLUMNS.map((c) => `${c}.ilike.%${term}%`).join(","));
  }

  return query.range(range.from, range.to);
}

/** Bounded, server-side searched/filtered/paginated order list. */
export const adminOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ordersQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const from = (data.page - 1) * data.page_size;
    const res = await selectOrders(db, data, { from, to: from + data.page_size - 1 }, true);
    if (res.error) throw new Error(res.error.message);

    const rows = ((res.data ?? []) as unknown as (AdminOrder & {
      referral_partners?: { full_name: string | null } | null;
    })[]).map((o) => ({ ...o, referral_partner_name: o.referral_partners?.full_name ?? null }));

    // Sign only the photos on this page, and only briefly.
    const paths = rows.map((o) => o.photo_path).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await db.storage
        .from("candidate-photos")
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      for (const item of urls ?? []) {
        if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
      }
    }

    return {
      orders: rows.map((o) => ({
        ...o,
        photo_url: o.photo_path ? (signed.get(o.photo_path) ?? null) : null,
      })),
      total: res.count ?? rows.length,
    };
  });

type LeadsQuery = ReturnType<typeof leadsQuerySchema.parse>;

async function selectLeads(
  db: Awaited<ReturnType<(typeof import("./admin.server"))["assertSession"]>>,
  filters: Pick<LeadsQuery, "search" | "date" | "tz_offset">,
  range: { from: number; to: number },
  withCount: boolean,
) {
  const { sanitizeSearch } = await import("./admin.server");
  let query = db
    .from("visitor_leads")
    .select("*", withCount ? { count: "exact" } : undefined)
    .order("visited_at", { ascending: false });

  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    // Resolve the picked day against the operator's local midnight. Their
    // offset (minutes to add to local time to reach UTC, e.g. -330 for IST)
    // converts local midnight into the correct UTC instant.
    const localMidnightUtc = Date.parse(`${filters.date}T00:00:00.000Z`);
    const start = new Date(localMidnightUtc + filters.tz_offset * 60_000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    query = query.gte("visited_at", start.toISOString()).lt("visited_at", end.toISOString());
  }

  const term = sanitizeSearch(filters.search);
  if (term) {
    query = query.or(
      [`ip_address.ilike.%${term}%`, `phone.ilike.%${term}%`, `order_id.ilike.%${term}%`].join(","),
    );
  }

  return query.range(range.from, range.to);
}

export const adminLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadsQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const from = (data.page - 1) * data.page_size;
    const res = await selectLeads(db, data, { from, to: from + data.page_size - 1 }, true);
    if (res.error) throw new Error(res.error.message);

    return {
      leads: (res.data ?? []) as unknown as AdminLead[],
      total: res.count ?? (res.data?.length ?? 0),
    };
  });

/**
 * Export honours the exact same filters as the visible table. It returns the
 * matched total alongside the rows so the UI can say plainly when the download
 * was truncated at EXPORT_LIMIT rather than implying it holds every record.
 */
export const adminExportOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ordersExportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const res = await selectOrders(db, data, { from: 0, to: EXPORT_LIMIT - 1 }, true);
    if (res.error) throw new Error(res.error.message);
    const matched = res.count ?? (res.data?.length ?? 0);
    // photo_path is intentionally omitted: it is an internal storage key.
    return {
      orders: (res.data ?? []) as unknown as AdminOrder[],
      matched,
      limit: EXPORT_LIMIT,
      capped: matched > EXPORT_LIMIT,
    };
  });

export const adminExportLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadsExportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const res = await selectLeads(db, data, { from: 0, to: EXPORT_LIMIT - 1 }, true);
    if (res.error) throw new Error(res.error.message);
    const matched = res.count ?? (res.data?.length ?? 0);
    return {
      leads: (res.data ?? []) as unknown as AdminLead[],
      matched,
      limit: EXPORT_LIMIT,
      capped: matched > EXPORT_LIMIT,
    };
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db
      .from("orders")
      .update({ status: data.status })
      .eq("order_id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: row, error: readError } = await db
      .from("orders")
      .select("photo_path")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) return { ok: true, photo_removed: false };

    // Delete the row first. If this fails we stop, so the photo is never
    // orphaned from a surviving order record.
    const { error } = await db.from("orders").delete().eq("order_id", data.order_id);
    if (error) throw new Error(error.message);

    let photoRemoved = false;
    if (row.photo_path) {
      const { error: storageError } = await db.storage
        .from("candidate-photos")
        .remove([row.photo_path]);
      photoRemoved = !storageError;
      if (storageError) {
        console.error("Orphaned candidate photo", row.photo_path, storageError.message);
      }
    }

    return { ok: true, photo_removed: photoRemoved };
  });

export const adminPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => photoSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { data: signed, error } = await db.storage
      .from("candidate-photos")
      .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS, { download: true });
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
