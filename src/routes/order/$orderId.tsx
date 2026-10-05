import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { confirmPhonePePayment } from '@/lib/orders.functions';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { generateDownloadUrl } from '@/lib/r2.server';
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Lock, Loader2 } from 'lucide-react';

/** Loader: fetch order status but NOT download links (those require phone verification) */
const getOrderData = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: orderId }) => {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, payment_status, processing_status, candidate_name_hindi')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!order && !error) {
      // Fallback: try matching on `id` (UUID) for old links
      const { data: orderById } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, payment_status, processing_status, candidate_name_hindi')
        .eq('id', orderId)
        .maybeSingle();
      if (!orderById) throw new Error("Order not found");
      return { order: orderById, hasFiles: false };
    }
    if (error || !order) throw new Error("Order not found");

    const hasFiles = order.processing_status === 'ready';
    return { order, hasFiles };
  });

/** Server function: verify phone and return signed download URLs */
const verifyAndGetLinks = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; phone: string }) => d)
  .handler(async ({ data }) => {
    const { data: order, error } = await supabaseAdmin
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
      return verifyOrder(orderById, data.phone);
    }
    if (error || !order) throw new Error("Order not found");
    return verifyOrder(order, data.phone);
  });

function verifyOrder(order: any, phone: string) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const orderPhone = (order.contact_number || '').replace(/\D/g, '').slice(-10);

  if (cleanPhone !== orderPhone) {
    throw new Error("Mobile number does not match the order. Please enter the number used during ordering.");
  }

  if (order.processing_status !== 'ready' || !order.output_files) {
    return { downloadLinks: [], message: "Files are not ready yet." };
  }

  // We can't do async inside this sync helper, so return file keys for the caller
  return { files: order.output_files as { name: string; key: string }[] };
}

export const Route = createFileRoute('/order/$orderId')({
  loader: async ({ params }) => await getOrderData({ data: params.orderId }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { order, hasFiles } = Route.useLoaderData();
  const [phone, setPhone] = useState('');
  const [downloadLinks, setDownloadLinks] = useState<{ name: string; url: string }[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [payNote, setPayNote] = useState<'checking' | 'paid' | 'failed' | 'pending' | null>(null);

  // Returning from PhonePe (?paid=1): ask the server for the real status.
  // The redirect itself is never trusted.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('paid')) return;
    let stop = false;
    let tries = 0;
    const check = async () => {
      if (stop) return;
      tries += 1;
      try {
        const r = await confirmPhonePePayment({ data: { orderId: order.order_id || order.id } });
        if (stop) return;
        if (r.state === 'COMPLETED') {
          setPayNote('paid');
          void router.invalidate();
          return;
        }
        if (r.state === 'FAILED') {
          setPayNote('failed');
          return;
        }
      } catch {
        // try again below
      }
      if (tries < 8) window.setTimeout(check, 4000);
      else setPayNote('pending');
    };
    setPayNote('checking');
    void check();
    return () => {
      stop = true;
    };
  }, [order.order_id, order.id, router]);

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
      if ('message' in result) {
        setError(result.message);
      } else if (result.files) {
        // Generate download URLs client-side via another server call
        const links = await getSignedUrls({ data: result.files.map((f: any) => f.key) });
        setDownloadLinks(
          result.files.map((f: any, i: number) => ({ name: f.name as string, url: links[i] ?? "" }))
        );
      }
    } catch (e: any) {
      setError(e.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col"><SiteHeader />
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

          {payNote && (
            <p
              className={
                payNote === 'paid'
                  ? 'rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
                  : payNote === 'failed'
                    ? 'rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800'
                    : 'rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground'
              }
            >
              {payNote === 'checking' && 'भुगतान की पुष्टि हो रही है… / Confirming your payment…'}
              {payNote === 'paid' && 'भुगतान मिल गया। धन्यवाद! / Payment received. Thank you!'}
              {payNote === 'failed' &&
                'भुगतान पूरा नहीं हुआ। पैसा कटा हो तो 5–7 दिन में वापस आ जाता है। / Payment did not complete.'}
              {payNote === 'pending' &&
                'भुगतान की पुष्टि अभी बाकी है। कुछ मिनट बाद यह पेज दोबारा खोलिए। / Payment is still being confirmed. Please reopen this page in a few minutes.'}
            </p>
          )}

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
<SiteFooter /></div>
  );
}

/** Server function to generate signed download URLs for given R2 keys */
const getSignedUrls = createServerFn({ method: "POST" })
  .validator((d: string[]) => d)
  .handler(async ({ data: keys }) => {
    return Promise.all(keys.map((key) => generateDownloadUrl(key)));
  });
