import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { useState } from 'react';
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Lock, Loader2 } from 'lucide-react';

/** Loader: fetch order status but NOT download links (those require phone verification) */
const getOrderData = createServerFn({ method: "GET" })
  .validator((d: { orderId: string; paid?: string | undefined }) => d)
  .handler(async ({ data: { orderId, paid } }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    let { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, payment_status, processing_status, candidate_name_hindi, payment_gateway_order_id, amount')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!order && !error) {
      // Fallback: try matching on `id` (UUID) for old links
      const { data: orderById } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, payment_status, processing_status, candidate_name_hindi, payment_gateway_order_id, amount')
        .eq('id', orderId)
        .maybeSingle();
      if (!orderById) throw new Error("Order not found");
      order = orderById;
    }
    if (error || !order) throw new Error("Order not found");

    // If paid=1 is passed from a redirect, verify with PhonePe if order is still PENDING
    if (paid === "1" && order.payment_status === "PENDING" && order.payment_gateway_order_id) {
      try {
        const { checkPhonePeOrderStatus } = await import("@/lib/phonepe.server");
        const statusRes = await checkPhonePeOrderStatus(order.payment_gateway_order_id);
        if (statusRes.state === "COMPLETED") {
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "PAID",
              payment_method: "PHONEPE",
              payment_updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);
          order.payment_status = "PAID";
        }
      } catch (checkErr) {
        console.warn("[order] Order status check on redirect failed:", checkErr);
      }
    }

    const hasFiles = order.processing_status === 'ready';
    return { order, hasFiles };
  });

/** Server function: verify phone with attempt limits and return signed download URLs (24h) */
const verifyAndGetLinks = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; phone: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { sha256 } = await import('@/lib/crypto.server');
    const { getLoginRateLimit, recordLoginFailure, clearLoginFailures } = await import('@/lib/admin.server');
    const { generateDownloadUrl } = await import('@/lib/r2.server');

    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const ip =
      forwarded.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      "unknown";

    // Max 5 wrong phones per order per 10 min
    const rateLimitKey = await sha256(`order-verify:${data.orderId}:${ip}`);
    const rateLimit = await getLoginRateLimit(rateLimitKey);
    if (rateLimit.locked) {
      throw new Error(`बहुत सारे गलत प्रयास। कृपया ${rateLimit.retryAfterSeconds} सेकंड बाद फिर प्रयास करें।`);
    }

    let { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, contact_number, processing_status, output_files')
      .eq('order_id', data.orderId)
      .maybeSingle();

    if (!order && !error) {
      const { data: orderById } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, contact_number, processing_status, output_files')
        .eq('id', data.orderId)
        .maybeSingle();
      if (!orderById) throw new Error("Order not found");
      order = orderById;
    }
    if (error || !order) throw new Error("Order not found");

    const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
    const orderPhone = (order.contact_number || '').replace(/\D/g, '').slice(-10);

    if (cleanPhone !== orderPhone) {
      await recordLoginFailure(rateLimitKey, rateLimit.failedCount);
      throw new Error("Mobile number does not match the order. Please enter the number used during ordering.");
    }

    // Phone matches! Clear rate limit failures
    await clearLoginFailures(rateLimitKey);

    if (order.processing_status !== 'ready' || !order.output_files) {
      return { downloadLinks: [], message: "Files are not ready yet." };
    }

    // Sign URLs only for keys listed in that order's output_files and starting with orders/<order_id>/
    const orderPrefix = `orders/${order.order_id || order.id}/`;
    const outputFiles = (Array.isArray(order.output_files) ? order.output_files : []) as { name?: string; key?: string }[];
    const downloadLinks: { name: string; url: string }[] = [];

    for (const f of outputFiles) {
      if (f?.key && typeof f.key === "string" && f.key.startsWith(orderPrefix)) {
        const url = await generateDownloadUrl(f.key, 86400); // 24-hour links (B8)
        downloadLinks.push({ name: f.name || "Download File", url });
      }
    }

    return { downloadLinks };
  });

export const Route = createFileRoute('/order/$orderId')({
  validateSearch: (search: Record<string, unknown>): { paid?: string | undefined } => ({
    paid: typeof search["paid"] === "string" ? search["paid"] : undefined,
  }),
  loaderDeps: ({ search: { paid } }) => ({ paid }),
  loader: async ({ params, deps }) =>
    await getOrderData({ data: { orderId: params.orderId, paid: deps.paid } }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { order, hasFiles } = Route.useLoaderData();
  const [phone, setPhone] = useState('');
  const [downloadLinks, setDownloadLinks] = useState<{ name: string; url: string }[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusText = () => {
    if (order.payment_status === 'UNPAID' || order.payment_status === 'PENDING') return "Pending Payment";
    if (order.processing_status === 'queued') return "In Queue";
    if (order.processing_status === 'processing') return "Processing";
    if (order.processing_status === 'ready') return "Ready";
    if (order.processing_status === 'failed') return "Failed";
    return order.processing_status || "Unknown";
  };

  async function handleVerify() {
    if (phone.replace(/\D/g, '').length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const result = await verifyAndGetLinks({
        data: { orderId: order.order_id || order.id, phone },
      });
      if ('message' in result && result.message) {
        setError(result.message);
      } else if (result.downloadLinks) {
        setDownloadLinks(result.downloadLinks);
      }
    } catch (e: any) {
      setError(e.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto p-6 mt-12 bg-card rounded-xl border shadow-sm">
          <h1 className="text-2xl font-bold mb-4">Order Status</h1>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-4">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-sm">{order.order_id || order.id}</span>
            </div>
            <div className="flex justify-between border-b pb-4">
              <span className="text-muted-foreground">Candidate</span>
              <span className="font-semibold">{order.candidate_name_hindi}</span>
            </div>
            <div className="flex justify-between border-b pb-4">
              <span className="text-muted-foreground">Status</span>
              <span className="font-bold text-primary">{getStatusText()}</span>
            </div>

            {hasFiles && !downloadLinks && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="size-4" />
                  <span>Enter the mobile number used during ordering to access your files.</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1"
                  />
                  <Button onClick={handleVerify} disabled={verifying}>
                    {verifying ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}

            {downloadLinks && (
              <div className="pt-4">
                <h2 className="text-xl font-bold mb-4">Download Files</h2>
                <div className="flex flex-col gap-3">
                  {downloadLinks.map((link, idx) => (
                    <Button key={idx} asChild className="w-full justify-start gap-3" variant="outline">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <Download className="size-4" />
                        {link.name}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
