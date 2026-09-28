import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateUploadUrl } from "@/lib/r2.server";
import { isSoftwareEnabled } from "@/lib/payment-config.server";

export async function handleApiRoutes(request: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // 0. Live Order Proxy & Forwarder (for gateway compliance and dynamic software visibility)
  if (path === "/live-order") {
    try {
      const targetUrl = `https://order.saubhagya.net/order${url.search}`;
      const upstreamRes = await fetch(targetUrl);
      if (!upstreamRes.ok) {
        return new Response(`Order service returned ${upstreamRes.status}`, { status: upstreamRes.status });
      }
      let html = await upstreamRes.text();

      const softwareActive = await isSoftwareEnabled().catch(() => false);

      // Inject base href so images, symbols and stylesheets load cleanly
      html = html.replace("<head>", '<head>\n<base href="https://order.saubhagya.net/">');

      // Hide software option cards if software section is deactivated
      if (!softwareActive) {
        const hideCss = `
<style>
.kcard[data-kind="exe"], .kcard[data-kind="data"], #dlbox { display: none !important; }
.cards.k4 { grid-template-columns: 1fr 1fr !important; }
</style>
`;
        html = html.replace("</head>", `${hideCss}</head>`);
      }

      // Wordings for PhonePe compliance:
      // Replace 'voter parchi / voter slip' with 'campaign slip / अभियान पर्ची'
      // Replace 'नमूना — मुफ़्त' with 'नमूना — मुफ़्त(Sample-Free)'
      html = html
        .replaceAll("वोटर पर्ची — PDF", "अभियान पर्ची — PDF")
        .replaceAll("वोटर पर्ची", "अभियान पर्ची")
        .replaceAll("वोटर स्लिप", "अभियान पर्ची")
        .replaceAll("मतदाता पर्ची", "अभियान पर्ची")
        .replaceAll("नमूना — मुफ़्त", "नमूना — मुफ़्त(Sample-Free)");

      // Forward relative client fetch calls in the embedded page script through /order-api
      html = html.replace(
        "const r=await fetch(u,o);",
        "const targetU = (typeof u === 'string' && u.startsWith('/')) ? '/order-api' + u : u; const r = await fetch(targetU, o);"
      );

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    } catch (err: any) {
      console.error("[LiveOrder Proxy Error]:", err);
      return new Response("Failed to load order form: " + (err?.message || err), { status: 502 });
    }
  }

  // Preflight for order API proxy
  if (path.startsWith("/order-api/") && request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS, PUT, DELETE",
        "access-control-allow-headers": "*",
      },
    });
  }

  // Order API proxy to order.saubhagya.net
  if (path.startsWith("/order-api/")) {
    try {
      const upstreamPath = path.replace(/^\/order-api/, "");
      const targetUrl = new URL(upstreamPath + url.search, "https://order.saubhagya.net");

      const reqHeaders = new Headers(request.headers);
      reqHeaders.delete("host");
      reqHeaders.delete("referer");

      const init: RequestInit = {
        method: request.method,
        headers: reqHeaders,
      };
      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.blob();
      }

      const upstreamRes = await fetch(targetUrl.toString(), init);

      const resHeaders = new Headers(upstreamRes.headers);
      resHeaders.set("access-control-allow-origin", "*");
      resHeaders.set("access-control-allow-methods", "GET, POST, OPTIONS, PUT, DELETE");
      resHeaders.set("access-control-allow-headers", "*");

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders,
      });
    } catch (err: any) {
      console.error("[OrderApi Proxy Error]:", err);
      return new Response(JSON.stringify({ error: err?.message || "Order API Proxy Error" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
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
