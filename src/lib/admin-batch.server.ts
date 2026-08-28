/**
 * Server-only batch selection shared by the Claude JSON export and the asset
 * ZIP endpoint. Both are bounded to BATCH_MAX rows.
 */
import { BATCH_MAX, type BatchInput } from "./admin-batch.schema";

const SEARCH_COLUMNS = [
  "order_id",
  "candidate_name_hindi",
  "candidate_name_english",
  "contact_number",
  "district",
  "panchayat_samiti",
  "gram_panchayat",
  "election_symbol",
  "ward_number",
  "party_name_snapshot",
  "symbol_name_snapshot",
  "payment_txn_id",
] as const;

export async function fetchBatchOrders(input: BatchInput) {
  const { assertSession, sanitizeSearch } = await import("./admin.server");
  const db = await assertSession(input.token);
  const limit = Math.min(input.limit, BATCH_MAX);

  let query = db
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (input.order_ids.length) {
    query = query.in("order_id", input.order_ids.slice(0, BATCH_MAX));
  } else {
    if (input.ward !== "all") query = query.eq("ward_number", input.ward);
    if (input.status !== "all") query = query.eq("status", input.status);
    if (input.payment_status !== "all") query = query.eq("payment_status", input.payment_status);
    const term = sanitizeSearch(input.search);
    if (term) query = query.or(SEARCH_COLUMNS.map((c) => `${c}.ilike.%${term}%`).join(","));
  }

  const res = await query.range(0, limit - 1);
  if (res.error) throw new Error(res.error.message);

  return {
    db,
    rows: (res.data ?? []) as Record<string, unknown>[],
    matched: res.count ?? (res.data?.length ?? 0),
    limit,
  };
}

/** BATCH_YYYY_MM_DD_01 — the sequence is per export, not persisted. */
export function makeBatchId(date = new Date()) {
  const iso = date.toISOString().slice(0, 10).replace(/-/g, "_");
  return `BATCH_${iso}_01`;
}
