import { createServerFn } from "@tanstack/react-start";

import {
  assignOrderPartnerSchema,
  conversionStatusSchema,
  conversionsExportSchema,
  conversionsQuerySchema,
  partnerCreateSchema,
  partnersQuerySchema,
  partnerToggleSchema,
  partnerUpdateSchema,
  type AdminConversion,
  type AdminPartnerStats,
  type CommissionType,
  type ConversionStatus,
} from "./admin-referral.schema";

const EXPORT_LIMIT = 5000;

/** Only these moves are allowed; anything else is rejected server-side. */
const ALLOWED_TRANSITIONS: Record<string, ConversionStatus[]> = {
  PENDING: ["REJECTED"],
  APPROVED: ["PAID", "REJECTED"],
  REJECTED: ["PENDING"],
  PAID: [],
};

type SummaryRow = {
  partner_id: string;
  partner_code: string;
  full_name: string;
  phone: string | null;
  active: boolean;
  commission_type: string;
  commission_value: number;
  click_count: number;
  order_count: number;
  paid_order_count: number;
  total_order_amount: number;
  commission_pending: number;
  commission_approved: number;
  commission_paid: number;
  last_activity_at: string | null;
};

export const adminListPartners = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => partnersQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const [summary, details] = await Promise.all([
      db.rpc("admin_referral_summary"),
      db.from("referral_partners").select("*").limit(1000),
    ]);
    if (details.error) throw new Error(details.error.message);

    // If RPC fails (e.g. dropped in a migration), fallback gracefully
    if (summary.error) {
      console.warn("admin_referral_summary failed, using fallback:", summary.error);
    }

    const byId = new Map(((details.data ?? []) as Record<string, unknown>[]).map((r) => [r["id"] as string, r]));

    const summaryData = (!summary.error && summary.data ? summary.data : []) as unknown as SummaryRow[];
    
    // Create a base row for all partners, update with summary if available
    const partnerIds = new Set([
      ...summaryData.map(s => s.partner_id),
      ...Array.from(byId.keys())
    ]);

    const rows: AdminPartnerStats[] = Array.from(partnerIds).map(id => {
      const s = summaryData.find(x => x.partner_id === id);
      const d = byId.get(id) ?? {};
      
      const partner_code = (s?.partner_code ?? d["partner_code"]) as string;
      const full_name = (s?.full_name ?? d["full_name"]) as string;
      const phone = (s?.phone ?? d["phone"]) as string | null;

      return {
        id,
        partner_code,
        full_name,
        phone,
        whatsapp: (d["whatsapp"] as string | null) ?? null,
        district: (d["district"] as string | null) ?? null,
        notes: (d["notes"] as string | null) ?? null,
        active: (s?.active ?? (d["active"] as boolean)) ?? false,
        commission_type: ((s?.commission_type ?? d["commission_type"]) as CommissionType) ?? "FLAT",
        commission_value: Number(s?.commission_value ?? d["commission_value"] ?? 0),
        click_count: Number(s?.click_count ?? 0),
        order_count: Number(s?.order_count ?? 0),
        paid_order_count: Number(s?.paid_order_count ?? 0),
        total_order_amount: Number(s?.total_order_amount ?? 0),
        commission_pending: Number(s?.commission_pending ?? 0),
        commission_approved: Number(s?.commission_approved ?? 0),
        commission_paid: Number(s?.commission_paid ?? 0),
        commission_payable: Number(s?.commission_approved ?? 0),
        last_activity_at: s?.last_activity_at ?? null,
      };
    });

    const term = data.search.trim().toLowerCase();
    const partners = term
      ? rows.filter((r) =>
          [r.partner_code, r.full_name, r.phone, r.district]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term)),
        )
      : rows;

    return { partners };
  });

export const adminCreatePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => partnerCreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: row, error } = await db
      .from("referral_partners")
      .insert({
        partner_code: data.partner_code.toUpperCase(),
        full_name: data.full_name,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        district: data.district || null,
        notes: data.notes || null,
        commission_type: data.commission_type,
        commission_value: data.commission_value,
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("That partner code already exists.");
      throw new Error(error.message);
    }
    return { ok: true as const, id: row.id as string };
  });

/**
 * Changing a partner's commission terms only affects future conversions —
 * existing rows keep the snapshot taken when they were created.
 */
export const adminUpdatePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => partnerUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { error } = await db
      .from("referral_partners")
      .update({
        ...(data.partner_code ? { partner_code: data.partner_code.toUpperCase() } : {}),
        full_name: data.full_name,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        district: data.district || null,
        notes: data.notes || null,
        commission_type: data.commission_type,
        commission_value: data.commission_value,
      })
      .eq("id", data.id);

    if (error) {
      if (error.code === "23505") throw new Error("That partner code already exists.");
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminTogglePartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => partnerToggleSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db
      .from("referral_partners")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const CONVERSION_SELECT =
  "*, orders:order_uuid(candidate_name_hindi, candidate_name_english, contact_number, payment_status), referral_partners:partner_id(full_name)";

type ConversionRow = Record<string, unknown> & {
  orders: {
    candidate_name_hindi: string | null;
    candidate_name_english: string | null;
    contact_number: string | null;
    payment_status: string | null;
  } | null;
  referral_partners: { full_name: string | null } | null;
};

function mapConversion(r: ConversionRow): AdminConversion {
  const order = r.orders;
  return {
    id: r["id"] as string,
    partner_id: r["partner_id"] as string,
    partner_code: r["partner_code"] as string,
    partner_name: r.referral_partners?.full_name ?? null,
    order_uuid: r["order_uuid"] as string,
    order_id: r["order_id"] as string,
    order_amount: r["order_amount"] == null ? null : Number(r["order_amount"]),
    voter_count: r["voter_count"] == null ? null : Number(r["voter_count"]),
    commission_type: r["commission_type"] as string,
    commission_value: Number(r["commission_value"] ?? 0),
    commission_amount: Number(r["commission_amount"] ?? 0),
    status: r["status"] as ConversionStatus,
    source: r["source"] as string,
    payout_note: (r["payout_note"] as string | null) ?? null,
    approved_at: (r["approved_at"] as string | null) ?? null,
    paid_at: (r["paid_at"] as string | null) ?? null,
    created_at: r["created_at"] as string,
    candidate_name:
      order?.candidate_name_hindi || order?.candidate_name_english || null,
    contact_number: order?.contact_number ?? null,
    payment_status: order?.payment_status ?? null,
  };
}

async function selectConversions(
  db: Awaited<ReturnType<(typeof import("./admin.server"))["assertSession"]>>,
  filters: { partner_id?: string | null | undefined; status: string; search: string },
  range: { from: number; to: number },
) {
  const { sanitizeSearch } = await import("./admin.server");
  let query = db
    .from("referral_conversions")
    .select(CONVERSION_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.partner_id) query = query.eq("partner_id", filters.partner_id);
  if (filters.status !== "all") query = query.eq("status", filters.status);

  const term = sanitizeSearch(filters.search);
  if (term) {
    query = query.or([`order_id.ilike.%${term}%`, `partner_code.ilike.%${term}%`].join(","));
  }

  return query.range(range.from, range.to);
}

export const adminListConversions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => conversionsQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const from = (data.page - 1) * data.page_size;
    const res = await selectConversions(db, data, { from, to: from + data.page_size - 1 });
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as ConversionRow[];
    return { conversions: rows.map(mapConversion), total: res.count ?? rows.length };
  });

export const adminExportConversions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => conversionsExportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const res = await selectConversions(db, data, { from: 0, to: EXPORT_LIMIT - 1 });
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as ConversionRow[];
    const matched = res.count ?? rows.length;
    return {
      conversions: rows.map(mapConversion),
      matched,
      limit: EXPORT_LIMIT,
      capped: matched > EXPORT_LIMIT,
    };
  });

export const adminSetConversionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => conversionStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: row, error: readError } = await db
      .from("referral_conversions")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("That commission entry no longer exists.");

    const current = row.status as string;
    if (!(ALLOWED_TRANSITIONS[current] ?? []).includes(data.status)) {
      throw new Error(`Cannot move a ${current} commission to ${data.status}.`);
    }

    const patch: {
      status: ConversionStatus;
      paid_at?: string | null;
      approved_at?: string | null;
      payout_note?: string | null;
    } = { status: data.status };
    if (data.status === "PAID") patch.paid_at = new Date().toISOString();
    if (data.status === "PENDING") {
      patch.approved_at = null;
      patch.paid_at = null;
    }
    if (data.payout_note !== undefined) patch.payout_note = data.payout_note || null;

    const { error } = await db.from("referral_conversions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Manual mapping for a missed attribution. The commission is always recomputed
 * server-side from the partner's current terms and the order's stored amount.
 */
export const adminAssignOrderPartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => assignOrderPartnerSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, order_id, amount, voter_count, payment_status")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("Order not found.");

    if (!data.partner_id) {
      const { error } = await db
        .from("orders")
        .update({
          referral_partner_id: null,
          referral_code: null,
          referral_attributed_at: null,
          referral_source: null,
        })
        .eq("id", order.id);
      if (error) throw new Error(error.message);
      await db
        .from("referral_conversions")
        .delete()
        .eq("order_uuid", order.id)
        .neq("status", "PAID");
      return { ok: true as const, assigned: false as const };
    }

    const { data: partner, error: partnerError } = await db
      .from("referral_partners")
      .select("id, partner_code, commission_type, commission_value")
      .eq("id", data.partner_id)
      .maybeSingle();
    if (partnerError) throw new Error(partnerError.message);
    if (!partner) throw new Error("Partner not found.");

    const now = new Date().toISOString();
    const { error: updateError } = await db
      .from("orders")
      .update({
        referral_partner_id: partner.id,
        referral_code: partner.partner_code,
        referral_attributed_at: now,
        referral_source: "MANUAL",
      })
      .eq("id", order.id);
    if (updateError) throw new Error(updateError.message);

    const { data: commission } = await db.rpc("calc_commission", {
      p_type: partner.commission_type,
      p_value: partner.commission_value,
      p_amount: order.amount ?? 0,
      p_voters: order.voter_count ?? 0,
    });

    const isPaid = order.payment_status === "PAID";
    const { error: convError } = await db.from("referral_conversions").upsert(
      {
        partner_id: partner.id,
        partner_code: partner.partner_code,
        order_uuid: order.id,
        order_id: order.order_id,
        order_amount: order.amount,
        voter_count: order.voter_count,
        commission_type: partner.commission_type,
        commission_value: partner.commission_value,
        commission_amount: Number(commission ?? 0),
        status: isPaid ? "APPROVED" : "PENDING",
        source: "MANUAL",
        approved_at: isPaid ? now : null,
      },
      { onConflict: "order_uuid" },
    );
    if (convError) throw new Error(convError.message);

    return { ok: true as const, assigned: true as const, partner_code: partner.partner_code };
  });
