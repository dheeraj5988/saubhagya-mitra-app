import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { generateDownloadUrl } from '@/lib/r2.server';
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const getOrderData = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: orderId }) => {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, payment_status, processing_status, output_files, candidate_name_hindi')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error("Order not found");
    }

    let downloadLinks: { name: string, url: string }[] = [];
    if (order.processing_status === 'ready' && order.output_files) {
      const files = order.output_files as any[];
      downloadLinks = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          url: await generateDownloadUrl(f.key)
        }))
      );
    }

    return { order, downloadLinks };
  });

export const Route = createFileRoute('/order/$orderId')({
  loader: async ({ params }) => await getOrderData({ data: params.orderId }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { order, downloadLinks } = Route.useLoaderData();

  const getStatusText = () => {
    if (order.payment_status === 'UNPAID') return "Pending Payment";
    if (order.processing_status === 'queued') return "In Queue";
    if (order.processing_status === 'processing') return "Processing";
    if (order.processing_status === 'ready') return "Ready";
    return order.processing_status || "Unknown";
  };

  return (
    <div className="min-h-screen flex flex-col"><SiteHeader />
<main className="flex-1">
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-card rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Order Status</h1>
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-4">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-sm">{order.id}</span>
          </div>
          <div className="flex justify-between border-b pb-4">
            <span className="text-muted-foreground">Candidate</span>
            <span className="font-semibold">{order.candidate_name_hindi}</span>
          </div>
          <div className="flex justify-between border-b pb-4">
            <span className="text-muted-foreground">Status</span>
            <span className="font-bold text-primary">{getStatusText()}</span>
          </div>

          {order.processing_status === 'ready' && (
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
