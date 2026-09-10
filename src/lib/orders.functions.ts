import { createServerFn } from "@tanstack/react-start";

import {
  LEAD_STATUSES,
  leadSchema,
  makeOrderId,
  orderSchema,
  sampleRequestSchema,
  visitSchema,
} from "./orders.schema";
import { computeAmount } from "./pricing";

/**
 * All functions below are intentionally public (the order form is used by
 * anonymous visitors). Each one only ever INSERTs or UPDATEs its own row and
 * returns nothing but a freshly created id — none of them can read existing
 * orders, other visitors' leads, admin sessions, or candidate photos.
 */

export const recordVisit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => visitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("visitor_leads")
      .insert({
        ip_address: data.ip_address ?? null,
        lead_type: "visit",
        status: LEAD_STATUSES.visit,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { lead_id: row.id as string };
  });

export const captureLeadPhone = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    // Update the visitor's existing row when we have one, so repeated typing
    // never creates a second lead for the same session.
    if (data.lead_id) {
      const { data: updated, error } = await supabaseAdmin
        .from("visitor_leads")
        .update({
          phone: data.phone,
          lead_type: "abandoned",
          status: LEAD_STATUSES.abandoned,
          updated_at: nowIso,
        })
        .eq("id", data.lead_id)
        .neq("lead_type", "submitted")
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (updated) return { lead_id: updated.id as string };
      // Row was already submitted — keep it untouched.
      return { lead_id: data.lead_id };
    }

    // No session row yet: reuse a recent partial lead for the same phone
    // instead of inserting a duplicate.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("visitor_leads")
      .select("id")
      .eq("phone", data.phone)
      .neq("lead_type", "submitted")
      .gte("visited_at", since)
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("visitor_leads")
        .update({ lead_type: "abandoned", status: LEAD_STATUSES.abandoned, updated_at: nowIso })
        .eq("id", existing.id);
      return { lead_id: existing.id as string };
    }

    const { data: row, error } = await supabaseAdmin
      .from("visitor_leads")
      .insert({
        ip_address: data.ip_address ?? null,
        phone: data.phone,
        lead_type: "abandoned",
        status: LEAD_STATUSES.abandoned,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { lead_id: row.id as string };
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadPaymentConfig } = await import("./payment-config.server");

    // Price is always derived server-side: the ward's stored voter count times
    // the configured rate. A browser can never dictate the amount.
    const config = await loadPaymentConfig();
    let voterCount: number | null = null;
    if (data.ward_id) {
      const { data: ward } = await supabaseAdmin
        .from("geo_wards")
        .select("voter_count")
        .eq("id", data.ward_id)
        .maybeSingle();
      voterCount = ward?.voter_count ?? null;
    }
    const amount = voterCount == null ? null : computeAmount(voterCount, config.rate_per_voter);

    // The unique index on orders.order_id is the source of truth: we insert and
    // retry on a 23505 conflict rather than checking-then-inserting, so two
    // concurrent submissions can never win the same id.
    let orderId = makeOrderId(0);
    let inserted = false;

    for (let attempt = 0; attempt < 15; attempt++) {
      const { error } = await supabaseAdmin.from("orders").insert({
        order_id: orderId,
        candidate_name_hindi: data.candidate_name_hindi,
        candidate_name_english: data.candidate_name_english,
        contact_number: data.contact_number,
        district: data.district,
        panchayat_samiti: data.panchayat_samiti,
        gram_panchayat: data.gram_panchayat,
        ward_number: data.ward_number,
        ward_id: data.ward_id ?? null,
        design_code: data.design_code,
        voter_count: voterCount,
        rate_per_voter: config.rate_per_voter,
        amount,
        election_symbol: data.election_symbol,
        election_symbol_id: data.election_symbol_id ?? null,
        party_name_snapshot: data.party_name_snapshot ?? null,
        symbol_name_snapshot: data.symbol_name_snapshot ?? null,
        slogan: data.slogan || null,
        photo_path: data.photo_path,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
        status: "New",
        payment_status: "PENDING",
      });

      if (!error) {
        inserted = true;
        break;
      }
      if (error.code !== "23505") throw new Error(error.message);
      orderId = makeOrderId(attempt + 1);
    }

    if (!inserted) throw new Error("Could not generate a unique order id");

    // Promote the visitor's lead to Submitted and attach the order id.
    if (data.lead_id) {
      const { data: updated } = await supabaseAdmin
        .from("visitor_leads")
        .update({
          phone: data.contact_number,
          lead_type: "submitted",
          status: LEAD_STATUSES.submitted,
          order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.lead_id)
        .select("id")
        .maybeSingle();
      if (updated) {
        return { order_id: orderId, voter_count: voterCount, amount };
      }
    }

    await supabaseAdmin.from("visitor_leads").insert({
      ip_address: data.ip_address ?? null,
      phone: data.contact_number,
      lead_type: "submitted",
      status: LEAD_STATUSES.submitted,
      order_id: orderId,
    });

    return { order_id: orderId, voter_count: voterCount, amount };
  });

/** Free 24-voter sample request — no payment, no photo, no account. */
export const createSampleRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sampleRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadPaymentConfig } = await import("./payment-config.server");
    const config = await loadPaymentConfig();

    let requestId = makeOrderId(0, "SMP");
    for (let attempt = 0; attempt < 15; attempt++) {
      const { error } = await supabaseAdmin.from("sample_requests").insert({
        request_id: requestId,
        candidate_name: data.candidate_name,
        contact_number: data.contact_number,
        district: data.district ?? null,
        panchayat_samiti: data.panchayat_samiti ?? null,
        gram_panchayat: data.gram_panchayat ?? null,
        ward_number: data.ward_number ?? null,
        ward_id: data.ward_id ?? null,
        voter_count: config.free_sample_voter_count,
        notes: data.notes ?? null,
        ip_address: data.ip_address ?? null,
        status: "New",
      });
      if (!error) return { request_id: requestId };
      if (error.code !== "23505") throw new Error(error.message);
      requestId = makeOrderId(attempt + 1, "SMP");
    }
    throw new Error("Could not generate a unique request id");
  });
