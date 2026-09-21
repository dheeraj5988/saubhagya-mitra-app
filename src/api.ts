import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateUploadUrl } from "@/lib/r2.server";

export async function handleApiRoutes(request: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;
  
  if (request.method === "POST" && path === "/api/cashfree/webhook") {
    try {
      const body = await request.json();
      if (body.type === 'PAYMENT_SUCCESS_WEBHOOK' && body.data?.order?.order_id) {
        const orderId = body.data.order.order_id;
        const { error } = await supabaseAdmin
          .from('orders')
          .update({
            payment_status: 'PAID',
            payment_intent_id: body.data.payment?.cf_payment_id?.toString() || null,
          })
          .eq('id', orderId as any)
          .eq('payment_status', 'UNPAID');
        if (error) console.error("Error updating order:", error);
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error(err);
      return new Response("Bad Request", { status: 400 });
    }
  }

  if (request.method === "POST" && path.startsWith("/api/worker/")) {
    try {
      const body = await request.json();
      const { workerId, token } = body;
      
      const { data: worker } = await supabaseAdmin.from('workers').select('id').eq('id', workerId).eq('token_hash', token).single();
      if (!worker) return new Response("Unauthorized", { status: 401 });

      if (path === "/api/worker/heartbeat") {
        await supabaseAdmin.from('workers').update({ last_seen_at: new Date().toISOString() }).eq('id', workerId);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      if (path === "/api/worker/claim") {
        const { data: orderId, error } = await (supabaseAdmin.rpc as any)('claim_next_order', { p_worker: workerId });
        if (error) return new Response(error.message, { status: 400 });
        if (!orderId) return new Response(JSON.stringify({ orderId: null }), { status: 200 });
        const { data: orderData } = await supabaseAdmin.from('orders').select('*').eq('id', orderId as any).single();
        return new Response(JSON.stringify({ orderId, orderData }), { status: 200 });
      }

      if (path === "/api/worker/upload-urls") {
        const { orderId, files } = body;
        const urls = await Promise.all(files.map(async (f: any) => ({
          name: f.name,
          key: `orders/${orderId}/${f.name}`,
          uploadUrl: await generateUploadUrl(`orders/${orderId}/${f.name}`, f.contentType)
        })));
        return new Response(JSON.stringify({ urls }), { status: 200 });
      }

      if (path === "/api/worker/complete") {
        const { orderId, outputFiles } = body;
        await supabaseAdmin.from('orders').update({ processing_status: 'ready', output_files: outputFiles }).eq('id', orderId as any).eq('assigned_worker_id', workerId);
        await supabaseAdmin.from('workers').update({ current_order_id: null }).eq('id', workerId);
        // await supabaseAdmin.rpc('increment_jobs_done', { p_worker: workerId });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
    } catch (err: any) {
      console.error(err);
      return new Response(err.message, { status: 500 });
    }
  }

  return null;
}
