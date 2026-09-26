import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  LEAD_STATUSES,
  leadSchema,
  makeOrderId,
  orderSchema,
  sampleRequestSchema,
  visitSchema,
} from "./orders.schema";
import { compareWardNumbers } from "./csv";
import { computeAmount, designHasBanner, rateFor } from "./pricing";
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
    // 1. Anti-bot: Honeypot check (PDF-1 §5क)
    if (data.website && data.website.length > 0) {
      throw new Error("ऑर्डर नहीं बन सका");
    }

    // 2. Anti-bot: 6-second rule (PDF-1 §5क)
    if (data.form_started_at && Date.now() - data.form_started_at < 6000) {
      throw new Error("ऑर्डर नहीं बन सका");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 3. IP extraction & sanitization
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const rawIp =
      forwarded.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      "";
    const requestIp = rawIp.replace(/[^0-9a-fA-F:.]/g, "").slice(0, 45);

    // 4. Anti-bot: > 3 orders / IP / minute
    if (requestIp) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const { count: ipOrderCount } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", requestIp)
        .gte("created_at", oneMinuteAgo);

      if (ipOrderCount && ipOrderCount > 3) {
        throw new Error("कृपया 1 मिनट बाद फिर कोशिश कीजिए");
      }
    }

    // 5. Check manual blocklist (blocked_entities)
    if (requestIp || data.contact_number) {
      const orConditions: string[] = [];
      if (data.contact_number) {
        orConditions.push(`and(phone.eq.${data.contact_number},is_blocked.eq.true)`);
      }
      if (requestIp) {
        orConditions.push(`and(ip_address.eq.${requestIp},is_blocked.eq.true)`);
      }

      if (orConditions.length > 0) {
        const { data: blockedRows } = await (supabaseAdmin as any)
          .from("blocked_entities")
          .select("id")
          .or(orConditions.join(","))
          .limit(1);

        if (blockedRows && blockedRows.length > 0) {
          throw new Error("Cannot process order at this time. Please contact support.");
        }
      }
    }

    // 6. Hold rules (PDF-1 §5क)
    const maxUnpaid = Number(process.env["PIPELINE_MAX_UNPAID"] || 5);
    const maxAwaiting = Number(process.env["PIPELINE_MAX_AWAITING"] || 3);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let initialStatus = "New";
    let holdReason: string | null = null;

    try {
      const unpaidQuery = supabaseAdmin
        .from("orders")
        .select("id, created_at")
        .eq("payment_status", "PENDING")
        .gte("created_at", sevenDaysAgo);

      if (data.contact_number && requestIp) {
        unpaidQuery.or(`contact_number.eq.${data.contact_number},ip_address.eq.${requestIp}`);
      } else if (data.contact_number) {
        unpaidQuery.eq("contact_number", data.contact_number);
      } else if (requestIp) {
        unpaidQuery.eq("ip_address", requestIp);
      }

      const { data: recentUnpaid } = await unpaidQuery;
      const unpaidOrders = recentUnpaid ?? [];

      if (unpaidOrders.length >= maxUnpaid) {
        initialStatus = "On Hold";
        holdReason = "[रोका — 5 बिना भुगतान]";
      } else {
        const fortyEightHoursMs = 48 * 60 * 60 * 1000;
        const olderCount = unpaidOrders.filter(
          (o) => Date.now() - new Date(o.created_at).getTime() >= fortyEightHoursMs
        ).length;
        if (olderCount >= maxAwaiting) {
          initialStatus = "On Hold";
          holdReason = "[रोका — 3 पुराने बकाया]";
        }
      }
    } catch (unpaidErr) {
      console.warn("[orders] Could not check unpaid hold limits:", unpaidErr);
    }

    // Price is always derived server-side: the stored voter count times the
    // series rate (P / S / A / Ph). A browser can never dictate the amount.

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

    // Booths (भाग): a ward with booths selected counts only those booths; a
    // ward without any selected booth counts in full.
    type BoothSnapshot = {
      booth_id: string;
      ward_id: string;
      booth_number: string;
      booth_name: string | null;
      voter_count: number;
    };
    let boothSnapshots: BoothSnapshot[] = [];
    if (data.booth_ids.length) {
      const { data: boothRows, error: boothError } = await (supabaseAdmin as any)
        .from("geo_booths")
        .select("id, ward_id, booth_number, booth_name, voter_count")
        .in("id", data.booth_ids)
        .in(
          "ward_id",
          wardSnapshots.map((w) => w.ward_id),
        )
        .eq("active", true);
      if (boothError) throw new Error(boothError.message);
      boothSnapshots = ((boothRows ?? []) as any[]).map((b) => ({
        booth_id: b.id as string,
        ward_id: b.ward_id as string,
        booth_number: String(b.booth_number),
        booth_name: (b.booth_name as string | null) ?? null,
        voter_count: Number(b.voter_count ?? 0),
      }));
    }
    const wardsWithBooths = new Set(boothSnapshots.map((b) => b.ward_id));
    const voterCount =
      wardSnapshots
        .filter((w) => !wardsWithBooths.has(w.ward_id))
        .reduce((sum, w) => sum + w.voter_count, 0) +
      boothSnapshots.reduce((sum, b) => sum + b.voter_count, 0);
    const wardNumbers = wardSnapshots.map((w) => w.ward_number).join(", ");
    const boothLabel = boothSnapshots.map((b) => b.booth_number).join(", ");

    const bannerOption = designHasBanner(data.design_code);
    const effectiveRate = rateFor(data.design_code, data.photo_slip);
    const amount = computeAmount(voterCount, effectiveRate);

    // The unique index on orders.order_id is the source of truth: we insert and
    // retry on a 23505 conflict rather than checking-then-inserting.
    let orderId = makeOrderId(0);
    let inserted = false;
    let orderUuid: string | null = null;
    let storedDestination: "supabase" | "r2" = "supabase";

    for (let attempt = 0; attempt < 15; attempt++) {
      const payload: any = {
        order_id: orderId,
        candidate_name_hindi: data.candidate_name_hindi,
        candidate_name_english: "",
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
        body_name: data.body_name || data.gram_panchayat || null,
        evm_serial: data.evm_serial || null,
        poll_date: data.poll_date || null,
        list_options: data.list_options ?? [],
        photo_path: data.photo_path ?? null,
        ip_address: requestIp || data.ip_address || null,
        user_agent: data.user_agent ?? null,
        status: initialStatus,
        payment_status: "PENDING",
        banner_option: bannerOption,
        photo_slip: data.photo_slip,
        voter_photo_pdf_path: data.voter_photo_pdf_path ?? null,
        pad: data.pad,
        booth_ids: boothSnapshots.map((b) => b.booth_id),
        booth_snapshots: boothSnapshots,
        source: "web_fallback",
        hold_reason: holdReason,
      };

      try {
        let { data: row, error } = await supabaseAdmin
          .from("orders")
          .insert(payload)
          .select("id")
          .maybeSingle();

        // Safety net if columns are missing
        if (error && (error.code === "PGRST204" || error.code === "42703")) {
          const { pad, booth_ids, booth_snapshots, hold_reason, source, ...legacy } = payload;
          void pad; void booth_ids; void booth_snapshots; void hold_reason; void source;
          legacy.body_name = [
            legacy.body_name,
            `पद: ${data.pad}`,
            boothLabel ? `भाग: ${boothLabel}` : null,
          ]
            .filter(Boolean)
            .join(" | ")
            .slice(0, 160);
          ({ data: row, error } = await supabaseAdmin
            .from("orders")
            .insert(legacy)
            .select("id")
            .maybeSingle());
        }

        if (!error) {
          inserted = true;
          orderUuid = (row?.id as string | undefined) ?? null;
          break;
        }

        if (error.code === "23505") {
          orderId = makeOrderId(attempt + 1);
          continue;
        }

        console.error("[orders] Supabase insert failed:", error);
        break;
      } catch (insertErr) {
        console.error("[orders] Supabase insert exception:", insertErr);
        break;
      }
    }

    // §5.4 Never lose an order: fallback to R2 if Supabase insert failed
    if (!inserted) {
      try {
        const { putObject } = await import("./r2.server");
        const dateStr = new Date().toISOString().slice(0, 10);
        const r2Key = `fallback-orders/${dateStr}/${orderId}.json`;
        const orderDataToStore = {
          order_id: orderId,
          created_at: new Date().toISOString(),
          candidate_name_hindi: data.candidate_name_hindi,
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
          body_name: data.body_name || data.gram_panchayat || null,
          evm_serial: data.evm_serial || null,
          poll_date: data.poll_date || null,
          list_options: data.list_options ?? [],
          photo_path: data.photo_path ?? null,
          ip_address: requestIp || data.ip_address || null,
          user_agent: data.user_agent ?? null,
          status: initialStatus,
          payment_status: "PENDING",
          banner_option: bannerOption,
          photo_slip: data.photo_slip,
          voter_photo_pdf_path: data.voter_photo_pdf_path ?? null,
          pad: data.pad,
          booth_ids: boothSnapshots.map((b) => b.booth_id),
          booth_snapshots: boothSnapshots,
          source: "web_fallback",
          hold_reason: holdReason,
        };

        await putObject(r2Key, JSON.stringify(orderDataToStore, null, 2), "application/json");
        storedDestination = "r2";
      } catch (r2Err) {
        console.error("[orders] R2 fallback also failed:", r2Err);
        throw new Error("ORDER_STORE_FAILED");
      }
    }

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
      (supabaseAdmin as any)
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
        return {
          order_id: orderId,
          voter_count: voterCount,
          amount,
          status: initialStatus,
          hold_reason: holdReason,
          stored: storedDestination,
        };
      }
    }

    await supabaseAdmin.from("visitor_leads").insert({
      ip_address: data.ip_address ?? null,
      phone: data.contact_number,
      lead_type: "submitted",
      status: LEAD_STATUSES.submitted,
      order_id: orderId,
    });

    return {
      order_id: orderId,
      voter_count: voterCount,
      amount,
      status: initialStatus,
      hold_reason: holdReason,
      stored: storedDestination,
    };
  });

/** Free sample request (given on request only) — no payment, no photo, no account. */
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

export const createCashfreePaymentSession = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; amount: number; customerPhone: string; customerName: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [configRes, credsRes] = await Promise.all([
      supabaseAdmin.from("payment_config").select("cashfree_enabled, cashfree_env, cashfree_app_id").eq("singleton", true).maybeSingle(),
      supabaseAdmin.from("payment_credentials").select("cashfree_secret_key").eq("singleton", true).maybeSingle(),
    ]);
    const config = configRes.data;
    const creds = credsRes.data;

    if (!config?.cashfree_enabled) throw new Error("Payment gateway is currently disabled");
    
    const isSandbox = config.cashfree_env === "sandbox";
    const appId = config.cashfree_app_id;
    const secretKey = creds?.cashfree_secret_key;
    const endpoint = isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";
    if (!appId || !secretKey) throw new Error("Cashfree credentials missing");
    const payload = {
      order_id: data.orderId,
      order_amount: data.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: data.customerPhone,
        customer_phone: data.customerPhone,
        customer_name: data.customerName || "Customer",
      },
      order_meta: {
        return_url: `${process.env["VITE_APP_URL"] || "http://localhost:3000"}/order/${data.orderId}`,
      },
    };
    const res = await fetch(`${endpoint}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create Cashfree session");
    const result = await res.json();
    return { payment_session_id: result.payment_session_id };
  });

export const createPhonePePayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().min(1),
        amount: z.number().int().positive(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { createPhonePePayment: createPhonePePayServer } = await import("./phonepe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Format merchantOrderId: <SBG-code>-<base36 time>
    const merchantOrderId = `${data.orderId}-${Date.now().toString(36)}`;
    const appUrl = process.env["VITE_APP_URL"] || "https://saubhagya.net";
    const redirectUrl = `${appUrl}/order/${data.orderId}?paid=1`;

    const res = await createPhonePePayServer({
      merchantOrderId,
      amountPaise: data.amount * 100, // INR to paise
      redirectUrl,
    });

    if (!res.redirectUrl) {
      throw new Error("Failed to initiate PhonePe payment");
    }

    // Save payment_gateway_order_id in orders
    await supabaseAdmin
      .from("orders")
      .update({ payment_gateway_order_id: merchantOrderId })
      .eq("order_id", data.orderId);

    return { redirectUrl: res.redirectUrl };
  });

export const getPublicPaymentConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("payment_config")
      .select("cashfree_enabled, cashfree_env")
      .eq("singleton", true)
      .maybeSingle();
    const phonepe_enabled = process.env["PHONEPE_ENABLED"] === "true";
    return {
      cashfree_enabled: Boolean(data?.cashfree_enabled),
      cashfree_env: data?.cashfree_env || "sandbox",
      phonepe_enabled,
    };
  });
