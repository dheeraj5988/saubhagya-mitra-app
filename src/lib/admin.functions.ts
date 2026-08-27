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
  "candidate_name_english",
  "contact_number",
  "district",
  "panchayat_samiti",
  "gram_panchayat",
  "election_symbol",
  "ward_number",
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
    if (!expected) throw new Error("Admin password is not configured");

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
    const session = await createSession();
    return { ok: true as const, token: session.token, expires_at: session.expires_at };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { destroySession } = await import("./admin.server");
    // Deleting by token hash is itself the authorization check: only the holder
    // of the real token can remove that row.
    await destroySession(data.token);
    return { ok: true };
  });

/** KPI counts computed by the database — never derived from a partial page. */
export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const countOrders = (status?: string) => {
      let q = db.from("orders").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      return q;
    };

    const [total, pending, process, completed, leads, wardRows] = await Promise.all([
      countOrders(),
      countOrders("Pending"),
      countOrders("In-Process"),
      countOrders("Completed"),
      db.from("visitor_leads").select("id", { count: "exact", head: true }),
      db.from("orders").select("ward_number").limit(2000),
    ]);

    const kpis: AdminKpis = {
      total: total.count ?? 0,
      pending: pending.count ?? 0,
      process: process.count ?? 0,
      completed: completed.count ?? 0,
      leads: leads.count ?? 0,
    };

    const wards = Array.from(
      new Set((wardRows.data ?? []).map((r) => r.ward_number).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return { kpis, wards };
  });

type OrdersQuery = ReturnType<typeof ordersQuerySchema.parse>;

async function selectOrders(
  db: Awaited<ReturnType<(typeof import("./admin.server"))["assertSession"]>>,
  filters: Pick<OrdersQuery, "search" | "ward" | "status">,
  range: { from: number; to: number },
  withCount: boolean,
) {
  const { sanitizeSearch } = await import("./admin.server");
  let query = db
    .from("orders")
    .select("*", withCount ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false });

  if (filters.ward !== "all") query = query.eq("ward_number", filters.ward);
  if (filters.status !== "all") query = query.eq("status", filters.status);

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

    const rows = (res.data ?? []) as unknown as AdminOrder[];

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
  filters: Pick<LeadsQuery, "search" | "date">,
  range: { from: number; to: number },
  withCount: boolean,
) {
  const { sanitizeSearch } = await import("./admin.server");
  let query = db
    .from("visitor_leads")
    .select("*", withCount ? { count: "exact" } : undefined)
    .order("visited_at", { ascending: false });

  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    const start = new Date(`${filters.date}T00:00:00.000Z`);
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

/** Export honours the exact same filters as the visible table. */
export const adminExportOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ordersExportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const res = await selectOrders(db, data, { from: 0, to: EXPORT_LIMIT - 1 }, false);
    if (res.error) throw new Error(res.error.message);
    // photo_path is intentionally omitted: it is an internal storage key.
    return { orders: (res.data ?? []) as unknown as AdminOrder[] };
  });

export const adminExportLeads = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadsExportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const res = await selectLeads(db, data, { from: 0, to: EXPORT_LIMIT - 1 }, false);
    if (res.error) throw new Error(res.error.message);
    return { leads: (res.data ?? []) as unknown as AdminLead[] };
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
