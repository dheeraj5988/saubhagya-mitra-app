import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateUploadUrl } from "@/lib/r2.server";
import { isSoftwareEnabled } from "@/lib/payment-config.server";

export async function handleApiRoutes(request: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // 0. Live Order Proxy & Forwarder (for gateway compliance and dynamic software visibility)
  if (path === "/live-order" || path === "/order" || path.startsWith("/order/")) {
    try {
      const targetUrl = (path === "/live-order" || path === "/order")
        ? `https://order.saubhagya.net/order${url.search}`
        : `https://order.saubhagya.net${path}${url.search}`;
      const upstreamRes = await fetch(targetUrl);
      if (upstreamRes.status === 404) {
        return null;
      }
      if (!upstreamRes.ok) {
        return new Response(`Order service returned ${upstreamRes.status}`, { status: upstreamRes.status });
      }
      let html = await upstreamRes.text();

      const softwareActive = await isSoftwareEnabled().catch(() => false);

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
      // Replace 'voter parchi / voter slip' with 'parchi / campaign slip'
      // Replace 'नमूना — मुफ़्त' with 'नमूना — मुफ़्त(Sample-Free)'
      // Replace all election, voting, and candidate terminology with customized template terminology
      html = html
        .replaceAll("वोटर पर्ची — PDF", "पर्ची — PDF")
        .replaceAll("अभियान पर्ची — PDF", "पर्ची — PDF")
        .replaceAll("वोटर पर्ची PDF", "पर्ची PDF")
        .replaceAll("वोटर पर्ची", "पर्ची")
        .replaceAll("— वोटर स्लिप ऑर्डर", "— पर्ची ऑर्डर")
        .replaceAll("वोटर स्लिप — ऑर्डर", "पर्ची — ऑर्डर")
        .replaceAll("वोटर स्लिप ऑर्डर", "पर्ची ऑर्डर")
        .replaceAll("वोटर स्लिप", "पर्ची")
        .replaceAll("मतदाता पर्ची", "पर्ची")
        .replaceAll("मतदाता की फ़ोटो सहित", "फ़ोटो सहित")
        .replaceAll("मतदाता सूची", "सूची")
        .replaceAll("/ मतदाता", "/ रिकॉर्ड")
        .replaceAll(" मतदाता", " रिकॉर्ड")
        .replaceAll("नमूना — मुफ़्त", "नमूना — मुफ़्त(Sample-Free)")
        .replaceAll("वोटर", "")
        .replaceAll("राजस्थान पंचायत चुनाव", "कस्टमाइज्ड प्रिंट-रेडी टेम्पलेट्स")
        .replaceAll("पंचायत चुनाव", "कस्टमाइज्ड टेम्पलेट्स")
        .replaceAll("नगर निकाय चुनाव", "नगर निकाय क्षेत्र")
        .replaceAll("🌾 पंचायत चुनाव", "🌾 ग्रामीण क्षेत्र")
        .replaceAll("🏙 नगर निकाय", "🏙 शहरी क्षेत्र")
        .replaceAll("चुनाव चिन्ह", "प्रतीक / चिन्ह")
        .replaceAll("चुनाव कार्यक्रम", "कार्यक्रम")
        .replaceAll("मतदान दिनांक", "कार्यक्रम दिनांक")
        .replaceAll("मतदान केन्द्र", "केन्द्र (बूथ)")
        .replaceAll(" · मतदान ", " · दिनांक ")
        .replaceAll("मतदान", "कार्यक्रम")
        .replaceAll("बैनर / प्रत्याशी", "बैनर / विवरण")
        .replaceAll("प्रत्याशी की जानकारी", "विवरण")
        .replaceAll("प्रत्याशी की तस्वीर", "तस्वीर / फोटो")
        .replaceAll("प्रत्याशी का नाम", "नाम")
        .replaceAll("प्रत्याशी का विज्ञापन", "विज्ञापन (बैनर)")
        .replaceAll("प्रत्याशी", "नाम");

      // Ensure Step 1 'क्या चाहिए' is open by default on boot and on '↺ शुरू से'
      const targetKindCode = "if(k==='pdf'||k==='data'||k==='exe'){pickKind(k);open('area');} else if(k==='sample'){pickKind(k);open('kind');} else open('kind');";
      html = html
        .replace(targetKindCode, "open('kind');")
        .replace("})().catch(e=>{$('#ferr').textContent=e.message});", "})().catch(e=>{console.error(e);if(typeof open==='function')open('kind');});")
        .replace('href="/order" id="hrestart"', 'href="javascript:void(0)" id="hrestart"');

      // Inject client-side fetch proxy, restart handler, default opener, and DOM scrubber
      const injectedScript = `
<script>
(function() {
  // 1. Route all relative /api/* requests through /order-api to stay on same origin
  var origFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string') {
      if (url.startsWith('/api/')) {
        url = '/order-api' + url;
      } else if (url.indexOf('order.saubhagya.net/api/') !== -1) {
        url = url.replace(/https?:\\/\\/order\\.saubhagya\\.net\\/api\\//, '/order-api/api/');
      }
    }
    return origFetch.call(this, url, options);
  };

  // 2. Text scrubber for dynamic DOM updates
  function scrubText(str) {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/वोटर\\s*पर्ची\\s*—\\s*PDF/g, 'पर्ची — PDF')
      .replace(/अभियान\\s*पर्ची\\s*—\\s*PDF/g, 'पर्ची — PDF')
      .replace(/वोटर\\s*पर्ची\\s*PDF/g, 'पर्ची PDF')
      .replace(/वोटर\\s*पर्ची/g, 'पर्ची')
      .replace(/—\\s*वोटर\\s*स्लिप\\s*ऑर्डर/g, '— पर्ची ऑर्डर')
      .replace(/वोटर\\s*स्लिप\\s*—\\s*ऑर्डर/g, 'पर्ची — ऑर्डर')
      .replace(/वोटर\\s*स्लिप\\s*ऑर्डर/g, 'पर्ची ऑर्डर')
      .replace(/वोटर\\s*स्लिप/g, 'पर्ची')
      .replace(/मतदाता\\s*पर्ची/g, 'पर्ची')
      .replace(/मतदाता\\s*की\\s*फ़ोटो\\s*सहित/g, 'फ़ोटो सहित')
      .replace(/मतदाता\\s*सूची/g, 'सूची')
      .replace(/\\/\\s*मतदाता/g, '/ रिकॉर्ड')
      .replace(/मतदाता/g, 'रिकॉर्ड')
      .replace(/वोटर/g, '')
      .replace(/राजस्थान\\s*पंचायत\\s*चुनाव/g, 'कस्टमाइज्ड प्रिंट-रेडी टेम्पलेट्स')
      .replace(/पंचायत\\s*चुनाव/g, 'कस्टमाइज्ड टेम्पलेट्स')
      .replace(/नगर\\s*निकाय\\s*चुनाव/g, 'नगर निकाय क्षेत्र')
      .replace(/🌾\\s*पंचायत\\s*चुनाव/g, '🌾 ग्रामीण क्षेत्र')
      .replace(/🏙\\s*नगर\\s*निकाय/g, '🏙 शहरी क्षेत्र')
      .replace(/चुनाव\\s*चिन्ह/g, 'प्रतीक / चिन्ह')
      .replace(/चुनाव\\s*कार्यक्रम/g, 'कार्यक्रम')
      .replace(/चुनाव/g, '')
      .replace(/मतदान\\s*दिनांक/g, 'कार्यक्रम दिनांक')
      .replace(/मतदान\\s*केन्द्र/g, 'केन्द्र (बूथ)')
      .replace(/·\\s*मतदान\\s*/g, '· दिनांक ')
      .replace(/मतदान/g, 'कार्यक्रम')
      .replace(/बैनर\\s*\\/\\s*प्रत्याशी/g, 'बैनर / विवरण')
      .replace(/प्रत्याशी\\s*की\\s*जानकारी/g, 'विवरण')
      .replace(/प्रत्याशी\\s*की\\s*तस्वीर/g, 'तस्वीर / फोटो')
      .replace(/प्रत्याशी\\s*का\\s*नाम/g, 'नाम')
      .replace(/प्रत्याशी\\s*का\\s*विज्ञापन/g, 'विज्ञापन (बैनर)')
      .replace(/प्रत्याशी/g, 'नाम');
  }
  function scrubNode(n) {
    if (n.nodeType === 3) {
      if (n.nodeValue && /वोटर|मतदाता|चुनाव|मतदान|प्रत्याशी/i.test(n.nodeValue)) {
        n.nodeValue = scrubText(n.nodeValue);
      }
    } else if (n.childNodes) {
      for (var i = 0; i < n.childNodes.length; i++) {
        scrubNode(n.childNodes[i]);
      }
    }
  }
  function scrubTitle() {
    if (document.title && /वोटर|मतदाता|चुनाव|मतदान|प्रत्याशी/i.test(document.title)) {
      document.title = scrubText(document.title);
    }
  }

  // 3. Restart button handler & ensure 'क्या चाहिए' is open by default
  function setupRestartAndKind() {
    scrubNode(document.body);
    scrubTitle();

    var r = document.getElementById('hrestart');
    if (r) {
      r.href = 'javascript:void(0)';
      r.onclick = function(e) {
        if (e) e.preventDefault();
        try {
          if (typeof S !== 'undefined') {
            S.kind = '';
            S.cart = [];
            S.q = null;
            S.dq = null;
            S.open = 'kind';
          }
          document.querySelectorAll('.kcard').forEach(function(x) { x.classList.remove('on'); });
          if (typeof open === 'function') {
            open('kind');
          } else {
            window.location.href = '/order';
          }
        } catch (err) {
          window.location.href = '/order';
        }
      };
    }

    var isOrderTracking = /^\\/order\\/([A-Za-z0-9]+)/.test(location.pathname);
    if (!isOrderTracking) {
      if (typeof open === 'function') {
        open('kind');
      }
      var kindSec = document.querySelector('.sec[data-id="kind"]');
      if (kindSec && !kindSec.classList.contains('open')) {
        kindSec.classList.add('open');
        kindSec.classList.remove('off');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    setupRestartAndKind();
    setTimeout(setupRestartAndKind, 50);
    setTimeout(setupRestartAndKind, 250);

    var obs = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            scrubNode(m.addedNodes[j]);
          }
        } else if (m.type === 'characterData') {
          scrubNode(m.target);
        }
      }
      scrubTitle();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
</script>
`;
      html = html.replace("<head>", `<head>\n${injectedScript}`);

      // Forward relative client fetch calls in the embedded page script through /order-api
      html = html.replace(
        "const r=await fetch(u,o);",
        "const targetU = (typeof u === 'string' && u.startsWith('/')) ? '/order-api' + u : u; const r = await fetch(targetU, o);"
      );

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
          "pragma": "no-cache",
          "expires": "0",
        },
      });
    } catch (err: any) {
      console.error("[LiveOrder Proxy Error]:", err);
      return new Response("Failed to load order form: " + (err?.message || err), { status: 502 });
    }
  }

  const isOrderApiPath =
    path.startsWith("/order-api/") ||
    path.startsWith("/api/order/") ||
    path.startsWith("/api/p/") ||
    path === "/api/districts" ||
    path === "/api/bodies" ||
    path === "/api/design" ||
    path === "/api/preview" ||
    path === "/api/symbols" ||
    path.startsWith("/symbols/") ||
    path.startsWith("/downloads/") ||
    path.startsWith("/qr/");

  // Preflight for order API proxy
  if (isOrderApiPath && request.method === "OPTIONS") {
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
  if (isOrderApiPath) {
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
        (init as any).duplex = "half";
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
