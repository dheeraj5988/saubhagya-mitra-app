import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCreatePartner,
  adminExportConversions,
  adminListConversions,
  adminListPartners,
  adminSetConversionStatus,
  adminTogglePartner,
  adminUpdatePartner,
} from "@/lib/admin-referral.functions";
import {
  COMMISSION_TYPES,
  COMMISSION_TYPE_LABELS,
  CONVERSION_STATUSES,
  type AdminConversion,
  type AdminPartnerStats,
  type CommissionType,
  type ConversionStatus,
} from "@/lib/admin-referral.schema";
import { buildPartnerInviteMessage } from "@/lib/campaign";
import { downloadCsv, formatDateTime, waLink } from "@/lib/admin-ui";
import { formatInr } from "@/lib/pricing";

type PartnerForm = {
  id: string | null;
  partner_code: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  district: string;
  notes: string;
  commission_type: CommissionType;
  commission_value: string;
};

const EMPTY_FORM: PartnerForm = {
  id: null,
  partner_code: "",
  full_name: "",
  phone: "",
  whatsapp: "",
  district: "",
  notes: "",
  commission_type: "PERCENT",
  commission_value: "10",
};

function suggestCode(name: string) {
  const base = name
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
  if (base.length < 3) return "";
  return `${base}01`;
}

export function referralLink(code: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/r/${code}`;
}

function commissionLabel(type: string, value: number) {
  if (type === "PERCENT") return `${value}%`;
  if (type === "PER_VOTER") return `${formatInr(value)} / voter`;
  return `${formatInr(value)} / order`;
}

function statusClass(status: string) {
  if (status === "PAID") return "border-success/30 bg-success/12 text-success";
  if (status === "APPROVED") return "border-info/30 bg-info/12 text-info";
  if (status === "REJECTED") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-saffron/30 bg-saffron/12 text-saffron-deep";
}

export function ReferralTab({
  token,
  onError,
}: {
  token: string;
  onError: (err: unknown, fallback: string) => boolean;
}) {
  const listPartners = useServerFn(adminListPartners);
  const createPartner = useServerFn(adminCreatePartner);
  const updatePartner = useServerFn(adminUpdatePartner);
  const togglePartner = useServerFn(adminTogglePartner);
  const listConversions = useServerFn(adminListConversions);
  const setConversionStatus = useServerFn(adminSetConversionStatus);
  const exportConversions = useServerFn(adminExportConversions);

  const [partners, setPartners] = useState<AdminPartnerStats[]>([]);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [loadingPartners, setLoadingPartners] = useState(true);

  const [conversions, setConversions] = useState<AdminConversion[]>([]);
  const [convTotal, setConvTotal] = useState(0);
  const [convPartner, setConvPartner] = useState("all");
  const [convStatus, setConvStatus] = useState<ConversionStatus | "all">("all");
  const [convSearch, setConvSearch] = useState("");
  const [convDebounced, setConvDebounced] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);

  const [form, setForm] = useState<PartnerForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [payout, setPayout] = useState<{ row: AdminConversion; note: string } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setConvDebounced(convSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [convSearch]);

  const loadPartners = useCallback(async () => {
    try {
      const res = await listPartners({ data: { token, search: partnerSearch.trim() } });
      setPartners(res.partners as AdminPartnerStats[]);
    } catch (err) {
      onError(err, "Could not load referral partners.");
    } finally {
      setLoadingPartners(false);
    }
  }, [listPartners, token, partnerSearch, onError]);

  const loadConversions = useCallback(async () => {
    try {
      const res = await listConversions({
        data: {
          token,
          partner_id: convPartner === "all" ? null : convPartner,
          status: convStatus,
          search: convDebounced,
          page: 1,
          page_size: 50,
        },
      });
      setConversions(res.conversions as AdminConversion[]);
      setConvTotal(res.total);
    } catch (err) {
      onError(err, "Could not load referral commissions.");
    } finally {
      setLoadingConv(false);
    }
  }, [listConversions, token, convPartner, convStatus, convDebounced, onError]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);
  useEffect(() => {
    void loadConversions();
  }, [loadConversions]);

  const totals = useMemo(
    () => ({
      payable: partners.reduce((s, p) => s + p.commission_payable, 0),
      pending: partners.reduce((s, p) => s + p.commission_pending, 0),
    }),
    [partners],
  );

  async function savePartner() {
    if (!form) return;
    const value = Number(form.commission_value);
    if (!form.full_name.trim()) {
      toast.error("Partner name is required.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid commission value.");
      return;
    }
    const code = (form.partner_code || suggestCode(form.full_name)).trim();
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(code)) {
      toast.error("Code must be 3-24 letters, digits, - or _.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        token,
        partner_code: code,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        district: form.district.trim(),
        notes: form.notes.trim(),
        commission_type: form.commission_type,
        commission_value: value,
      };
      if (form.id) await updatePartner({ data: { ...payload, id: form.id } });
      else await createPartner({ data: payload });
      toast.success(form.id ? "Partner updated." : "Partner added.");
      setForm(null);
      await loadPartners();
    } catch (err) {
      if (!onError(err, "Could not save the partner.")) {
        toast.error(err instanceof Error ? err.message : "Could not save the partner.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: AdminPartnerStats) {
    const prev = partners;
    setPartners((list) => list.map((r) => (r.id === p.id ? { ...r, active: !r.active } : r)));
    try {
      await togglePartner({ data: { token, id: p.id, active: !p.active } });
    } catch (err) {
      setPartners(prev);
      onError(err, "Could not update the partner.");
    }
  }

  async function changeStatus(row: AdminConversion, status: ConversionStatus, note?: string) {
    try {
      await setConversionStatus({
        data: { token, id: row.id, status, payout_note: note ?? null },
      });
      toast.success(`${row.order_id} → ${status}`);
      await Promise.all([loadConversions(), loadPartners()]);
    } catch (err) {
      if (!onError(err, "Could not update the commission.")) {
        toast.error(err instanceof Error ? err.message : "Could not update the commission.");
      }
    }
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(referralLink(code));
      toast.success("Referral link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function exportCsv() {
    try {
      const res = await exportConversions({
        data: {
          token,
          partner_id: convPartner === "all" ? null : convPartner,
          status: convStatus,
          search: convDebounced,
        },
      });
      downloadCsv("referral-commissions.csv", [
        [
          "Order ID",
          "Date",
          "Candidate",
          "Phone",
          "Partner Code",
          "Partner",
          "Order Amount",
          "Payment Status",
          "Commission",
          "Source",
          "Status",
          "Payout Note",
        ],
        ...res.conversions.map((c) => [
          c.order_id,
          formatDateTime(c.created_at),
          c.candidate_name ?? "",
          c.contact_number ?? "",
          c.partner_code,
          c.partner_name ?? "",
          c.order_amount ?? "",
          c.payment_status ?? "",
          c.commission_amount,
          c.source,
          c.status,
          c.payout_note ?? "",
        ]),
      ]);
      if (res.capped) toast.warning(`Export capped at ${res.limit} of ${res.matched} rows.`);
    } catch (err) {
      onError(err, "Could not export commissions.");
    }
  }

  return (
    <Tabs defaultValue="partners" className="space-y-4">
      <TabsList>
        <TabsTrigger value="partners">Partners</TabsTrigger>
        <TabsTrigger value="conversions">Commissions</TabsTrigger>
      </TabsList>

      {/* PARTNERS */}
      <TabsContent value="partners" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="relative min-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search code, name, phone, district…"
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {partners.length} partner(s) · payable {formatInr(totals.payable)} · pending{" "}
            {formatInr(totals.pending)}
          </span>
          <Button variant="outline" size="sm" onClick={() => void loadPartners()}>
            <RefreshCw className="size-4" /> Reload
          </Button>
          <Button size="sm" variant="navy" onClick={() => setForm({ ...EMPTY_FORM })}>
            <Plus className="size-4" /> Add Partner
          </Button>
        </div>

        <div className="overflow-auto rounded-xl border border-border bg-card shadow-card">
          {loadingPartners ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : partners.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No referral partners yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    "Code",
                    "Name",
                    "Phone",
                    "District",
                    "Commission",
                    "Clicks",
                    "Orders",
                    "Paid Orders",
                    "Total Sales",
                    "Commission Payable",
                    "Active",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partners.map((p) => {
                  const wa = waLink(p.whatsapp || p.phone);
                  return (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2 font-mono text-xs font-semibold">
                        {p.partner_code}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2" title={p.full_name}>
                        {p.full_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{p.phone ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.district ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {commissionLabel(p.commission_type, p.commission_value)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{p.click_count}</td>
                      <td className="px-3 py-2 tabular-nums">{p.order_count}</td>
                      <td className="px-3 py-2 tabular-nums">{p.paid_order_count}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {formatInr(p.total_order_amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-success">
                        {formatInr(p.commission_payable)}
                      </td>
                      <td className="px-3 py-2">
                        <Switch
                          checked={p.active}
                          onCheckedChange={() => void toggle(p)}
                          aria-label={`Toggle ${p.partner_code}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Copy referral link"
                            onClick={() => void copyLink(p.partner_code)}
                          >
                            <Copy className="size-4" />
                          </Button>
                          {wa ? (
                            <Button asChild size="icon" variant="ghost" className="size-8">
                              <a
                                href={`${wa}?text=${encodeURIComponent(
                                  buildPartnerInviteMessage({
                                    full_name: p.full_name,
                                    link: referralLink(p.partner_code),
                                  }),
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Share link on WhatsApp"
                              >
                                <MessageCircle className="size-4 text-success" />
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Edit partner"
                            onClick={() =>
                              setForm({
                                id: p.id,
                                partner_code: p.partner_code,
                                full_name: p.full_name,
                                phone: p.phone ?? "",
                                whatsapp: p.whatsapp ?? "",
                                district: p.district ?? "",
                                notes: p.notes ?? "",
                                commission_type: p.commission_type,
                                commission_value: String(p.commission_value),
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </TabsContent>

      {/* CONVERSIONS */}
      <TabsContent value="conversions" className="space-y-4">
        <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          Commission moves from PENDING to APPROVED automatically when the order&apos;s payment is
          marked PAID.
        </p>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
          <Select value={convPartner} onValueChange={setConvPartner}>
            <SelectTrigger className="h-9 w-[200px] text-xs">
              <SelectValue placeholder="All partners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All partners</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.partner_code} — {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={convStatus}
            onValueChange={(v) => setConvStatus(v as ConversionStatus | "all")}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CONVERSION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search order ID or partner code…"
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">{convTotal} entr(ies)</span>
          <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>

        <div className="overflow-auto rounded-xl border border-border bg-card shadow-card">
          {loadingConv ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : conversions.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No referral commissions yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    "Order ID",
                    "Date",
                    "Candidate",
                    "Phone",
                    "Partner",
                    "Order Amount",
                    "Payment",
                    "Commission",
                    "Source",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conversions.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{c.order_id}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(c.created_at)}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2">{c.candidate_name ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {c.contact_number ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-mono font-semibold">{c.partner_code}</span>
                      <span className="block truncate text-muted-foreground">
                        {c.partner_name ?? ""}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {c.order_amount == null ? "—" : formatInr(c.order_amount)}
                    </td>
                    <td className="px-3 py-2 text-xs">{c.payment_status ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">
                      {formatInr(c.commission_amount)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {c.source}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                          c.status,
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {c.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setPayout({ row: c, note: "" })}
                          >
                            Mark Paid
                          </Button>
                        ) : null}
                        {c.status === "PENDING" || c.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={() => void changeStatus(c, "REJECTED")}
                          >
                            Reject
                          </Button>
                        ) : null}
                        {c.status === "REJECTED" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => void changeStatus(c, "PENDING")}
                          >
                            Revert to Pending
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </TabsContent>

      {/* Partner dialog */}
      <Dialog open={!!form} onOpenChange={(open) => (open ? null : setForm(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit partner" : "Add partner"}</DialogTitle>
            <DialogDescription>
              Changing the commission rate applies to new orders only — commissions already
              recorded keep the rate they were created with.
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            full_name: e.target.value,
                            partner_code:
                              f.id || f.partner_code ? f.partner_code : suggestCode(e.target.value),
                          }
                        : f,
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => (f ? { ...f, whatsapp: e.target.value } : f))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input
                  value={form.district}
                  onChange={(e) => setForm((f) => (f ? { ...f, district: e.target.value } : f))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Partner code</Label>
                <Input
                  value={form.partner_code}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, partner_code: e.target.value.toUpperCase() } : f,
                    )
                  }
                  placeholder="RAJU01"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Commission type</Label>
                <Select
                  value={form.commission_type}
                  onValueChange={(v) =>
                    setForm((f) => (f ? { ...f, commission_type: v as CommissionType } : f))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COMMISSION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Commission value</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.commission_value}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, commission_value: e.target.value } : f))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button variant="navy" disabled={saving} onClick={() => void savePartner()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout dialog */}
      <Dialog open={!!payout} onOpenChange={(open) => (open ? null : setPayout(null))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark commission as paid</DialogTitle>
            <DialogDescription>
              {payout ? `${payout.row.order_id} · ${formatInr(payout.row.commission_amount)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Payout note (optional)</Label>
            <Input
              value={payout?.note ?? ""}
              placeholder="UPI ref, date, remarks…"
              onChange={(e) => setPayout((p) => (p ? { ...p, note: e.target.value } : p))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayout(null)}>
              Cancel
            </Button>
            <Button
              variant="navy"
              onClick={() => {
                const current = payout;
                setPayout(null);
                if (current) void changeStatus(current.row, "PAID", current.note);
              }}
            >
              Mark Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
