import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateUploadUrl, listObjects, getObject, copyObject, deleteObject } from "@/lib/r2.server";
import { timingSafeEqualStr, sha256 } from "@/lib/crypto.server";
import { isPcRequest } from "@/lib/pc-auth.server";
import {
  createPhonePePayment,
  checkPhonePeOrderStatus,
  verifyPhonePeWebhook,
  isPhonePeEnabled,
} from "@/lib/phonepe.server";

async function verifyCashfree(raw: string, ts: string | null, sig: string | null, secret: string) {
  if (!secret || !ts || !sig) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts + raw));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    return timingSafeEqualStr(expected, sig);
  } catch (e) {
    console.error("[Cashfree Webhook] Verification error:", e);
    return false;
  }
}

export async function handleApiRoutes(request: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // =========================================================================
  // 0. Health Diagnostic Endpoint (§3.1)
  // =========================================================================
  if (request.method === "GET" && path === "/api/health") {
    const key = url.searchParams.get("key") ?? "";
    if (!process.env["HEALTH_KEY"] || key !== process.env["HEALTH_KEY"]) {
      return new Response("Not found", { status: 404 });
    }
    const envNames = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "ADMIN_PASSWORD",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
      "PC_SYNC_KEY_SHA256",
      "PHONEPE_CLIENT_ID",
      "PHONEPE_WEBHOOK_USERNAME",
    ];
    const env = Object.fromEntries(envNames.map((n) => [n, Boolean(process.env[n])]));
    let db: unknown = null;
    let dbError: string | null = null;
    try {
      const { data, error } = await (supabaseAdmin as any).rpc("schema_health");
      if (error) dbError = `${error.code ?? ""} ${error.message}`;
      else db = data;
    } catch (e: any) {
      dbError = e?.message ?? String(e);
    }
    const required = [
      "processing_status",
      "output_files",
      "attempts",
      "processing_error",
      "processed_at",
      "payment_intent_id",
      "payment_gateway_order_id",
      "source",
      "synced_to_pc_at",
      "pc_order_no",
      "hold_reason",
      "pad",
      "booth_ids",
      "booth_snapshots",
    ];
    const cols: string[] = (db as any)?.orders_columns ?? [];
    return new Response(
      JSON.stringify({
        env,
        dbReachable: !dbError,
        dbError,
        missingOrderColumns: required.filter((c) => !cols.includes(c)),
        counts: db && {
          districts: (db as any).districts,
          wards: (db as any).wards,
          orders_total: (db as any).orders_total,
          orders_last_24h: (db as any).orders_last_24h,
          orders_not_in_pc: (db as any).orders_not_in_pc,
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }

  // =========================================================================
  // 1. Cashfree Webhook (§6.1)
  // =========================================================================
  if (request.method === "POST" && path === "/api/cashfree/webhook") {
    try {
      const rawBody = await request.text();
      const ts = request.headers.get("x-webhook-timestamp");
      const sig = request.headers.get("x-webhook-signature");

      let secret = process.env["CASHFREE_SECRET_KEY"] || "";
      if (!secret) {
        const { data: creds } = await supabaseAdmin
          .from("payment_credentials")
          .select("cashfree_secret_key")
          .eq("singleton", true)
          .maybeSingle();
        secret = creds?.cashfree_secret_key || "";
      }

      const isValid = await verifyCashfree(rawBody, ts, sig, secret);
      if (!isValid) {
        console.warn("[Cashfree Webhook] Signature verification failed");
        return new Response("Unauthorized", { status: 401 });
      }

      const body = JSON.parse(rawBody);
      const orderId =
        body.data?.order?.order_id || body.data?.link_id || body.data?.link_notes?.order_id;
      const paymentStatus = body.data?.payment?.payment_status || body.type;

      // Record event in payment_events
      await supabaseAdmin.from("payment_events").insert({
        provider: "CASHFREE",
        event_type: body.type || body.event || null,
        order_id: orderId ? String(orderId) : null,
        payment_gateway_order_id: body.data?.order?.order_id || null,
        amount: body.data?.payment?.payment_amount || body.data?.order?.order_amount || null,
        payload: body,
        raw_body: rawBody,
        verified: true,
      });

      if (orderId && (paymentStatus === "SUCCESS" || body.type === "PAYMENT_SUCCESS_WEBHOOK")) {
        const { data: currentOrder } = await supabaseAdmin
          .from("orders")
          .select("id, amount")
          .eq("order_id", String(orderId))
          .maybeSingle();

        const webhookAmount = Number(
          body.data?.payment?.payment_amount || body.data?.order?.order_amount || 0
        );

        if (currentOrder && currentOrder.amount != null && webhookAmount > 0) {
          if (Math.abs(Number(currentOrder.amount) - webhookAmount) > 0.05) {
            console.error(
              `[Cashfree Webhook] Amount mismatch for order ${orderId}: expected ${currentOrder.amount}, received ${webhookAmount}`
            );
            return new Response("Amount mismatch", { status: 400 });
          }
        }

        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "PAID",
            payment_method: "CASHFREE",
            payment_intent_id: body.data?.payment?.cf_payment_id?.toString() || null,
            payment_updated_at: new Date().toISOString(),
          })
          .eq("order_id", String(orderId))
          .eq("payment_status", "PENDING");

        if (error) console.error("[Cashfree Webhook] DB Error:", error);
        else console.log(`[Cashfree Webhook] Order ${orderId} marked PAID`);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[Cashfree Webhook] Error:", err);
      return new Response("Bad Request", { status: 400 });
    }
  }

  // =========================================================================
  // 2. PhonePe Webhook (§8.3)
  // =========================================================================
  if (request.method === "POST" && path === "/api/phonepe/webhook") {
    try {
      const authHeader = request.headers.get("authorization");
      const isValid = await verifyPhonePeWebhook(authHeader);
      if (!isValid) {
        console.warn("[PhonePe Webhook] Header verification failed");
        return new Response("Unauthorized", { status: 401 });
      }

      const rawBody = await request.text();
      const body = JSON.parse(rawBody);
      const { event, payload } = body;
      const state = (payload?.state || "").toUpperCase();
      const merchantOrderId = payload?.merchantOrderId || "";
      const amountPaise = payload?.amount;

      let verifiedStatus = state;
      let verifiedOrderId = payload?.orderId || null;

      // Re-verify with PhonePe Order Status API if merchantOrderId is available
      if (merchantOrderId) {
        try {
          const statusRes = await checkPhonePeOrderStatus(merchantOrderId);
          verifiedStatus = statusRes.state.toUpperCase();
          if (statusRes.orderId) verifiedOrderId = statusRes.orderId;
        } catch (statusErr) {
          console.warn("[PhonePe Webhook] Order status API verification warning:", statusErr);
        }
      }

      // Record in payment_events
      await supabaseAdmin.from("payment_events").insert({
        provider: "PHONEPE",
        event_type: event || null,
        order_id: merchantOrderId || null,
        payment_gateway_order_id: verifiedOrderId,
        amount: amountPaise ? amountPaise / 100 : null,
        payload: body,
        raw_body: rawBody,
        verified: true,
      });

      if (verifiedStatus === "COMPLETED" && merchantOrderId) {
        // Match base order_id (e.g. SBG-XXXXXX from SBG-XXXXXX-time) or gateway id
        const baseOrderId = merchantOrderId.split("-").slice(0, 2).join("-");
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "PAID",
            payment_method: "PHONEPE",
            payment_gateway_order_id: verifiedOrderId,
            payment_updated_at: new Date().toISOString(),
          })
          .or(`order_id.eq.${baseOrderId},payment_gateway_order_id.eq.${merchantOrderId}`);

        if (error) console.error("[PhonePe Webhook] DB Error updating order:", error);
        else console.log(`[PhonePe Webhook] Order ${merchantOrderId} marked PAID`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      console.error("[PhonePe Webhook] Error:", err);
      return new Response("Bad Request", { status: 400 });
    }
  }

  // =========================================================================
  // 3. Worker Endpoints (token auth, 1-time upgrade, security)
  // =========================================================================
  if (request.method === "POST" && path.startsWith("/api/worker/")) {
    try {
      const body = await request.json();
      const { workerId, token } = body;

      if (!workerId || !token) {
        return new Response("Unauthorized", { status: 401 });
      }

      const { data: worker } = await supabaseAdmin
        .from("workers")
        .select("id, name, paused, jobs_done, token_hash")
        .eq("id", workerId)
        .eq("active", true)
        .maybeSingle();

      if (!worker || !worker.token_hash) return new Response("Unauthorized", { status: 401 });

      const incomingHashed = await sha256(token);
      let isMatch = timingSafeEqualStr(worker.token_hash, incomingHashed);

      // One-time plain-text token upgrade for legacy workers (e.g. A-1, PC-1)
      if (!isMatch && timingSafeEqualStr(worker.token_hash, token)) {
        await supabaseAdmin
          .from("workers")
          .update({ token_hash: incomingHashed, updated_at: new Date().toISOString() })
          .eq("id", workerId);
        isMatch = true;
      }

      if (!isMatch) return new Response("Unauthorized", { status: 401 });

      // Bump last_seen_at so PC shows ONLINE
      await supabaseAdmin
        .from("workers")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", workerId);

      // Heartbeat
      if (path === "/api/worker/heartbeat") {
        return new Response(JSON.stringify({ ok: true, paused: worker.paused }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Claim
      if (path === "/api/worker/claim") {
        if (worker.paused) {
          return new Response(JSON.stringify({ orderId: null, paused: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const { data: orderUuid, error } = await (supabaseAdmin as any).rpc("claim_next_order", {
          p_worker: workerId,
        });
        if (error) return new Response(error.message, { status: 400 });
        if (!orderUuid) {
          return new Response(JSON.stringify({ orderId: null, paused: false }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const { data: o } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", orderUuid)
          .single();

        if (!o) return new Response("Order not found", { status: 404 });

        let bannerSignedUrl: string | null = null;
        if (o.photo_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("candidate-photos")
            .createSignedUrl(o.photo_path, 3600);
          bannerSignedUrl = signed?.signedUrl ?? null;
        }

        let wardKey: string | null = null;
        let wardKeys: string[] = [];
        const wardIdsForLookup: string[] =
          Array.isArray(o.ward_ids) && o.ward_ids.length
            ? o.ward_ids
            : o.ward_id
              ? [o.ward_id]
              : [];
        if (wardIdsForLookup.length) {
          const { data: wardRows } = await supabaseAdmin
            .from("geo_wards")
            .select("id, app_key")
            .in("id", wardIdsForLookup);
          wardKeys = ((wardRows ?? []) as any[])
            .map((w) => w.app_key)
            .filter((k): k is string => Boolean(k));
          wardKey = wardKeys[0] ?? null;
        }

        const fullOrderData = {
          order_id: o.order_id,
          id: o.id,
          pad: o.pad,
          template: o.design_code,
          candidate_name_hindi: o.candidate_name_hindi,
          election_symbol: o.election_symbol,
          party_name_snapshot: o.party_name_snapshot,
          symbol_name_snapshot: o.symbol_name_snapshot,
          evm_serial: o.evm_serial,
          slogan: o.slogan,
          poll_date: o.poll_date,
          district: o.district,
          panchayat_samiti: o.panchayat_samiti,
          gram_panchayat: o.gram_panchayat,
          ward_number: o.ward_number,
          ward_ids: o.ward_ids,
          ward_snapshots: o.ward_snapshots,
          ward_key: wardKey,
          ward_keys: wardKeys,
          booth_ids: o.booth_ids,
          booth_snapshots: o.booth_snapshots,
          list_options: o.list_options || ["slip", "hindi_alpha", "english_alpha", "family"],
          voter_count: o.voter_count,
          banner_url: bannerSignedUrl,
        };

        return new Response(
          JSON.stringify({ orderId: o.order_id, orderData: fullOrderData }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // Upload URLs (§6.3 check assigned_worker_id)
      if (path === "/api/worker/upload-urls") {
        const { orderId, files } = body;
        const { data: orderCheck } = await supabaseAdmin
          .from("orders")
          .select("id, assigned_worker_id")
          .eq("order_id", orderId)
          .maybeSingle();

        if (!orderCheck || orderCheck.assigned_worker_id !== workerId) {
          return new Response("Forbidden: Order not assigned to this worker", { status: 403 });
        }

        const urls = await Promise.all(
          files.map(async (f: any) => ({
            name: f.name,
            key: `orders/${orderId}/${f.name}`,
            uploadUrl: await generateUploadUrl(
              `orders/${orderId}/${f.name}`,
              f.contentType || "application/pdf"
            ),
          }))
        );
        return new Response(JSON.stringify({ urls }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Complete (§6.3 check assigned_worker_id)
      if (path === "/api/worker/complete") {
        const { orderId, outputFiles } = body;
        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({
            processing_status: "ready",
            processed_at: new Date().toISOString(),
            output_files: outputFiles,
            status: "Ready",
          })
          .eq("order_id", orderId)
          .eq("assigned_worker_id", workerId);

        if (updateErr) {
          return new Response(updateErr.message, { status: 400 });
        }

        // Increment jobs_done
        await (supabaseAdmin as any).rpc("increment_jobs_done", { p_worker: workerId });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Fail / Retry Endpoint
      if (path === "/api/worker/fail") {
        const { orderId, error: errorMessage } = body;
        const { data: currentOrder } = await supabaseAdmin
          .from("orders")
          .select("id, attempts")
          .eq("order_id", orderId)
          .maybeSingle();

        const retry = Number(currentOrder?.attempts ?? 0) < 3;
        await supabaseAdmin
          .from("orders")
          .update({
            processing_status: retry ? "queued" : "failed",
            assigned_worker_id: retry ? null : workerId,
            processing_error: String(errorMessage || "Generation failed").slice(0, 500),
          })
          .eq("order_id", orderId);

        await supabaseAdmin
          .from("workers")
          .update({ current_order_id: null })
          .eq("id", workerId);

        return new Response(JSON.stringify({ success: true, requeued: retry }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    } catch (err: any) {
      console.error("[Worker API Error]:", err);
      return new Response(err.message || "Internal Error", { status: 500 });
    }
  }

  // =========================================================================
  // 4. PC Bridge Sync Endpoints (Phase 4, §7.2 - B9)
  // =========================================================================
  if (path.startsWith("/api/pc/")) {
    if (!(await isPcRequest(request))) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 4.1 GET /api/pc/orders
    if (request.method === "GET" && path === "/api/pc/orders") {
      try {
        const since = url.searchParams.get("since") || "2026-09-20T00:00:00+05:30";
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

        const { data: unsyncedOrders, error } = await supabaseAdmin
          .from("orders")
          .select(
            "id, order_id, candidate_name_hindi, contact_number, district, panchayat_samiti, gram_panchayat, ward_number, ward_id, ward_ids, ward_snapshots, booth_ids, booth_snapshots, pad, design_code, election_symbol, party_name_snapshot, symbol_name_snapshot, slogan, body_name, evm_serial, poll_date, list_options, photo_path, voter_photo_pdf_path, voter_count, rate_per_voter, amount, status, hold_reason, payment_status, payment_method, referral_code, created_at, source"
          )
          .is("synced_to_pc_at", null)
          .in("source", ["web_fallback", "rep_portal"])
          .eq("is_sample", false)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(limit);

        if (error) throw new Error(error.message);

        // Generate 1-hour signed URLs for photo_path and voter_photo_pdf_path
        const ordersWithUrls = await Promise.all(
          (unsyncedOrders ?? []).map(async (o) => {
            let photoUrl: string | null = null;
            let voterPhotoPdfUrl: string | null = null;

            if (o.photo_path) {
              const { data: signed } = await supabaseAdmin.storage
                .from("candidate-photos")
                .createSignedUrl(o.photo_path, 3600);
              photoUrl = signed?.signedUrl ?? null;
            }
            if (o.voter_photo_pdf_path) {
              const { data: signed } = await supabaseAdmin.storage
                .from("voter-raw-lists")
                .createSignedUrl(o.voter_photo_pdf_path, 3600);
              voterPhotoPdfUrl = signed?.signedUrl ?? null;
            }

            return {
              ...o,
              photo_url: photoUrl,
              voter_photo_pdf_url: voterPhotoPdfUrl,
            };
          })
        );

        // Also check R2 fallback-orders/
        let r2Orders: any[] = [];
        try {
          const keys = await listObjects("fallback-orders/");
          for (const key of keys.slice(0, 50)) {
            const raw = await getObject(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                r2Orders.push({ ...parsed, r2_key: key });
              } catch (_) {}
            }
          }
        } catch (r2Err) {
          console.warn("[PC Bridge] R2 list fallback orders warning:", r2Err);
        }

        return new Response(
          JSON.stringify({ orders: ordersWithUrls, r2_orders: r2Orders }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        console.error("[PC Bridge] GET /api/pc/orders error:", err);
        return new Response(err.message || "Internal error", { status: 500 });
      }
    }

    // 4.2 POST /api/pc/orders/ack
    if (request.method === "POST" && path === "/api/pc/orders/ack") {
      try {
        const body = await request.json();
        const items = (body.items || []) as { order_id: string; pc_order_no: string; r2_key?: string }[];
        const now = new Date().toISOString();

        for (const item of items) {
          if (item.order_id) {
            await supabaseAdmin
              .from("orders")
              .update({
                synced_to_pc_at: now,
                pc_order_no: item.pc_order_no,
              })
              .eq("order_id", item.order_id);
          }

          // If R2 fallback item, move from fallback-orders/ to fallback-orders-done/
          if (item.r2_key && item.r2_key.startsWith("fallback-orders/")) {
            const destKey = item.r2_key.replace("fallback-orders/", "fallback-orders-done/");
            try {
              await copyObject(item.r2_key, destKey);
              await deleteObject(item.r2_key);
            } catch (moveErr) {
              console.warn(`[PC Bridge] Could not move R2 file ${item.r2_key}:`, moveErr);
            }
          }
        }

        return new Response(JSON.stringify({ ok: true, acked: items.length }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err: any) {
        console.error("[PC Bridge] POST /api/pc/orders/ack error:", err);
        return new Response(err.message || "Internal error", { status: 500 });
      }
    }

    // 4.3 GET /api/pc/payments
    if (request.method === "GET" && path === "/api/pc/payments") {
      try {
        const { data, error } = await supabaseAdmin
          .from("payment_events")
          .select("*")
          .eq("verified", true)
          .is("consumed_by_pc_at", null)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ payments: data ?? [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err: any) {
        console.error("[PC Bridge] GET /api/pc/payments error:", err);
        return new Response(err.message || "Internal error", { status: 500 });
      }
    }

    // 4.4 POST /api/pc/payments/ack
    if (request.method === "POST" && path === "/api/pc/payments/ack") {
      try {
        const body = await request.json();
        const ids = (body.ids || []) as string[];
        if (ids.length > 0) {
          const { error } = await supabaseAdmin
            .from("payment_events")
            .update({ consumed_by_pc_at: new Date().toISOString() })
            .in("id", ids);

          if (error) throw new Error(error.message);
        }

        return new Response(JSON.stringify({ ok: true, acked: ids.length }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err: any) {
        console.error("[PC Bridge] POST /api/pc/payments/ack error:", err);
        return new Response(err.message || "Internal error", { status: 500 });
      }
    }

    // 4.5 POST /api/pc/pay-link
    if (request.method === "POST" && path === "/api/pc/pay-link") {
      try {
        const body = await request.json();
        const { pc_order_no, amount_paise, customer_phone } = body;

        if (!pc_order_no || !amount_paise) {
          return new Response("Missing pc_order_no or amount_paise", { status: 400 });
        }

        if (!isPhonePeEnabled()) {
          return new Response(
            JSON.stringify({ error: "Payment gateway is currently disabled" }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        const merchantOrderId = `${pc_order_no}-${Date.now().toString(36)}`;
        const baseUrl = process.env["VITE_APP_URL"] || "https://saubhagya.net";
        const redirectUrl = `${baseUrl}/order/${encodeURIComponent(pc_order_no)}?paid=1`;

        const payment = await createPhonePePayment({
          merchantOrderId,
          amountPaise: Number(amount_paise),
          redirectUrl,
        });

        return new Response(
          JSON.stringify({
            redirectUrl: payment.redirectUrl,
            orderId: payment.orderId,
            merchantOrderId,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      } catch (err: any) {
        console.error("[PC Bridge] POST /api/pc/pay-link error:", err);
        return new Response(err.message || "Payment initiation failed", { status: 500 });
      }
    }
  }

  // =========================================================================
  // 5. AiSensy Webhook placeholder (Phase 6, §9)
  // =========================================================================
  if (request.method === "POST" && path === "/api/aisensy/webhook") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
