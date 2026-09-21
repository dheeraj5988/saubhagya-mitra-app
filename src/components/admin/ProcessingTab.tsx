import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProcessingDashboard, markOrderPaidAdmin } from "@/lib/admin-processing.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCcw, CheckCircle2, Clock } from "lucide-react";

export function ProcessingTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["processing-dashboard"],
    queryFn: () => getProcessingDashboard({ data: { token } }),
    refetchInterval: 5000, // auto-refresh every 5s
  });

  const markPaid = useMutation({
    mutationFn: (orderId: string) => markOrderPaidAdmin({ data: { token, orderId } }),
    onSuccess: () => {
      toast.success("Order marked as PAID");
      queryClient.invalidateQueries({ queryKey: ["processing-dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div>Loading dashboard...</div>;

  const workers = data?.workers || [];
  const orders = data?.orders || [];

  const queuedOrders = orders.filter((o) => o.processing_status === "queued");
  const processingOrders = orders.filter((o) => o.processing_status === "processing");
  const readyOrders = orders.filter((o) => o.processing_status === "ready");
  const unpaidOrders = orders.filter((o) => o.payment_status === "UNPAID");

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 2 * 60 * 1000; // 2 minutes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Processing & PCs</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCcw className="size-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workers Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Offline PCs (Workers)</CardTitle>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workers registered.</p>
            ) : (
              <div className="space-y-4">
                {workers.map((w) => (
                  <div key={w.id} className="flex justify-between items-center border p-3 rounded-lg">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Jobs done: {w.jobs_done}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isOnline(w.last_seen_at) ? (
                        <Badge variant="default" className="bg-green-500">Online</Badge>
                      ) : (
                        <Badge variant="secondary">Offline</Badge>
                      )}
                      {w.current_order_id && (
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={w.current_order_id}>
                          Working: {w.current_order_id.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Live Queue ({queuedOrders.length} / {processingOrders.length} / {readyOrders.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-auto">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Processing</h3>
                {processingOrders.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                {processingOrders.map((o) => (
                  <div key={o.id} className="text-sm border p-2 rounded flex justify-between items-center">
                    <span className="font-mono truncate">{o.id.substring(0, 8)}</span>
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                      PC: {workers.find(w => w.id === o.assigned_worker_id)?.name || "Unknown"}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Queued</h3>
                {queuedOrders.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                {queuedOrders.map((o) => (
                  <div key={o.id} className="text-sm border p-2 rounded flex justify-between items-center">
                    <span className="font-mono truncate">{o.id.substring(0, 8)}</span>
                    <Clock className="size-4 text-orange-500" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Ready</h3>
                {readyOrders.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                {readyOrders.map((o) => (
                  <div key={o.id} className="text-sm border p-2 rounded flex justify-between items-center">
                    <span className="font-mono truncate">{o.id.substring(0, 8)}</span>
                    <CheckCircle2 className="size-4 text-green-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manual Payment Section */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Manual Payment Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[200px] overflow-auto">
              {unpaidOrders.length === 0 && <p className="text-sm text-muted-foreground">No unpaid orders recently.</p>}
              {unpaidOrders.map((o) => (
                <div key={o.id} className="flex justify-between items-center border-b pb-2">
                  <div className="text-sm">
                    <div className="font-mono">{o.id.substring(0,8)}...</div>
                    <div className="text-muted-foreground">{o.candidate_name_english}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => markPaid.mutate(o.id)} disabled={markPaid.isPending}>
                    Mark Paid
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
