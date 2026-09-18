import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  adminListBlocked,
  adminBlockEntity,
  adminUnblockEntity,
} from "@/lib/admin-blocked.functions";
import { formatDateTime } from "@/lib/admin-ui";

type BlockedEntityRow = {
  id: string;
  type: "IP" | "PHONE";
  value: string;
  reason: string | null;
  blocked_at: string;
  created_at: string;
};

export function BlockedTab({
  token,
  onError,
}: {
  token: string;
  onError: (err: unknown, fallback: string) => boolean;
}) {
  const fetchBlocked = useServerFn(adminListBlocked);
  const blockEntity = useServerFn(adminBlockEntity);
  const unblockEntity = useServerFn(adminUnblockEntity);

  const [rows, setRows] = useState<BlockedEntityRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"IP" | "PHONE">("PHONE");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchBlocked({ data: { token } });
      setRows(res as BlockedEntityRow[]);
    } catch (err) {
      onError(err, "Could not load blocked entities.");
    } finally {
      setLoading(false);
    }
  }, [fetchBlocked, token, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;

    setSubmitting(true);
    try {
      await blockEntity({
        data: { token, type, value: value.trim(), reason: reason.trim() || undefined },
      });
      toast.success(`${value} has been blocked.`);
      setOpen(false);
      setValue("");
      setReason("");
      void load();
    } catch (err) {
      onError(err, "Could not block entity.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(type: "IP" | "PHONE", value: string) {
    try {
      await unblockEntity({ data: { token, type, value } });
      toast.success(`${value} unblocked.`);
      void load();
    } catch (err) {
      onError(err, "Could not unblock entity.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <div className="flex-1"></div>
        <span className="text-xs text-muted-foreground">{rows.length} blocked</span>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="size-4" /> Reload
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" /> Add Block
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block IP or Phone</DialogTitle>
              <DialogDescription>
                Blocked IPs or phones cannot create any new orders.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "IP" | "PHONE")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHONE">Phone Number</SelectItem>
                      <SelectItem value="IP">IP Address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === "PHONE" ? "e.g. 9876543210" : "e.g. 192.168.1.1"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Block"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No blocked entities.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 w-24">Type</th>
                <th className="px-3 py-2 w-48">Value</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2 w-40">Blocked At</th>
                <th className="px-3 py-2 w-16 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{r.type}</td>
                  <td className="px-3 py-2 font-mono">{r.value}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.reason ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {r.blocked_at ? formatDateTime(r.blocked_at) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(r.type, r.value)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
