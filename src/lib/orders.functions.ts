import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import {
  LEAD_STATUSES,
  leadSchema,
  makeOrderId,
  orderSchema,
  sampleRequestSchema,
  visitSchema,
} from "./orders.schema";
import { compareWardNumbers } from "./csv";
import { computeAmount, designHasBanner, resolveRatePerVoter } from "./pricing";
import { REF_TTL_DAYS as REFERRAL_WINDOW_DAYS } from "./referral";

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
        referral_code: data.referral_code ?? null,
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

    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const requestIp =
      forwarded.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      "unknown";


    // Check blocklist
    if (requestIp !== "unknown" || data.contact_number) {
      const orConditions: string[] = [];
      if (data.contact_number) orConditions.push(`and(phone.eq.${data.contact_number},is_blocked.eq.true)`);
      if (requestIp !== "unknown") orConditions.push(`and(ip_address.eq.${requestIp},is_blocked.eq.true)`);
      
      const { data: blockedRows } = await supabaseAdmin
        .from("blocked_entities")
        .select("id")
        .or(orConditions.join(","))
        .limit(1);
        
      if (blockedRows && blockedRows.length > 0) {
        throw new Error("Cannot process order at this time. Please contact support.");
      }
    }

        // Task 6: Auto-flagging for spam (UNPAID older than 48h)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // Check IP
    if (requestIp !== "unknown") {
      const { data: unpaidIpOrders } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("ip_address", requestIp)
        .eq("payment_status", "UNPAID")
        .lte("created_at", fortyEightHoursAgo);
      if (unpaidIpOrders && unpaidIpOrders.length >= 3) {
        await supabaseAdmin.from("blocked_entities").upsert({
          ip_address: requestIp,
          reason: "Auto-flagged: 3+ unpaid orders older than 48h",
          unpaid_orders_count: unpaidIpOrders.length,
          is_blocked: false
        }, { onConflict: "ip_address" });
      }
    }

    // Check Phone
    if (data.contact_number) {
      const { data: unpaidPhoneOrders } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("contact_number", data.contact_number)
        .eq("payment_status", "UNPAID")
        .lte("created_at", fortyEightHoursAgo);
      if (unpaidPhoneOrders && unpaidPhoneOrders.length >= 3) {
        await supabaseAdmin.from("blocked_entities").upsert({
          phone: data.contact_number,
          reason: "Auto-flagged: 3+ unpaid orders older than 48h",
          unpaid_orders_count: unpaidPhoneOrders.length,
          is_blocked: false
        }, { onConflict: "phone" });
      }
    }

    // Price is always derived server-side: the ward's stored voter count times
    // the configured rate. A browser can never dictate the amount.
    const config = await loadPaymentConfig();

    // The selected wards are re-read from master data; the browser's numbers
    // are never trusted for either the voter total or the amount.
    const { data: wardRows, error: wardError } = await supabaseAdmin
      .from("geo_wards")
      .select("id, ward_number, voter_count")
      .in("id", data.ward_ids)
      .eq("active", true);
    if (wardError) throw new Error(wardError.message);
    if (!wardRows?.length) throw new Error("Selected wards are not available");

    const wardSnapshots = [...wardRows]
      .sort((a, b) => compareWardNumbers(a.ward_number as string, b.ward_number as string))
      .map((w) => ({
        ward_id: w.id as string,
        ward_number: w.ward_number as string,
        voter_count: w.voter_count as number,
      }));
    const voterCount = wardSnapshots.reduce((sum, w) => sum + w.voter_count, 0);
    const wardNumbers = wardSnapshots.map((w) => w.ward_number).join(", ");

    // Rate is always derived server-side from the admin-configured base rate
    // plus the design/photo-slip flags. A browser can never dictate the rate.
    const bannerOption = designHasBanner(data.design_code);
    const effectiveRate = resolveRatePerVoter(config.rate_per_voter, {
      banner: bannerOption,
      photoSlip: data.photo_slip,
    });
    const amount = computeAmount(voterCount, effectiveRate);

    // The unique index on orders.order_id is the source of truth: we insert and
    // retry on a 23505 conflict rather than checking-then-inserting, so two
    // concurrent submissions can never win the same id.
    let orderId = makeOrderId(0);
    let inserted = false;
    let orderUuid: string | null = null;

    for (let attempt = 0; attempt < 15; attempt++) {
      const payload: any = {
        order_id: orderId,
        candidate_name_hindi: data.candidate_name_hindi,
        candidate_name_english: data.candidate_name_english,
        contact_number: data.contact_number,
        district: data.district,
        panchayat_samiti: data.panchayat_samiti,
        gram_panchayat: data.gram_panchayat,
        ward_number: wardNumbers.slice(0, 200),
        ward_id: wardSnapshots[0]?.ward_id ?? null,
        ward_ids: wardSnapshots.map((w) => w.ward_id),
        ward_snapshots: wardSnapshots,
        design_code: data.design_code,
        voter_count: voterCount,
        rate_per_voter: effectiveRate,
        amount,
        election_symbol: data.election_symbol,
        election_symbol_id: data.election_symbol_id ?? null,
        party_name_snapshot: data.party_name_snapshot ?? null,
        symbol_name_snapshot: data.symbol_name_snapshot ?? null,
        slogan: data.slogan || null,
        body_name: data.body_name || null,
        evm_serial: data.evm_serial || null,
        poll_date: data.poll_date || null,
        list_options: data.list_options ?? [],
        photo_path: data.photo_path ?? null,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
        status: "New",
        payment_status: "UNPAID",
        banner_option: bannerOption,
        photo_slip: data.photo_slip,
        voter_photo_pdf_path: data.voter_photo_pdf_path ?? null,
      };

      const { data: row, error } = await supabaseAdmin
        .from("orders")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (!error) {
        inserted = true;
        orderUuid = (row?.id as string | undefined) ?? null;
        break;
      }
      if (error.code !== "23505") throw new Error(error.message);
      orderId = makeOrderId(attempt + 1);
    }

    if (!inserted) throw new Error("Could not generate a unique order id");

    // Task 2: Data Flywheel — log into the registry if photo_slip is on.
    if (data.photo_slip && data.voter_photo_pdf_path) {
      const registryRows: any[] = wardSnapshots.map((w) => ({
        ward_id: w.ward_id,
        district: data.district,
        panchayat_samiti: data.panchayat_samiti,
        gram_panchayat: data.gram_panchayat,
        ward_number: w.ward_number,
        voter_count: w.voter_count,
        pdf_path: data.voter_photo_pdf_path,
        asset_id: crypto.randomUUID(), // Unique tracker for the uploaded asset
      }));

      // Fire and forget; do not fail the order if the registry insertion fails.
      supabaseAdmin
        .from("ward_photo_data_registry")
        .insert(registryRows)
        .then((res: any) => {
          if (res.error) console.error("Error inserting into photo registry:", res.error);
        });
    }

    // Referral attribution. The partner, its commission terms and the
    // commission amount are all resolved server-side from the code alone —
    // the browser's numbers are never trusted, exactly like the ward re-read
    // above. A failure here must never fail the order the customer just placed.
    if (orderUuid && data.referral_code) {
      try {
        const capturedAt = data.referral_captured_at ? Date.parse(data.referral_captured_at) : NaN;
        const withinWindow =
          !data.referral_captured_at ||
          (Number.isFinite(capturedAt) &&
            Date.now() - capturedAt <= REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

        if (withinWindow) {
          const { data: partner } = await supabaseAdmin
            .from("referral_partners")
            .select("id, partner_code, commission_type, commission_value")
            .ilike("partner_code", data.referral_code)
            .eq("active", true)
            .maybeSingle();

          if (partner) {
            const attributedAt = new Date().toISOString();
            await supabaseAdmin
              .from("orders")
              .update({
                referral_partner_id: partner.id,
                referral_code: partner.partner_code,
                referral_attributed_at: attributedAt,
                referral_source: "LINK",
              })
              .eq("id", orderUuid);

            const { data: commission } = await supabaseAdmin.rpc("calc_commission", {
              p_type: partner.commission_type,
              p_value: partner.commission_value,
              p_amount: amount,
              p_voters: voterCount,
            });

            await supabaseAdmin.from("referral_conversions").insert({
              partner_id: partner.id,
              partner_code: partner.partner_code,
              order_uuid: orderUuid,
              order_id: orderId,
              order_amount: amount,
              voter_count: voterCount,
              commission_type: partner.commission_type,
              commission_value: partner.commission_value,
              commission_amount: Number(commission ?? 0),
              status: "PENDING",
              source: "LINK",
            });
          }
        }
      } catch (referralError) {
        console.error("[referral] attribution failed", referralError);
      }
    }

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
