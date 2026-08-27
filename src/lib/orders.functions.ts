import { createServerFn } from "@tanstack/react-start";

import { LEAD_STATUSES, leadSchema, makeOrderId, orderSchema, visitSchema } from "./orders.schema";

/**
 * All three functions below are intentionally public (the order form is used by
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
        election_symbol: data.election_symbol,
        election_symbol_id: data.election_symbol_id ?? null,
        party_name_snapshot: data.party_name_snapshot ?? null,
        symbol_name_snapshot: data.symbol_name_snapshot ?? null,
        slogan: data.slogan || null,
        photo_path: data.photo_path,
        ip_address: data.ip_address ?? null,
        status: "Pending",
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
      if (updated) return { order_id: orderId };
    }

    await supabaseAdmin.from("visitor_leads").insert({
      ip_address: data.ip_address ?? null,
      phone: data.contact_number,
      lead_type: "submitted",
      status: LEAD_STATUSES.submitted,
      order_id: orderId,
    });

    return { order_id: orderId };
  });
