import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminTriggerTestJob,
  getProcessingDashboard,
  markOrderPaidAdmin,
} from "@/lib/admin-processing.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCcw, CheckCircle2, Clock, Plus, Trash2, Download, Pause, Play, FlaskConical } from "lucide-react";
import { addWorker, deleteWorker, toggleWorker } from "@/lib/worker-management.functions";
import { PYTHON_WORKER_TEMPLATE } from "@/lib/worker-script-template";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { WardMappingImportCard } from "@/components/admin/WardMappingImportCard";

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


  const [newWorkerName, setNewWorkerName] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const addMut = useMutation({
    mutationFn: async (name: string) => {
      const tokenString = crypto.randomUUID();
      const res = await addWorker({ data: { token, name, workerToken: tokenString } });
      return { worker: res, token: tokenString };
    },
    onSuccess: (data) => {
      toast.success("Worker added!");
      setIsAddOpen(false);
      setNewWorkerName("");
      queryClient.invalidateQueries({ queryKey: ["processing-dashboard"] });
      downloadScript(data.worker, data.token);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteWorker({ data: { token, id } }),
    onSuccess: () => {
      toast.success("Worker deleted");
      queryClient.invalidateQueries({ queryKey: ["processing-dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) => toggleWorker({ data: { token, id, active } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const testJobMut = useMutation({
    mutationFn: (workerId: string) => adminTriggerTestJob({ data: { token, worker_id: workerId } }),
    onSuccess: (res) => {
      toast.success(`Test job ${res.order_id} queued for ${res.worker_name}. Picked up on its next poll (~15s).`);
      queryClient.invalidateQueries({ queryKey: ["processing-dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const downloadScript = (worker: any, workerToken: string) => {
    let script = PYTHON_WORKER_TEMPLATE;
    script = script.replace("{{SITE_URL}}", window.location.origin);
    script = script.replace("{{WORKER_ID}}", worker.id);
    script = script.replace("{{WORKER_TOKEN}}", workerToken);
    
    const blob = new Blob([script], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `worker_${worker.name}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Offline PCs (Workers)</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="size-4 mr-1" /> Add Worker</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Worker</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Worker Name</Label>
                    <Input value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} placeholder="e.g. PC-1" />
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={!newWorkerName.trim() || addMut.isPending} 
                    onClick={() => addMut.mutate(newWorkerName)}
                  >
                    Generate & Download Script
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workers registered.</p>
            ) : (
              <div className="space-y-4">
                {workers.map((w) => (
                  
                  <div key={w.id} className="flex justify-between items-center border p-3 rounded-lg">
                    <div>
                      <div className="font-semibold">{w.name} {w.active === false && <Badge variant="outline" className="ml-2 text-destructive">Paused</Badge>}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Jobs done: {w.jobs_done}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
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
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleMut.mutate({ id: w.id, active: !w.active })} title={w.active ? "Pause Worker" : "Resume Worker"}>
                          {w.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadScript(w, w.token_hash)} title="Download Script (Requires Raw Token in DB)">
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={testJobMut.isPending}
                          onClick={() => testJobMut.mutate(w.id)}
                          title="Send a throwaway test order to this PC"
                        >
                          <FlaskConical className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if(confirm("Delete this worker?")) deleteMut.mutate(w.id) }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
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
                    <span className="font-mono truncate">
                      {(o as any).order_id ?? o.id.substring(0, 8)}
                      {(o as any).is_sample ? <Badge variant="outline" className="ml-1 border-purple-400 text-purple-600">TEST</Badge> : null}
                    </span>
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
                    <span className="font-mono truncate">
                      {(o as any).order_id ?? o.id.substring(0, 8)}
                      {(o as any).is_sample ? <Badge variant="outline" className="ml-1 border-purple-400 text-purple-600">TEST</Badge> : null}
                    </span>
                    <Clock className="size-4 text-orange-500" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Ready</h3>
                {readyOrders.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                {readyOrders.map((o) => (
                  <div key={o.id} className="text-sm border p-2 rounded flex justify-between items-center">
                    <span className="font-mono truncate">
                      {(o as any).order_id ?? o.id.substring(0, 8)}
                      {(o as any).is_sample ? <Badge variant="outline" className="ml-1 border-purple-400 text-purple-600">TEST</Badge> : null}
                    </span>
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

      <WardMappingImportCard token={token} />
    </div>
  );
}
