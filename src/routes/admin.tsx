import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  ImageOff,
  Laptop,
  Loader2,
  LogOut,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminDeleteOrder,
  adminExportLeads,
  adminExportOrders,
  adminLeads,
  adminLogin,
  adminLogout,
  adminOrders,
  adminOverview,
  adminPhotoUrl,
  adminUpdateStatus,
} from "@/lib/admin.functions";
import type { AdminKpis, AdminLead, AdminOrder } from "@/lib/admin.schema";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders.schema";
import {
  ADMIN_TOKEN_KEY,
  downloadCsv,
  formatDateTime,
  isTokenShaped,
  isUnauthorized,
  leadTypeLabel,
  telLink,
  waLink,
} from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Saubhagya" },
      {
        name: "description",
        content: "Internal operations console for Saubhagya Matdata Parchi orders.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { property: "og:title", content: "Admin Dashboard | Saubhagya" },
      { property: "og:description", content: "Internal operations console." },
    ],
  }),
  component: AdminPage,
});

const PAGE_SIZE = 25;
const POLL_MS = 15_000;

/** Desktop gate boundary: blocked below 1024px, usable at exactly 1024px+. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function statusClass(status: string) {
  if (status === "Completed") return "bg-success/12 text-success border-success/30";
  if (status === "In-Process") return "bg-info/12 text-info border-info/30";
  return "bg-saffron/12 text-saffron-deep border-saffron/30";
}

function AdminPage() {
  const isDesktop = useIsDesktop();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    // A malformed/forged value is discarded up front; the server re-validates
    // every well-formed one against a live session row anyway.
    if (isTokenShaped(stored)) setToken(stored);
    else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setReady(true);
  }, []);

  if (isDesktop === null || !ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy text-navy-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!isDesktop) return <DesktopOnlyNotice />;
  if (!token) return <AdminLogin onSuccess={setToken} />;
  return <AdminDashboard token={token} onLogout={() => setToken(null)} />;
}

function DesktopOnlyNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-navy px-6 text-center text-navy-foreground">
      <div className="max-w-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-navy-foreground/10">
          <Laptop className="size-8" />
        </span>
        <p className="mt-6 text-lg font-semibold leading-relaxed">
          Admin panel is accessible only from Desktop workstations.
        </p>
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const result = await login({ data: { password } });
      if (!result.ok) {
        if (result.locked) {
          setHint(null);
          const minutes = Math.max(1, Math.ceil(result.retry_after_seconds / 60));
          setError(`Too many failed attempts. Try again in ${minutes} minute(s).`);
          return;
        }
        // The server decides whether a hint is warranted (first failure only).
        setHint(result.hint);
        setError(result.hint ? "Incorrect password." : "Invalid password. Please try again.");
        return;
      }
      window.localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      onSuccess(result.token);
    } catch {
      setError("Unable to sign in right now. Please retry.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-navy px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-elevated"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-saffron-gradient text-base font-black text-saffron-foreground">
          सौ
        </span>
        <h1 className="mt-5 font-display text-xl font-bold text-navy">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Restricted access — desktop workstation.
        </p>

        <div className="mt-6 space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-destructive"
          >
            <AlertTriangle className="size-4" /> {error}
          </p>
        ) : null}
        {hint ? <p className="mt-1.5 text-sm font-medium text-saffron-deep">Hint: {hint}</p> : null}

        <Button type="submit" variant="navy" className="mt-6 w-full" disabled={busy || !password}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Sign in
        </Button>
      </form>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "navy" | "orange" | "blue" | "emerald" | "purple";
}) {
  const tones: Record<string, string> = {
    navy: "border-navy/20 text-navy",
    orange: "border-saffron/30 text-saffron-deep",
    blue: "border-info/30 text-info",
    emerald: "border-success/30 text-success",
    purple: "border-[oklch(0.55_0.2_300)]/30 text-[oklch(0.5_0.2_300)]",
  };
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-card", tones[tone])}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-black">{value}</p>
    </div>
  );
}

const EMPTY_KPIS: AdminKpis = { total: 0, pending: 0, process: 0, completed: 0, leads: 0 };

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const fetchOverview = useServerFn(adminOverview);
  const fetchOrders = useServerFn(adminOrders);
  const fetchLeads = useServerFn(adminLeads);
  const exportOrdersFn = useServerFn(adminExportOrders);
  const exportLeadsFn = useServerFn(adminExportLeads);
  const logout = useServerFn(adminLogout);
  const updateStatus = useServerFn(adminUpdateStatus);
  const deleteOrder = useServerFn(adminDeleteOrder);
  const photoUrl = useServerFn(adminPhotoUrl);

  const [kpis, setKpis] = useState<AdminKpis>(EMPTY_KPIS);
  const [wards, setWards] = useState<string[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);

  const [search, setSearch] = useState("");
  const [ward, setWard] = useState("all");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [leadSearch, setLeadSearch] = useState("");
  const [leadDate, setLeadDate] = useState("");
  const [leadPage, setLeadPage] = useState(1);

  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [preview, setPreview] = useState<AdminOrder | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminOrder | null>(null);

  const debouncedSearch = useDebounced(search);
  const debouncedLeadSearch = useDebounced(leadSearch);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    onLogout();
  }, [onLogout]);

  /** Central handler so every action reacts identically to an expired session. */
  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (isUnauthorized(err)) {
        toast.error("Session expired. Please sign in again.");
        signOut();
        return true;
      }
      toast.error(fallback);
      return false;
    },
    [signOut],
  );

  useEffect(() => setPage(1), [debouncedSearch, ward, status]);
  useEffect(() => setLeadPage(1), [debouncedLeadSearch, leadDate]);

  const ordersQuery = useMemo(
    () => ({ search: debouncedSearch, ward, status, page, page_size: PAGE_SIZE }),
    [debouncedSearch, ward, status, page],
  );
  const leadsQuery = useMemo(
    () => ({
      search: debouncedLeadSearch,
      date: leadDate,
      tz_offset: localTzOffset(),
      page: leadPage,
      page_size: PAGE_SIZE,
    }),
    [debouncedLeadSearch, leadDate, leadPage],
  );

  // Keep the latest query in a ref so the polling timer never goes stale.
  const queryRef = useRef({ ordersQuery, leadsQuery });
  queryRef.current = { ordersQuery, leadsQuery };

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      try {
        const { ordersQuery: oq, leadsQuery: lq } = queryRef.current;
        const [overview, orderRes, leadRes] = await Promise.all([
          fetchOverview({ data: { token } }),
          fetchOrders({ data: { token, ...oq } }),
          fetchLeads({ data: { token, ...lq } }),
        ]);
        setKpis(overview.kpis);
        setWards(overview.wards);
        setOrders(orderRes.orders);
        setOrderTotal(orderRes.total);
        setLeads(leadRes.leads);
        setLeadTotal(leadRes.total);
        setLastSynced(new Date());
        setError(null);
      } catch (err) {
        if (isUnauthorized(err)) {
          toast.error("Session expired. Please sign in again.");
          signOut();
          return;
        }
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchOverview, fetchOrders, fetchLeads, token, signOut],
  );

  // Refetch whenever the server-side query changes.
  useEffect(() => {
    void load(true);
  }, [load, ordersQuery, leadsQuery]);

  // Realtime is not possible from the browser here: every table is deny-all to
  // anon/authenticated by design, so we poll through the authenticated server
  // functions instead rather than weakening RLS.
  useEffect(() => {
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(orderTotal / PAGE_SIZE));
  const leadPageCount = Math.max(1, Math.ceil(leadTotal / PAGE_SIZE));

  async function changeStatus(order: AdminOrder, next: OrderStatus) {
    const prev = orders;
    setOrders((rows) => rows.map((r) => (r.id === order.id ? { ...r, status: next } : r)));
    try {
      await updateStatus({ data: { token, order_id: order.order_id, status: next } });
      toast.success(`${order.order_id} → ${next}`);
      void load(true);
    } catch (err) {
      setOrders(prev);
      handleError(err, "Status update failed.");
    }
  }

  async function download(order: AdminOrder) {
    if (!order.photo_path) {
      toast.error("No photo stored for this order.");
      return;
    }
    setBusyPhoto(true);
    try {
      const { url } = await photoUrl({ data: { token, path: order.photo_path } });
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener noreferrer";
      a.download = `${order.order_id}.jpg`;
      a.click();
    } catch (err) {
      handleError(err, "Could not download the photo.");
    } finally {
      setBusyPhoto(false);
    }
  }

  async function confirmDelete() {
    const order = pendingDelete;
    if (!order) return;
    setDeleting(true);
    try {
      const result = await deleteOrder({ data: { token, order_id: order.order_id } });
      setPendingDelete(null);
      toast.success(
        order.photo_path && !result.photo_removed
          ? `${order.order_id} deleted (photo cleanup pending).`
          : `${order.order_id} deleted.`,
      );
      void load(true);
    } catch (err) {
      handleError(err, "Delete failed. Please retry.");
    } finally {
      setDeleting(false);
    }
  }

  /** Exports pull the full filtered set from the server, not just this page. */
  async function exportOrders() {
    setExporting(true);
    try {
      const { orders: rows } = await exportOrdersFn({
        data: { token, search: debouncedSearch, ward, status },
      });
      if (!rows.length) {
        toast.error("Nothing to export for the current filters.");
        return;
      }
      downloadCsv("saubhagya-orders.csv", [
        [
          "Order ID",
          "Created",
          "Candidate (Hindi)",
          "Candidate (English)",
          "Phone",
          "District",
          "Panchayat Samiti",
          "Gram Panchayat",
          "Ward",
          "Election Symbol",
          "Slogan",
          "IP",
          "Status",
        ],
        ...rows.map((o) => [
          o.order_id,
          formatDateTime(o.created_at),
          o.candidate_name_hindi,
          o.candidate_name_english,
          o.contact_number,
          o.district,
          o.panchayat_samiti,
          o.gram_panchayat,
          o.ward_number,
          o.election_symbol,
          o.slogan,
          o.ip_address,
          o.status,
        ]),
      ]);
      toast.success(`Exported ${rows.length} order(s).`);
    } catch (err) {
      handleError(err, "Export failed. Please retry.");
    } finally {
      setExporting(false);
    }
  }

  async function exportLeads() {
    setExporting(true);
    try {
      const { leads: rows } = await exportLeadsFn({
        data: { token, search: debouncedLeadSearch, date: leadDate },
      });
      if (!rows.length) {
        toast.error("Nothing to export for the current filters.");
        return;
      }
      downloadCsv("saubhagya-leads.csv", [
        ["IP Address", "Timestamp", "Mobile", "Lead Type", "Status", "Order ID"],
        ...rows.map((l) => [
          l.ip_address,
          formatDateTime(l.visited_at),
          l.phone,
          leadTypeLabel(l.lead_type),
          l.status,
          l.order_id,
        ]),
      ]);
      toast.success(`Exported ${rows.length} lead(s).`);
    } catch (err) {
      handleError(err, "Export failed. Please retry.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b border-navy/40 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-saffron-gradient text-sm font-black text-saffron-foreground">
              सौ
            </span>
            <div>
              <p className="font-display text-sm font-bold leading-tight">
                सौभाग्य — Admin Dashboard
              </p>
              <p className="text-[11px] text-navy-foreground/70">
                मतदाता पर्ची सेवा · operations console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-foreground/10 px-3 py-1 text-[11px] font-medium text-navy-foreground/80">
              <Laptop className="size-3.5" /> Desktop workstation
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-navy-foreground/40 bg-navy-foreground/10 text-navy-foreground hover:bg-navy-foreground/20"
              onClick={async () => {
                try {
                  await logout({ data: { token } });
                } catch {
                  /* best effort — the local token is cleared regardless */
                }
                signOut();
                toast.success("Signed out.");
              }}
            >
              <LogOut className="size-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <section className="grid grid-cols-5 gap-4">
          <Kpi label="Total Orders" value={kpis.total} tone="navy" />
          <Kpi label="Pending Orders" value={kpis.pending} tone="orange" />
          <Kpi label="In-Process Orders" value={kpis.process} tone="blue" />
          <Kpi label="Completed Orders" value={kpis.completed} tone="emerald" />
          <Kpi label="Total Captured IPs / Leads" value={kpis.leads} tone="purple" />
        </section>

        <Tabs defaultValue="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="leads">
                <Users className="mr-1.5 size-4" /> Visitor &amp; Lead Tracker
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {refreshing
                  ? "Syncing…"
                  : lastSynced
                    ? `Auto-syncs every 15s · updated ${lastSynced.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}`
                    : "Auto-syncs every 15s"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load(true)}
                disabled={refreshing}
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search order ID, name, phone, district, panchayat, symbol"
                  className="h-10 pl-9"
                />
              </div>
              <Select value={ward} onValueChange={setWard}>
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All wards</SelectItem>
                  {wards.map((w) => (
                    <SelectItem key={w} value={w}>
                      Ward {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as OrderStatus | "all")}
              >
                <SelectTrigger className="h-10 w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setWard("all");
                  setStatus("all");
                }}
              >
                <X className="size-4" /> Clear filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportOrders()}
                disabled={exporting || !orderTotal}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}{" "}
                Export CSV
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {loading ? (
                <div className="grid place-items-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-sm">Loading orders…</p>
                </div>
              ) : error ? (
                <div className="grid place-items-center gap-3 py-16">
                  <AlertTriangle className="size-6 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => void load(true)}>
                    <RefreshCw className="size-4" /> Retry
                  </Button>
                </div>
              ) : !orders.length ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No orders match your filters.
                </p>
              ) : (
                <div className="relative max-h-[calc(100vh-24rem)] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <colgroup>
                      <col className="w-[110px]" />
                      <col className="w-[140px]" />
                      <col className="w-[200px]" />
                      <col className="w-[190px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[68px]" />
                      <col className="w-[150px]" />
                      <col className="w-[190px]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]">
                      <tr>
                        {[
                          "Order ID",
                          "Date / Time",
                          "Candidate",
                          "Location",
                          "Symbol",
                          "Phone",
                          "IP",
                          "Photo",
                          "Status",
                          "Actions",
                        ].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr
                          key={o.id}
                          className="border-t border-border/70 align-middle transition-colors hover:bg-saffron/[0.06]"
                        >
                          <td className="px-3 py-2 font-semibold text-navy">
                            <button
                              type="button"
                              onClick={() => setDetail(o)}
                              className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title={`Open details for ${o.order_id}`}
                            >
                              {o.order_id}
                            </button>
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground"
                            title={formatDateTime(o.created_at)}
                          >
                            {formatDateTime(o.created_at)}
                          </td>
                          <td className="px-3 py-2">
                            <p
                              className="truncate font-medium"
                              title={o.candidate_name_hindi}
                            >
                              {o.candidate_name_hindi}
                            </p>
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={o.candidate_name_english}
                            >
                              {o.candidate_name_english}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <p
                              className="truncate"
                              title={`${o.gram_panchayat} / वार्ड ${o.ward_number}`}
                            >
                              {o.gram_panchayat} / वार्ड {o.ward_number}
                            </p>
                            <p className="truncate text-muted-foreground" title={o.district}>
                              {o.district}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="block truncate" title={o.election_symbol}>
                              {o.election_symbol}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
                            {o.contact_number}
                          </td>
                          <td
                            className="px-3 py-2 text-xs text-muted-foreground"
                            title={o.ip_address ?? undefined}
                          >
                            <span className="block truncate">{o.ip_address ?? "—"}</span>
                          </td>
                          <td className="px-3 py-2">
                            {o.photo_url ? (
                              <button
                                type="button"
                                onClick={() => setPreview(o)}
                                title={`Preview photo for ${o.order_id}`}
                                className="size-9 overflow-hidden rounded-md border border-border transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <img
                                  src={o.photo_url}
                                  alt={`${o.candidate_name_english} photo`}
                                  className="size-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <span
                                title="No photo uploaded"
                                className="grid size-9 place-items-center rounded-md border border-dashed border-border text-muted-foreground"
                              >
                                <ImageOff className="size-4" />
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={o.status}
                              onValueChange={(v) => void changeStatus(o, v as OrderStatus)}
                            >
                              <SelectTrigger
                                title={`Change status for ${o.order_id}`}
                                className={cn(
                                  "h-8 w-[128px] border text-xs font-semibold",
                                  statusClass(o.status),
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title={`View full details for ${o.order_id}`}
                                aria-label={`View full details for ${o.order_id}`}
                                onClick={() => setDetail(o)}
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title={
                                  o.photo_path
                                    ? `Download photo for ${o.order_id}`
                                    : "No photo to download"
                                }
                                aria-label={`Download photo for ${o.order_id}`}
                                disabled={busyPhoto || !o.photo_path}
                                onClick={() => void download(o)}
                              >
                                <Download className="size-4" />
                              </Button>
                              {waLink(o.contact_number) ? (
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="size-8"
                                  title={`WhatsApp ${o.contact_number}`}
                                >
                                  <a
                                    href={waLink(o.contact_number)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`WhatsApp ${o.contact_number}`}
                                  >
                                    <MessageCircle className="size-4 text-success" />
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title={
                                  o.status === "Completed"
                                    ? "Already completed"
                                    : `Mark ${o.order_id} complete`
                                }
                                aria-label={`Mark ${o.order_id} complete`}
                                disabled={o.status === "Completed"}
                                onClick={() => void changeStatus(o, "Completed")}
                              >
                                <CheckCircle2 className="size-4 text-success" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title={`Delete ${o.order_id}`}
                                aria-label={`Delete ${o.order_id}`}
                                onClick={() => setPendingDelete(o)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {orderTotal > PAGE_SIZE ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, orderTotal)} of{" "}
                  {orderTotal}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search IP address, mobile or order ID"
                  className="h-10 pl-9"
                />
              </div>
              <Input
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="h-10 w-[180px]"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLeadSearch("");
                  setLeadDate("");
                }}
              >
                <X className="size-4" /> Clear filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportLeads()}
                disabled={exporting || !leadTotal}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}{" "}
                Export CSV
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {loading ? (
                <div className="grid place-items-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : !leads.length ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No leads captured yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        {[
                          "IP Address",
                          "Timestamp",
                          "Captured Mobile",
                          "Lead Type",
                          "Status",
                          "Order ID",
                          "Actions",
                        ].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id} className="border-t border-border/70 hover:bg-muted/40">
                          <td className="px-3 py-2.5 text-xs">{l.ip_address ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                            {formatDateTime(l.visited_at)}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium">{l.phone ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-[11px]">
                              {leadTypeLabel(l.lead_type)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs">{l.status}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-navy">
                            {l.order_id ?? "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1">
                              {telLink(l.phone) ? (
                                <Button asChild size="icon" variant="ghost" title="Call">
                                  <a href={telLink(l.phone)!}>
                                    <Phone className="size-4" />
                                  </a>
                                </Button>
                              ) : null}
                              {waLink(l.phone) ? (
                                <Button asChild size="icon" variant="ghost" title="WhatsApp">
                                  <a
                                    href={waLink(l.phone)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MessageCircle className="size-4 text-success" />
                                  </a>
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {leadTotal > PAGE_SIZE ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(leadPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(leadPage * PAGE_SIZE, leadTotal)} of {leadTotal}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leadPage === 1}
                    onClick={() => setLeadPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leadPage >= leadPageCount}
                    onClick={() => setLeadPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>

      {/* Photo lightbox */}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.candidate_name_hindi}</DialogTitle>
            <DialogDescription>{preview?.order_id}</DialogDescription>
          </DialogHeader>
          {preview?.photo_url ? (
            <img
              src={preview.photo_url}
              alt={`${preview.candidate_name_english} candidate photo`}
              className="max-h-[60vh] w-full rounded-lg object-contain"
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Photo unavailable.</p>
          )}
          <DialogFooter>
            {preview ? (
              <Button variant="outline" disabled={busyPhoto} onClick={() => void download(preview)}>
                {busyPhoto ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}{" "}
                Download Photo
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order {detail?.order_id}</DialogTitle>
            <DialogDescription>
              {detail ? formatDateTime(detail.created_at) : null}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["प्रत्याशी (हिंदी)", detail.candidate_name_hindi],
                ["Candidate (English)", detail.candidate_name_english],
                ["Phone", detail.contact_number],
                ["District", detail.district],
                ["Panchayat Samiti", detail.panchayat_samiti],
                ["Gram Panchayat", detail.gram_panchayat],
                ["Ward Number", detail.ward_number],
                ["Election Symbol", detail.election_symbol],
                ["Slogan", detail.slogan ?? "—"],
                ["IP Address", detail.ip_address ?? "—"],
                ["Status", detail.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <DialogFooter>
            {detail && waLink(detail.contact_number) ? (
              <Button asChild variant="success">
                <a href={waLink(detail.contact_number)!} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> WhatsApp candidate
                </a>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.order_id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the order record and its uploaded candidate photo. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null} Delete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
