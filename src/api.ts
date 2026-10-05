import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateUploadUrl } from "@/lib/r2.server";
import { isSoftwareEnabled } from "@/lib/payment-config.server";

export async function handleApiRoutes(request: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // 0. Site flags (read-only) -- lets the Cloudflare Worker in front of
  // order.saubhagya.net hide/show the software cards from the SAME admin
  // toggle (admin -> Payment Settings -> "Software Section") that /software
  // already uses. Returns only this one boolean; never any other config.
  if (request.method === "GET" && path === "/api/site-flags") {
    let software_enabled = false;
    try {
      software_enabled = await isSoftwareEnabled();
    } catch {
      software_enabled = false;
    }
    return new Response(JSON.stringify({ software_enabled }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=30, s-maxage=60",
      },
    });
  }

  // 0b. PhonePe webhook. PhonePe calls this when a payment finishes. The body
  // is only a hint: the real status is fetched from PhonePe before anything
  // is marked paid, so a forged call cannot mark an order PAID.
  if (request.method === "POST" && path === "/api/phonepe/webhook") {
    try {
      const { checkWebhookAuth, isPhonePeEnabled, settlePhonePePayment } = await import(
        "@/lib/phonepe.server"
      );
      if (!isPhonePeEnabled()) return new Response("Not found", { status: 404 });
      const auth = await checkWebhookAuth(request.headers.get("authorization"));
      if (auth === "bad") return new Response("Unauthorized", { status: 401 });

      const body = JSON.parse(await request.text());
      const merchantOrderId = String(
        body?.payload?.merchantOrderId ?? body?.payload?.originalMerchantOrderId ?? "",
      );
      if (!/^[A-Za-z0-9_-]{1,63}$/.test(merchantOrderId)) {
        return new Response("Bad Request", { status: 400 });
      }
      await settlePhonePePayment(merchantOrderId);
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[PhonePe Webhook] Error:", err);
      // 500 makes PhonePe retry later.
      return new Response("Error", { status: 500 });
    }
  }

  // 0c. PhonePe for orders made on the PC order page (VS####). The PC app
  // calls these with its private key (header X-PC-Key; only the key's sha256
  // is stored on Vercel as PC_SYNC_KEY_SHA256).
  if (path === "/api/pc/pay-link" || path === "/api/pc/pay-status") {
    try {
      const phonepe = await import("@/lib/phonepe.server");
      const expected = (process.env["PC_SYNC_KEY_SHA256"] ?? "").trim().toLowerCase();
      const given = request.headers.get("x-pc-key") ?? "";
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(given));
      const givenHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (!given || expected.length !== 64 || !phonepe.timingSafeEqualStr(givenHash, expected)) {
        return new Response("Unauthorized", { status: 401 });
      }
      if (!phonepe.isPhonePeEnabled()) {
        return Response.json({ error: "PhonePe is switched off" }, { status: 503 });
      }

      if (request.method === "POST" && path === "/api/pc/pay-link") {
        const body = await request.json();
        const orderNo = String(body?.order_no ?? "");
        const amountPaise = Number(body?.amount_paise);
        if (!/^[A-Za-z0-9_-]{2,30}$/.test(orderNo) || !Number.isInteger(amountPaise) || amountPaise < 100) {
          return Response.json({ error: "order_no and amount_paise (integer, paise) are required" }, { status: 400 });
        }
        // After paying, the customer returns to the PC order page for that order.
        let redirectUrl = `https://order.saubhagya.net/order/${orderNo}`;
        if (typeof body?.redirect_url === "string") {
          try {
            const u = new URL(body.redirect_url);
            if (u.protocol === "https:" && (u.hostname === "saubhagya.net" || u.hostname.endsWith(".saubhagya.net"))) {
              redirectUrl = u.toString();
            }
          } catch {
            // keep the default
          }
        }
        const merchantOrderId = phonepe.makeMerchantOrderId(orderNo);
        const payment = await phonepe.createPhonePePayment({
          merchantOrderId,
          amountPaise,
          redirectUrl,
          message: `Order ${orderNo}`,
        });
        return Response.json({ merchant_order_id: merchantOrderId, pay_url: payment.redirectUrl, expires_in_seconds: 1800 });
      }

      if (request.method === "GET" && path === "/api/pc/pay-status") {
        const merchantOrderId = url.searchParams.get("merchant_order_id") ?? "";
        if (!/^[A-Za-z0-9_-]{1,63}$/.test(merchantOrderId)) {
          return Response.json({ error: "merchant_order_id is required" }, { status: 400 });
        }
        const result = await phonepe.settlePhonePePayment(merchantOrderId);
        return Response.json({
          merchant_order_id: merchantOrderId,
          order_no: result.orderRef,
          state: result.state,
          amount_paise: result.amountPaise,
          phonepe_order_id: result.phonePeOrderId,
        });
      }
      return new Response("Method not allowed", { status: 405 });
    } catch (err: any) {
      console.error("[PC PhonePe] Error:", err);
      return Response.json({ error: err?.message || "PhonePe error" }, { status: 502 });
    }
  }

  // 1. Cashfree Webhook
  if (request.method === "POST" && path === "/api/cashfree/webhook") {
    try {
      const rawBody = await request.text();
      const body = JSON.parse(rawBody);

      // Support payment-link & order-pay events
      const orderId = body.data?.order?.order_id || body.data?.link_id || body.data?.link_notes?.order_id;
      const paymentStatus = body.data?.payment?.payment_status || body.type;

      if (orderId && (paymentStatus === "SUCCESS" || body.type === "PAYMENT_SUCCESS_WEBHOOK")) {
        // App vocabulary uses 'PENDING', not 'UNPAID'
        const { error } = await (supabaseAdmin as any)
          .from("orders")
          .update({
            payment_status: "PAID",
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

  // 2. Worker Endpoints
  if (request.method === "POST" && path.startsWith("/api/worker/")) {
    try {
      const body = await request.json();
      const { workerId, token } = body;
      
      const { data: worker } = await (supabaseAdmin as any)
        .from("workers")
        .select("id, paused, jobs_done")
        .eq("id", workerId)
        .eq("token_hash", token)
        .eq("active", true)
        .maybeSingle();

      if (!worker) return new Response("Unauthorized", { status: 401 });

      // Always bump last_seen_at so PC shows ONLINE
      await (supabaseAdmin as any)
        .from("workers")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", workerId);

      // Heartbeat
      if (path === "/api/worker/heartbeat") {
        return new Response(JSON.stringify({ ok: true, paused: worker.paused }), { status: 200 });
      }

      // Claim
      if (path === "/api/worker/claim") {
        if (worker.paused) return new Response(JSON.stringify({ orderId: null, paused: true }), { status: 200 });

        const { data: orderUuid, error } = await (supabaseAdmin as any).rpc("claim_next_order", { p_worker: workerId });
        if (error) return new Response(error.message, { status: 400 });
        if (!orderUuid) return new Response(JSON.stringify({ orderId: null, paused: false }), { status: 200 });

        const { data: o } = await (supabaseAdmin as any)
          .from("orders")
          .select("*")
          .eq("id", orderUuid)
          .single();

        // Generate short-lived signed URL for candidate photo/banner if uploaded
        let bannerSignedUrl: string | null = null;
        if (o.photo_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("candidate-photos")
            .createSignedUrl(o.photo_path, 3600);
          bannerSignedUrl = signed?.signedUrl ?? null;
        }

        // app_key is looked up fresh from geo_wards at claim time (never
        // stored on the order), so mapping a ward AFTER an order was placed
        // still resolves correctly for any order still sitting in the queue.
        let wardKey: string | null = null;
        let wardKeys: string[] = [];
        const wardIdsForLookup: string[] = Array.isArray(o.ward_ids) && o.ward_ids.length
          ? o.ward_ids
          : o.ward_id
            ? [o.ward_id]
            : [];
        if (wardIdsForLookup.length) {
          const { data: wardRows } = await (supabaseAdmin as any)
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

        return new Response(JSON.stringify({ orderId: o.order_id, orderData: fullOrderData }), { status: 200 });
      }

      // Upload URLs
      if (path === "/api/worker/upload-urls") {
        const { orderId, files } = body;
        const urls = await Promise.all(
          files.map(async (f: any) => ({
            name: f.name,
            key: `orders/${orderId}/${f.name}`,
            uploadUrl: await generateUploadUrl(`orders/${orderId}/${f.name}`, f.contentType || "application/pdf")
          }))
        );
        return new Response(JSON.stringify({ urls }), { status: 200 });
      }

      // Complete
      if (path === "/api/worker/complete") {
        const { orderId, outputFiles } = body;
        await (supabaseAdmin as any)
          .from("orders")
          .update({
            processing_status: "ready",
            processed_at: new Date().toISOString(),
            output_files: outputFiles,
            status: "Ready"
          })
          .eq("order_id", orderId)
          .eq("assigned_worker_id", workerId);

        // Increment jobs_done
        await (supabaseAdmin as any).rpc("increment_jobs_done", { p_worker: workerId });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // Fail / Retry Endpoint
      if (path === "/api/worker/fail") {
        const { orderId, error: errorMessage } = body;
        const { data: currentOrder } = await (supabaseAdmin as any)
          .from("orders")
          .select("id, attempts")
          .eq("order_id", orderId)
          .maybeSingle();

        const retry = Number(currentOrder?.attempts ?? 0) < 3;
        await (supabaseAdmin as any)
          .from("orders")
          .update({
            processing_status: retry ? "queued" : "failed",
            assigned_worker_id: retry ? null : workerId,
            processing_error: String(errorMessage || "Generation failed").slice(0, 500)
          })
          .eq("order_id", orderId);

        await (supabaseAdmin as any)
          .from("workers")
          .update({ current_order_id: null })
          .eq("id", workerId);

        return new Response(JSON.stringify({ success: true, requeued: retry }), { status: 200 });
      }
    } catch (err: any) {
      console.error("[Worker API Error]:", err);
      return new Response(err.message || "Internal Error", { status: 500 });
    }
  }

  return null;
}
