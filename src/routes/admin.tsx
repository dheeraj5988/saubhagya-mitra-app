import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  Eraser,
  Eye,
  FileText,
  Gift,
  ImageOff,
  Laptop,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  FileJson,
  FolderArchive,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search,
  Share2,
  Trash2,
  Users,
  Vote,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

import {
  adminClearLeads,
  adminDeleteLead,
  adminUpdatePaymentStatus,
} from "@/lib/admin-catalog.functions";
import { adminVoterPdfUrl } from "@/lib/admin-processing.functions";
import { SymbolsTab } from "@/components/admin/SymbolsTab";
import { PaymentSettingsTab } from "@/components/admin/PaymentSettingsTab";
import { GeographyTab } from "@/components/admin/GeographyTab";
import { SampleRequestsTab } from "@/components/admin/SampleRequestsTab";
import { ReferralTab } from "@/components/admin/ReferralTab";
import { BlockedTab } from "@/components/admin/BlockedTab";
import { ProcessingTab } from "@/components/admin/ProcessingTab";
import { adminAssignOrderPartner, adminListPartners } from "@/lib/admin-referral.functions";
import type { AdminPartnerStats } from "@/lib/admin-referral.schema";
import { DESIGN_META, formatInr, isDesignCode } from "@/lib/pricing";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/catalog.schema";

import type { AdminKpis, AdminLead, AdminOrder } from "@/lib/admin.schema";
import { ORDER_STATUSES, PAD_LABELS, type OrderStatus, type Pad } from "@/lib/orders.schema";
import {
  ADMIN_TOKEN_KEY,
  downloadCsv,
  formatDateTime,
  isTokenShaped,
  isUnauthorized,
  leadStatusClass,
  leadTypeClass,
  leadTypeLabel,
  localTzOffset,
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

function paymentClass(status: string) {
  if (status === "PAID_VERIFIED" || status === "MANUAL_APPROVED")
    return "border-success/40 bg-success/10 text-success";
  if (status === "SUSPICIOUS") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "VERIFICATION_PENDING") return "border-saffron/40 bg-saffron/10 text-saffron-deep";
  return "border-border bg-muted text-muted-foreground";
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
  value: number | string;
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

const EMPTY_KPIS: AdminKpis = {
  total: 0,
  paid: 0,
  pending: 0,
  revenue: 0,
  samples: 0,
  leads: 0,
  referral_orders: 0,
  commission_payable: 0,
};

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
  const voterPdfUrl = useServerFn(adminVoterPdfUrl);
  const updatePaymentStatus = useServerFn(adminUpdatePaymentStatus);

  const deleteLead = useServerFn(adminDeleteLead);
  const clearLeads = useServerFn(adminClearLeads);
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
  const [busyVoterPdf, setBusyVoterPdf] = useState(false);

  const [search, setSearch] = useState("");
  const [ward, setWard] = useState("all");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [leadSearch, setLeadSearch] = useState("");
  const [leadDate, setLeadDate] = useState("");
  const [leadPage, setLeadPage] = useState(1);

  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [assign, setAssign] = useState<AdminOrder | null>(null);
  const [assignPartners, setAssignPartners] = useState<AdminPartnerStats[]>([]);
  const listPartnersFn = useServerFn(adminListPartners);
  const assignPartnerFn = useServerFn(adminAssignOrderPartner);
  const [preview, setPreview] = useState<AdminOrder | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminOrder | null>(null);
  const [pendingLeadDelete, setPendingLeadDelete] = useState<AdminLead | null>(null);
  const [clearingLeads, setClearingLeads] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

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

  useEffect(() => setPage(1), [debouncedSearch, ward, status, paymentStatus]);
  useEffect(() => setLeadPage(1), [debouncedLeadSearch, leadDate]);

  const ordersQuery = useMemo(
    () => ({
      search: debouncedSearch,
      ward,
      status,
      payment_status: paymentStatus,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, ward, status, paymentStatus, page],
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

  async function openAssign(order: AdminOrder) {
    setAssign(order);
    try {
      const res = await listPartnersFn({ data: { token, search: "" } });
      setAssignPartners(res.partners as AdminPartnerStats[]);
    } catch (err) {
      handleError(err, "Could not load referral partners.");
    }
  }

  async function saveAssignment(partnerId: string | null) {
    if (!assign) return;
    const order = assign;
    setAssign(null);
    try {
      await assignPartnerFn({ data: { token, order_id: order.order_id, partner_id: partnerId } });
      toast.success(partnerId ? `${order.order_id} mapped to partner.` : "Referral removed.");
      await load(true);
    } catch (err) {
      if (!handleError(err, "Could not map the partner.")) {
        toast.error(err instanceof Error ? err.message : "Could not map the partner.");
      }
    }
  }

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

  async function changePaymentStatus(order: AdminOrder, next: PaymentStatus) {
    const prev = orders;
    setOrders((rows) => rows.map((r) => (r.id === order.id ? { ...r, payment_status: next } : r)));
    try {
      await updatePaymentStatus({
        data: { token, order_id: order.order_id, payment_status: next },
      });
      toast.success(`${order.order_id} payment → ${next}`);
      void load(true);
    } catch (err) {
      setOrders(prev);
      handleError(err, "Payment status update failed.");
    }
  }

  async function confirmLeadDelete() {
    const lead = pendingLeadDelete;
    if (!lead) return;
    try {
      await deleteLead({ data: { token, id: lead.id } });
      setPendingLeadDelete(null);
      toast.success("IP log entry deleted.");
      void load(true);
    } catch (err) {
      handleError(err, "Could not delete this lead.");
    }
  }

  async function confirmClearLeads() {
    setClearingLeads(true);
    try {
      const { deleted } = await clearLeads({ data: { token, confirm: "DELETE" } });
      setConfirmClear(false);
      toast.success(`Cleared ${deleted} IP log entr${deleted === 1 ? "y" : "ies"}.`);
      void load(true);
    } catch (err) {
      handleError(err, "Could not clear the IP logs.");
    } finally {
      setClearingLeads(false);
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

  async function downloadVoterPdf(order: AdminOrder) {
    if (!order.voter_photo_pdf_path) {
      toast.error("No voter list PDF stored for this order.");
      return;
    }
    setBusyVoterPdf(true);
    try {
      const { url } = await voterPdfUrl({ data: { token, path: order.voter_photo_pdf_path } });
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener noreferrer";
      a.download = `${order.order_id}-voter-list.pdf`;
      a.click();
    } catch (err) {
      handleError(err, "Could not download the voter list PDF.");
    } finally {
      setBusyVoterPdf(false);
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

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedSet.has(o.order_id));

  function toggleOne(orderId: string) {
    setSelected((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  }

  function togglePage() {
    setSelected((prev) => {
      const ids = orders.map((o) => o.order_id);
      if (ids.every((id) => prev.includes(id))) return prev.filter((id) => !ids.includes(id));
      return Array.from(new Set([...prev, ...ids]));
    });
  }

  /** Exports pull the full filtered set from the server, not just this page. */
  async function exportOrders() {
    setExporting(true);
    try {
      const {
        orders: rows,
        matched,
        limit,
        capped,
      } = await exportOrdersFn({
        data: { token, search: debouncedSearch, ward, status, payment_status: paymentStatus },
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
          "Party (snapshot)",
          "Symbol (snapshot)",
          "Slogan",
          "IP",
          "Status",
          "Payment Status",
          "Payment Method",
          "Payment Txn",
          "Payment Amount",
          "Payment Updated",
          "Design",
          "Voter Count",
          "Rate Per Voter",
          "Amount",
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
          o.party_name_snapshot,
          o.symbol_name_snapshot,
          o.slogan,
          o.ip_address,
          o.status,
          PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus] ?? o.payment_status,
          o.payment_method
            ? (PAYMENT_METHOD_LABELS[o.payment_method as PaymentMethod] ?? o.payment_method)
            : "",
          o.payment_txn_id,
          o.payment_amount,
          o.payment_updated_at ? formatDateTime(o.payment_updated_at) : "",
          o.design_code,
          o.voter_count,
          o.rate_per_voter,
          o.amount,
        ]),
      ]);

      if (capped) {
        toast.warning(
          `Export capped at ${limit} rows — ${matched} orders match these filters. Narrow the filters to reach the rest.`,
        );
      } else {
        toast.success(`Exported ${rows.length} order(s).`);
      }
    } catch (err) {
      handleError(err, "Export failed. Please retry.");
    } finally {
      setExporting(false);
    }
  }

  async function exportLeads() {
    setExporting(true);
    try {
      const {
        leads: rows,
        matched,
        limit,
        capped,
      } = await exportLeadsFn({
        data: { token, search: debouncedLeadSearch, date: leadDate, tz_offset: localTzOffset() },
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
      if (capped) {
        toast.warning(
          `Export capped at ${limit} rows — ${matched} leads match these filters. Narrow the filters to reach the rest.`,
        );
      } else {
        toast.success(`Exported ${rows.length} lead(s).`);
      }
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
                Saubhagya Voter Slip · Operations Console
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
        <section className="grid grid-cols-8 gap-4">
          <Kpi label="Total Orders" value={kpis.total} tone="navy" />
          <Kpi label="Paid Orders" value={kpis.paid} tone="emerald" />
          <Kpi label="Pending Payments" value={kpis.pending} tone="orange" />
          <Kpi label="Revenue" value={formatInr(kpis.revenue)} tone="emerald" />
          <Kpi label="Sample Requests" value={kpis.samples} tone="blue" />
          <Kpi label="Captured IPs / Leads" value={kpis.leads} tone="purple" />
          <Kpi label="Referral Orders" value={kpis.referral_orders} tone="purple" />
          <Kpi
            label="Commission Payable"
            value={formatInr(kpis.commission_payable)}
            tone="purple"
          />
        </section>

        <Tabs defaultValue="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="processing">Processing & PCs</TabsTrigger>
              <TabsTrigger value="leads">
                <Users className="mr-1.5 size-4" /> Visitor &amp; Lead Tracker
              </TabsTrigger>
              <TabsTrigger value="samples">
                <Gift className="mr-1.5 size-4" /> Sample Requests
              </TabsTrigger>
              <TabsTrigger value="geography">
                <MapPin className="mr-1.5 size-4" /> Geography Data
              </TabsTrigger>
              <TabsTrigger value="symbols">
                <Vote className="mr-1.5 size-4" /> Party &amp; Symbols
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="mr-1.5 size-4" /> Payment Settings
              </TabsTrigger>
              <TabsTrigger value="referrals">
                <Share2 className="mr-1.5 size-4" /> Referrals
              </TabsTrigger>
              <TabsTrigger value="blocked">
                <ShieldAlert className="mr-1.5 size-4" /> Blocked
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
              <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
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
              <Select
                value={paymentStatus}
                onValueChange={(v) => setPaymentStatus(v as PaymentStatus | "all")}
              >
                <SelectTrigger className="h-10 w-[210px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment states</SelectItem>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PAYMENT_STATUS_LABELS[s]}
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
                  setPaymentStatus("all");
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
                      <col className="w-[40px]" />
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
                      <col className="w-[190px]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]">
                      <tr>
                        <th className="px-3 py-2">
                          <Checkbox
                            checked={allOnPageSelected}
                            onCheckedChange={() => togglePage()}
                            aria-label="Select all orders on this page"
                          />
                        </th>
                        {[
                          "Order ID",
                          "Date / Time",
                          "Candidate",
                          "Location",
                          "Symbol",
                          "Phone",
                          "IP",
                          "Referred By",
                          "Photo",
                          "Status",
                          "Payment",
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
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={selectedSet.has(o.order_id)}
                              onCheckedChange={() => toggleOne(o.order_id)}
                              aria-label={`Select ${o.order_id}`}
                            />
                          </td>
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
                            <p className="truncate font-medium" title={o.candidate_name_hindi}>
                              {o.candidate_name_hindi}
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
                          <td className="px-3 py-2 text-xs">
                            {o.referral_code ? (
                              <button
                                type="button"
                                onClick={() => void openAssign(o)}
                                title={o.referral_partner_name ?? o.referral_code}
                                className="font-mono font-semibold text-navy underline-offset-2 hover:underline"
                              >
                                {o.referral_code}
                              </button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void openAssign(o)}
                              >
                                Assign
                              </Button>
                            )}
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
                                  alt={`${o.candidate_name_hindi} photo`}
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
                            <div className="flex items-center gap-1">
                              <Select
                                value={o.payment_status}
                                onValueChange={(v) =>
                                  void changePaymentStatus(o, v as PaymentStatus)
                                }
                              >
                                <SelectTrigger
                                  title={`Change payment status for ${o.order_id}`}
                                  className={cn(
                                    "h-8 w-[150px] border text-xs font-semibold",
                                    paymentClass(o.payment_status),
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {PAYMENT_STATUS_LABELS[s]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
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
                                  o.status === "Delivered"
                                    ? "Already delivered"
                                    : `Mark ${o.order_id} delivered`
                                }
                                aria-label={`Mark ${o.order_id} delivered`}
                                disabled={o.status === "Delivered"}
                                onClick={() => void changeStatus(o, "Delivered")}
                              >
                                <CheckCircle2 className="size-4 text-success" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title={`Mark payment paid for ${o.order_id}`}
                                aria-label={`Mark payment paid for ${o.order_id}`}
                                disabled={o.payment_status === "PAID"}
                                onClick={() => void changePaymentStatus(o, "PAID")}
                              >
                                <ShieldCheck className="size-4 text-success" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title={`Mark ${o.order_id} payment refunded`}
                                aria-label={`Mark ${o.order_id} payment refunded`}
                                disabled={o.payment_status === "REFUNDED"}
                                onClick={() => void changePaymentStatus(o, "REFUNDED")}
                              >
                                <ShieldAlert className="size-4 text-destructive" />
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
                <div className="flex items-center gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="tabular-nums">
                    Page {page} / {pageCount}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || page >= pageCount}
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
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={clearingLeads || !leadTotal}
                onClick={() => setConfirmClear(true)}
              >
                <Eraser className="size-4" /> Clear IP logs
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
                <div className="relative max-h-[calc(100vh-24rem)] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <colgroup>
                      <col className="w-[150px]" />
                      <col className="w-[160px]" />
                      <col className="w-[140px]" />
                      <col className="w-[130px]" />
                      <col className="w-[130px]" />
                      <col className="w-[130px]" />
                      <col className="w-[110px]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]">
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
                          <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr
                          key={l.id}
                          className="border-t border-border/70 transition-colors hover:bg-saffron/[0.06]"
                        >
                          <td className="px-3 py-2 text-xs" title={l.ip_address ?? undefined}>
                            <span className="block truncate">{l.ip_address ?? "—"}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                            {formatDateTime(l.visited_at)}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium tabular-nums">
                            {l.phone ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] font-semibold",
                                leadTypeClass(l.lead_type),
                              )}
                            >
                              {leadTypeLabel(l.lead_type)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] font-semibold", leadStatusClass(l.status))}
                            >
                              {l.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs font-semibold text-navy">
                            {l.order_id ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-0.5">
                              {telLink(l.phone) ? (
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="size-8"
                                  title={`Call ${l.phone}`}
                                >
                                  <a href={telLink(l.phone)!} aria-label={`Call ${l.phone}`}>
                                    <Phone className="size-4" />
                                  </a>
                                </Button>
                              ) : null}
                              {waLink(l.phone) ? (
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="size-8"
                                  title={`WhatsApp ${l.phone}`}
                                >
                                  <a
                                    href={waLink(l.phone)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`WhatsApp ${l.phone}`}
                                  >
                                    <MessageCircle className="size-4 text-success" />
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                title="Delete this IP log entry"
                                aria-label="Delete this IP log entry"
                                onClick={() => setPendingLeadDelete(l)}
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

            {leadTotal > PAGE_SIZE ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(leadPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(leadPage * PAGE_SIZE, leadTotal)} of {leadTotal}
                </span>
                <div className="flex items-center gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || leadPage === 1}
                    onClick={() => setLeadPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="tabular-nums">
                    Page {leadPage} / {leadPageCount}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || leadPage >= leadPageCount}
                    onClick={() => setLeadPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="symbols">
            <SymbolsTab token={token} onError={handleError} />
          </TabsContent>

          <TabsContent value="geography">
            <GeographyTab token={token} onError={handleError} />
          </TabsContent>

          <TabsContent value="samples">
            <SampleRequestsTab token={token} onError={handleError} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSettingsTab token={token} onError={handleError} />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralTab token={token} onError={handleError} />
          </TabsContent>

          <TabsContent value="blocked">
            <BlockedTab token={token} onError={handleError} />
          </TabsContent>

          <TabsContent value="processing">
            <ProcessingTab token={token} />
          </TabsContent>
        </Tabs>

        <Dialog open={!!assign} onOpenChange={(open) => (open ? null : setAssign(null))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Map a referral partner</DialogTitle>
              <DialogDescription>
                {assign
                  ? `${assign.order_id} · commission is calculated from the partner's current terms.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[320px] space-y-1 overflow-auto">
              {assignPartners.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void saveAssignment(p.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span>
                    <span className="font-mono font-semibold">{p.partner_code}</span> {p.full_name}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.district ?? ""}</span>
                </button>
              ))}
              {assignPartners.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No partners available.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssign(null)}>
                Cancel
              </Button>
              {assign?.referral_code ? (
                <Button variant="destructive" onClick={() => void saveAssignment(null)}>
                  Remove referral
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              alt={`${preview.candidate_name_hindi} candidate photo`}
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
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Order {detail?.order_id}</span>
              {detail ? (
                <Badge
                  variant="outline"
                  className={cn("text-[11px] font-semibold", statusClass(detail.status))}
                >
                  {detail.status}
                </Badge>
              ) : null}
              {detail?.photo_slip ? (
                <Badge variant="outline" className="text-[11px] font-semibold text-primary">
                  फ़ोटो पर्ची (Ph)
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {detail ? formatDateTime(detail.created_at) : null}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                {detail.photo_url ? (
                  <button
                    type="button"
                    onClick={() => setPreview(detail)}
                    title="Open full-size photo"
                    className="block w-full overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <img
                      src={detail.photo_url}
                      alt={`${detail.candidate_name_hindi} candidate photo`}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="grid aspect-[3/4] w-full place-items-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground">
                    <ImageOff className="size-6" />
                    <span className="text-xs">No photo uploaded</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={busyPhoto || !detail.photo_path}
                  onClick={() => void download(detail)}
                >
                  {busyPhoto ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}{" "}
                  Download photo
                </Button>
                {detail.voter_photo_pdf_path ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={busyVoterPdf}
                    onClick={() => void downloadVoterPdf(detail)}
                  >
                    {busyVoterPdf ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileText className="size-4" />
                    )}{" "}
                    Download Voter List PDF
                  </Button>
                ) : null}
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Order ID", detail.order_id],
                  ["Created", formatDateTime(detail.created_at)],
                  ["प्रत्याशी (हिंदी)", detail.candidate_name_hindi],
                  ["Phone", detail.contact_number],
                  [
                    "पद (Post)",
                    detail.pad && detail.pad in PAD_LABELS
                      ? PAD_LABELS[detail.pad as Pad].hi
                      : "—",
                  ],
                  ["District", detail.district],
                  ["Panchayat Samiti", detail.panchayat_samiti],
                  ["Gram Panchayat", detail.gram_panchayat],
                  ["Ward Number", detail.ward_number],
                  [
                    "भाग (Booths)",
                    detail.booth_snapshots?.length
                      ? detail.booth_snapshots.map((b) => b.booth_number).join(", ")
                      : "पूरा वार्ड",
                  ],
                  ["Election Symbol", detail.election_symbol],
                  [
                    "Design",
                    detail.design_code && isDesignCode(detail.design_code)
                      ? `${DESIGN_META[detail.design_code].label} (${DESIGN_META[detail.design_code].series})`
                      : (detail.design_code ?? "—"),
                  ],
                  [
                    "Voter Count",
                    detail.voter_count == null ? "—" : detail.voter_count.toLocaleString("en-IN"),
                  ],
                  ["Order Amount", formatInr(detail.amount)],
                  ["IP Address", detail.ip_address ?? "—"],
                  ["Status", detail.status],
                  ["Party", detail.party_name_snapshot ?? "—"],
                  ["Symbol", detail.symbol_name_snapshot ?? "—"],
                  [
                    "Payment Status",
                    PAYMENT_STATUS_LABELS[detail.payment_status as PaymentStatus] ??
                      detail.payment_status,
                  ],
                  [
                    "Payment Method",
                    detail.payment_method
                      ? (PAYMENT_METHOD_LABELS[detail.payment_method as PaymentMethod] ??
                        detail.payment_method)
                      : "—",
                  ],
                  ["Payment Txn ID", detail.payment_txn_id ?? "—"],
                  [
                    "Payment Amount",
                    detail.payment_amount == null ? "—" : `₹${detail.payment_amount}`,
                  ],
                  [
                    "Payment Updated",
                    detail.payment_updated_at ? formatDateTime(detail.payment_updated_at) : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-0.5 break-words font-medium">{value}</dd>
                  </div>
                ))}
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Slogan
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium">
                    {detail.slogan?.trim() ? detail.slogan : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-start">
            {detail && telLink(detail.contact_number) ? (
              <Button asChild variant="outline">
                <a href={telLink(detail.contact_number)!}>
                  <Phone className="size-4" /> Call {detail.contact_number}
                </a>
              </Button>
            ) : null}
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

      {/* Lead row delete */}
      <AlertDialog
        open={Boolean(pendingLeadDelete)}
        onOpenChange={(open) => !open && setPendingLeadDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this IP log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the visitor/lead record ({pendingLeadDelete?.ip_address ?? "unknown IP"}
              ). Orders are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmLeadDelete();
              }}
            >
              Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all IP logs */}
      <AlertDialog
        open={confirmClear}
        onOpenChange={(open) => !open && !clearingLeads && setConfirmClear(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear every IP log?</AlertDialogTitle>
            <AlertDialogDescription>
              All {leadTotal} visitor and lead records will be permanently deleted. Orders and
              candidate data are not affected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingLeads}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={clearingLeads}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmClearLeads();
              }}
            >
              {clearingLeads ? <Loader2 className="size-4 animate-spin" /> : null} Clear all logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
