import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminSampleRequests,
  adminUpdateSampleStatus,
} from "@/lib/admin-catalog.functions";
import type { AdminSampleRequest } from "@/lib/admin.schema";
import { SAMPLE_STATUSES, type SampleStatus } from "@/lib/orders.schema";
import { formatDateTime, waLink } from "@/lib/admin-ui";

export function SampleRequestsTab({
  token,
  onError,
}: {
  token: string;
  onError: (err: unknown, fallback: string) => boolean;
}) {
  const fetchRequests = useServerFn(adminSampleRequests);
  const updateStatus = useServerFn(adminUpdateSampleStatus);

  const [rows, setRows] = useState<AdminSampleRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const res = await fetchRequests({
        data: { token, search: debounced, page: 1, page_size: 50 },
      });
      setRows(res.requests as AdminSampleRequest[]);
      setTotal(res.total);
    } catch (err) {
      onError(err, "Could not load sample requests.");
    } finally {
      setLoading(false);
    }
  }, [fetchRequests, token, debounced, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(row: AdminSampleRequest, status: SampleStatus) {
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status } : r)));
    try {
      await updateStatus({ data: { token, id: row.id, status } });
      toast.success(`${row.request_id} → ${status}`);
    } catch (err) {
      setRows(prev);
      onError(err, "Could not update the sample request.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search request ID, candidate, mobile, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground">{total} request(s)</span>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="size-4" /> Reload
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No free sample requests yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Request</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Voters</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{r.request_id}</td>
                  <td className="max-w-[200px] truncate px-3 py-2" title={r.candidate_name}>
                    {r.candidate_name}
                  </td>
                  <td className="px-3 py-2">{r.contact_number}</td>
                  <td
                    className="max-w-[260px] truncate px-3 py-2 text-muted-foreground"
                    title={[r.district, r.panchayat_samiti, r.gram_panchayat, r.ward_number]
                      .filter(Boolean)
                      .join(" › ")}
                  >
                    {[r.district, r.gram_panchayat, r.ward_number].filter(Boolean).join(" › ") ||
                      "—"}
                  </td>
                  <td className="px-3 py-2">{r.voter_count ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={r.status}
                      onValueChange={(v) => void change(r, v as SampleStatus)}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    {waLink(r.contact_number) ? (
                      <Button asChild size="icon" variant="ghost" className="size-8">
                        <a
                          href={waLink(r.contact_number)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${r.contact_number}`}
                        >
                          <MessageCircle className="size-4 text-success" />
                        </a>
                      </Button>
                    ) : null}
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
