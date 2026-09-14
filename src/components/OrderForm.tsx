import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ImageUp,
  LayoutGrid,
  ListChecks,
  Loader2,
  MapPin,
  MessageCircle,
  Trash2,
  User,
  Vote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { captureLeadPhone, createOrder, recordVisit } from "@/lib/orders.functions";
import { LIST_OPTIONS, type ListOption } from "@/lib/orders.schema";
import { listActiveSymbols } from "@/lib/catalog.functions";
import { readReferral, storeReferral } from "@/lib/referral";
import { resolveReferralPartner } from "@/lib/referral.functions";
import {
  getPublicPricing,
  listDistricts,
  listGramPanchayats,
  listSamitis,
  listWards,
} from "@/lib/geo.functions";
import type { PublicSymbol } from "@/lib/catalog.schema";
import { buildWhatsAppUrl } from "@/lib/campaign";
import { DESIGN_CODES, computeAmount, formatInr, type DesignCode } from "@/lib/pricing";
import { compareWardNumbers } from "@/lib/csv";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHONE_RE = /^[6-9]\d{9}$/;

type ErrorKey = "district" | "samiti" | "gp" | "ward" | "contact_number" | "design" | "photo";

const LIST_LABELS: Record<ListOption, TKey> = {
  slip: "list.slip",
  hindi_alpha: "list.hindi_alpha",
  english_alpha: "list.english_alpha",
  family: "list.family",
};

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-navy sm:text-lg">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
        {hint ? <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Reference card metadata, mapped in order onto the stored codes D1–D8. */
type DesignMeta = {
  label: string;
  desc: string;
  spec: string;
  rows: number;
  cols: number;
  ad?: "top" | "left" | "right";
  symbol?: "left" | "right";
};
const DESIGN_META: Record<DesignCode, DesignMeta> = {
  D1: { label: "P-16", desc: "16 स्लिप, बिना विज्ञापन (चौड़ा पेपर)", spec: "16 स्लिप/पेज · 4×4 · चौड़ा पेपर · सादा", rows: 4, cols: 4 },
  D2: { label: "P-12", desc: "12 स्लिप, बिना विज्ञापन", spec: "12 स्लिप/पेज · 2×6 · सादा", rows: 6, cols: 2 },
  D3: { label: "SR-10", desc: "10 स्लिप, चुनाव चिन्ह दाईं ओर", spec: "10 स्लिप/पेज · 2×5 · चुनाव चिन्ह", rows: 5, cols: 2, symbol: "right" },
  D4: { label: "SL-10", desc: "10 स्लिप, चुनाव चिन्ह बाईं ओर", spec: "10 स्लिप/पेज · 2×5 · चुनाव चिन्ह", rows: 5, cols: 2, symbol: "left" },
  D5: { label: "AT-9", desc: "9 स्लिप, विज्ञापन ऊपर", spec: "9 स्लिप/पेज · 3×3 · विज्ञापन", rows: 3, cols: 3, ad: "top" },
  D6: { label: "AT-8", desc: "8 स्लिप, विज्ञापन ऊपर", spec: "8 स्लिप/पेज · 2×4 · विज्ञापन", rows: 4, cols: 2, ad: "top" },
  D7: { label: "AL-8", desc: "8 स्लिप, विज्ञापन बाईं ओर", spec: "8 स्लिप/पेज · 1×8 · विज्ञापन", rows: 8, cols: 1, ad: "left" },
  D8: { label: "AR-8", desc: "8 स्लिप, विज्ञापन दाईं ओर", spec: "8 स्लिप/पेज · 1×8 · विज्ञापन", rows: 8, cols: 1, ad: "right" },
};

/** Miniature wireframe reflecting each design's slot grid and ad/symbol placement. */
function DesignPreview({ meta }: { meta: DesignMeta }) {
  const slots = Array.from({ length: meta.rows * meta.cols });
  const adBand = <span className="block rounded-sm bg-saffron/60" aria-hidden />;
  const grid = (
    <div
      className="grid flex-1 gap-[2px]"
      style={{ gridTemplateRows: `repeat(${meta.rows}, minmax(0,1fr))`, gridTemplateColumns: `repeat(${meta.cols}, minmax(0,1fr))` }}
    >
      {slots.map((_, i) => (
        <span key={i} className="flex items-center gap-px rounded-[2px] border border-navy/20 bg-background px-px">
          {meta.symbol === "left" ? <span className="size-[3px] shrink-0 rounded-full bg-saffron/70" /> : null}
          <span className="h-[2px] flex-1 rounded-full bg-navy/25" />
          {meta.symbol === "right" ? <span className="size-[3px] shrink-0 rounded-full bg-saffron/70" /> : null}
        </span>
      ))}
    </div>
  );
  return (
    <div className="flex aspect-[3/4] w-full gap-[2px] rounded-md border border-border bg-muted/40 p-1" aria-hidden>
      {meta.ad === "left" ? <div className="w-2 shrink-0">{adBand}</div> : null}
      {meta.ad === "top" ? (
        <div className="flex flex-1 flex-col gap-[2px]">
          <span className="block h-1.5 shrink-0 rounded-sm bg-saffron/60" />
          {grid}
        </div>
      ) : (
        grid
      )}
      {meta.ad === "right" ? <div className="w-2 shrink-0">{adBand}</div> : null}
    </div>
  );
}

export function OrderForm() {
  const { t } = useI18n();
  const visit = useServerFn(recordVisit);
  const capture = useServerFn(captureLeadPhone);
  const submitOrder = useServerFn(createOrder);
  const fetchSymbols = useServerFn(listActiveSymbols);
  const fetchDistricts = useServerFn(listDistricts);
  const fetchSamitis = useServerFn(listSamitis);
  const fetchGps = useServerFn(listGramPanchayats);
  const fetchWards = useServerFn(listWards);
  const fetchPricing = useServerFn(getPublicPricing);

  // Section 1 — area, chosen only through the master-data hierarchy.
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [samitiId, setSamitiId] = useState<string | null>(null);
  const [gpId, setGpId] = useState<string | null>(null);
  const [wardIds, setWardIds] = useState<string[]>([]);
  const [wardOpen, setWardOpen] = useState(false);

  // Section 2 — optional slip details.
  const [bodyName, setBodyName] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [contact, setContact] = useState("");
  const [evmSerial, setEvmSerial] = useState("");
  const [pollDate, setPollDate] = useState("");
  const [slogan, setSlogan] = useState("");
  const [symbol, setSymbol] = useState<PublicSymbol | null>(null);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Section 3 / 4.
  const [design, setDesign] = useState<DesignCode | "">("");
  // All four list options start selected; the candidate can uncheck any.
  const [lists, setLists] = useState<ListOption[]>([...LIST_OPTIONS]);

  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string | undefined>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    orderId: string;
    amount: number | null;
    voterCount: number | null;
  } | null>(null);

  const [referralName, setReferralName] = useState<string | null>(null);

  const ipRef = useRef<string | null>(null);
  const leadIdRef = useRef<string | null>(null);
  const capturedPhoneRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const symbolsQuery = useQuery({
    queryKey: ["public-symbols"],
    queryFn: () => fetchSymbols(),
    staleTime: 30_000,
  });
  const symbols = symbolsQuery.data?.symbols ?? [];

  const pricingQuery = useQuery({
    queryKey: ["public-pricing"],
    queryFn: () => fetchPricing(),
    staleTime: 60_000,
  });
  const rate = pricingQuery.data?.rate_per_voter ?? null;

  const districtsQuery = useQuery({
    queryKey: ["geo-districts"],
    queryFn: () => fetchDistricts(),
    staleTime: 300_000,
  });
  const districts = districtsQuery.data?.options ?? [];

  const samitisQuery = useQuery({
    queryKey: ["geo-samitis", districtId],
    queryFn: () => fetchSamitis({ data: { district_id: districtId! } }),
    enabled: Boolean(districtId),
  });
  const gpsQuery = useQuery({
    queryKey: ["geo-gps", samitiId],
    queryFn: () => fetchGps({ data: { samiti_id: samitiId! } }),
    enabled: Boolean(samitiId),
  });
  const wardsQuery = useQuery({
    queryKey: ["geo-wards", gpId],
    queryFn: () => fetchWards({ data: { gram_panchayat_id: gpId! } }),
    enabled: Boolean(gpId),
  });

  const label = (row: { name: string; name_hindi: string | null } | undefined) =>
    row?.name_hindi || row?.name || "";

  const selectedDistrict = districts.find((d) => d.id === districtId);
  const selectedSamiti = (samitisQuery.data?.options ?? []).find((s) => s.id === samitiId);
  const selectedGp = (gpsQuery.data?.options ?? []).find((g) => g.id === gpId);
  const wardOptions = useMemo(
    () =>
      [...(wardsQuery.data?.options ?? [])].sort((a, b) =>
        compareWardNumbers(a.ward_number, b.ward_number),
      ),
    [wardsQuery.data],
  );
  const selectedWards = useMemo(
    () => wardOptions.filter((w) => wardIds.includes(w.id)),
    [wardOptions, wardIds],
  );
  const totalVoters = selectedWards.reduce((sum, w) => sum + w.voter_count, 0);
  const estimatedAmount =
    selectedWards.length && rate != null ? computeAmount(totalVoters, rate) : null;
  const wardNumbersLabel = selectedWards.map((w) => w.ward_number).join(", ");
  const noGeoData = !districtsQuery.isLoading && districts.length === 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let ip: string | null = null;
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const json = (await res.json()) as { ip?: string };
        ip = json.ip ?? null;
      } catch {
        ip = null;
      }
      if (cancelled) return;
      ipRef.current = ip;
      try {
        const result = await visit({ data: { ip_address: ip } });
        if (!cancelled) leadIdRef.current = result.lead_id;
      } catch {
        /* tracking is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit]);

  useEffect(() => {
    const phone = contact.trim();
    if (!PHONE_RE.test(phone)) return;
    if (capturedPhoneRef.current === phone) return;
    const timer = setTimeout(async () => {
      capturedPhoneRef.current = phone;
      try {
        const result = await capture({
          data: { lead_id: leadIdRef.current, ip_address: ipRef.current, phone },
        });
        leadIdRef.current = result.lead_id;
      } catch {
        capturedPhoneRef.current = null;
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [contact, capture]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function onPickPhoto(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((p) => ({ ...p, photo: t("err.photo.type") }));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((p) => ({ ...p, photo: t("err.photo.size") }));
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, photo: undefined }));
  }

  function validate() {
    const next: Partial<Record<ErrorKey, string | undefined>> = {};
    if (!districtId) next.district = t("err.required.district");
    if (!samitiId) next.samiti = t("err.required.samiti");
    if (!gpId) next.gp = t("err.required.gp");
    if (!wardIds.length) next.ward = t("err.required.ward");
    if (!PHONE_RE.test(contact.trim())) next.contact_number = t("err.phone");
    if (!design) next.design = t("err.required.design");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function waUrl() {
    return buildWhatsAppUrl({
      order_id: success?.orderId ?? "",
      candidate_name_hindi: nameHi.trim(),
      candidate_name_english: nameEn.trim(),
      gram_panchayat: label(selectedGp),
      panchayat_samiti: label(selectedSamiti),
      ward_number: wardNumbersLabel,
      district: label(selectedDistrict),
      election_symbol: symbol ? `${symbol.party_name} — ${symbol.symbol_name}` : "",
      slogan: slogan.trim(),
      contact_number: contact.trim(),
      design_code: design || null,
      voter_count: success?.voterCount ?? null,
      amount: success?.amount ?? null,
      payment_status: "PENDING",
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) {
      toast.error(t("err.form"));
      document.querySelector<HTMLElement>("[data-invalid='true']")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      let photoPath: string | null = null;
      if (photo) {
        const ext = photo.type === "image/png" ? "png" : "jpg";
        photoPath = `orders/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("candidate-photos")
          .upload(photoPath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
      }

      const result = await submitOrder({
        data: {
          candidate_name_hindi: nameHi.trim(),
          candidate_name_english: nameEn.trim(),
          contact_number: contact.trim(),
          district: label(selectedDistrict),
          panchayat_samiti: label(selectedSamiti),
          gram_panchayat: label(selectedGp),
          ward_number: wardNumbersLabel,
          ward_id: wardIds[0] ?? null,
          ward_ids: wardIds,
          design_code: design as DesignCode,
          election_symbol: symbol ? `${symbol.party_name} — ${symbol.symbol_name}` : "",
          election_symbol_id: symbol?.id ?? null,
          party_name_snapshot: symbol?.party_name ?? null,
          symbol_name_snapshot: symbol?.symbol_name ?? null,
          slogan: slogan.trim() || null,
          body_name: bodyName.trim() || null,
          evm_serial: evmSerial.trim() || null,
          poll_date: pollDate.trim() || null,
          list_options: lists,
          photo_path: photoPath,
          ip_address: ipRef.current,
          user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400),
          lead_id: leadIdRef.current,
        },
      });

      setSuccess({
        orderId: result.order_id,
        amount: result.amount,
        voterCount: result.voter_count,
      });
      toast.success(`${t("success.toast")} — ${result.order_id}`);
    } catch (error) {
      console.error(error);
      toast.error(t("err.submit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {/* SECTION 1 — क्षेत्र चुनें */}
        <Section icon={MapPin} title={t("form.section.area")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="district" label={t("form.district")} required error={errors.district}>
              <Select
                value={districtId ?? ""}
                onValueChange={(value) => {
                  setDistrictId(value);
                  setSamitiId(null);
                  setGpId(null);
                  setWardIds([]);
                  setErrors((p) => ({ ...p, district: undefined }));
                }}
              >
                <SelectTrigger id="district" className="h-12 text-base">
                  <SelectValue placeholder={t("form.district.ph")} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name_hindi || d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="panchayat_samiti" label={t("form.samiti")} required error={errors.samiti}>
              <Select
                value={samitiId ?? ""}
                disabled={!districtId}
                onValueChange={(value) => {
                  setSamitiId(value);
                  setGpId(null);
                  setWardIds([]);
                  setErrors((p) => ({ ...p, samiti: undefined }));
                }}
              >
                <SelectTrigger id="panchayat_samiti" className="h-12 text-base">
                  <SelectValue placeholder={t("form.samiti.ph")} />
                </SelectTrigger>
                <SelectContent>
                  {(samitisQuery.data?.options ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_hindi || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="gram_panchayat" label={t("form.gp")} required error={errors.gp}>
              <Select
                value={gpId ?? ""}
                disabled={!samitiId}
                onValueChange={(value) => {
                  setGpId(value);
                  setWardIds([]);
                  setErrors((p) => ({ ...p, gp: undefined }));
                }}
              >
                <SelectTrigger id="gram_panchayat" className="h-12 text-base">
                  <SelectValue placeholder={t("form.gp.ph")} />
                </SelectTrigger>
                <SelectContent>
                  {(gpsQuery.data?.options ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name_hindi || g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="ward_number"
              label={t("form.ward")}
              hint={t("form.ward.multi")}
              required
              error={errors.ward}
            >
              <Popover open={wardOpen} onOpenChange={setWardOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="ward_number"
                    type="button"
                    role="combobox"
                    aria-expanded={wardOpen}
                    disabled={!gpId}
                    className="flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 truncate">
                      {selectedWards.length ? (
                        wardNumbersLabel
                      ) : (
                        <span className="text-muted-foreground">{t("form.ward.ph")}</span>
                      )}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(92vw,22rem)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("form.ward.search")} />
                    <div className="flex gap-2 border-b border-border p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setWardIds(wardOptions.map((w) => w.id));
                          setErrors((p) => ({ ...p, ward: undefined }));
                        }}
                      >
                        {t("form.ward.selectall")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        onClick={() => setWardIds([])}
                      >
                        {t("form.ward.clear")}
                      </Button>
                    </div>
                    <CommandList>
                      <CommandEmpty>{t("form.ward.empty")}</CommandEmpty>
                      <CommandGroup>
                        {wardOptions.map((w) => {
                          const checked = wardIds.includes(w.id);
                          return (
                            <CommandItem
                              key={w.id}
                              value={`ward ${w.ward_number}`}
                              onSelect={() => {
                                setWardIds((prev) =>
                                  prev.includes(w.id)
                                    ? prev.filter((id) => id !== w.id)
                                    : [...prev, w.id],
                                );
                                setErrors((p) => ({ ...p, ward: undefined }));
                              }}
                              className="gap-3 py-3"
                            >
                              <Checkbox checked={checked} className="pointer-events-none" />
                              <span className="flex-1 font-semibold">{w.ward_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {w.voter_count.toLocaleString("en-IN")}
                              </span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>
          </div>

          {noGeoData ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive">
              {t("form.data.empty")}
            </p>
          ) : null}

          {selectedWards.length ? (
            <div className="space-y-2 rounded-xl border border-saffron/30 bg-saffron/5 p-3">
              <p className="text-sm font-bold text-navy">
                {t("form.ward.selected")}: {selectedWards.length} · {t("form.voters.total")}:{" "}
                {totalVoters.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("form.area.summary")}: {label(selectedDistrict)} › {label(selectedSamiti)} ›{" "}
                {label(selectedGp)} › {t("form.ward")} {wardNumbersLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("form.rate")}: {rate == null ? "—" : formatInr(rate)} · {t("form.amount")}:{" "}
                <span className="font-semibold text-saffron-deep">{formatInr(estimatedAmount)}</span>
              </p>
            </div>
          ) : null}
        </Section>

        {/* SECTION 2 — वैकल्पिक जानकारी */}
        <Section icon={User} title={t("form.section.optional")} hint={t("form.optional.note")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="body_name" label={t("form.body_name")}>
              <Input
                id="body_name"
                value={bodyName}
                onChange={(e) => setBodyName(e.target.value)}
                placeholder={t("form.body_name.ph")}
                className="h-12 text-base"
              />
            </Field>

            <Field id="ward_auto" label={t("form.ward.auto")}>
              <Input
                id="ward_auto"
                readOnly
                value={wardNumbersLabel}
                placeholder="—"
                className="h-12 bg-muted/50 text-base"
              />
            </Field>

            <Field id="candidate_name_hindi" label={t("form.name_hi")}>
              <Input
                id="candidate_name_hindi"
                value={nameHi}
                onChange={(e) => setNameHi(e.target.value)}
                placeholder={t("form.name_hi.ph")}
                className="h-12 text-base"
              />
            </Field>

            <Field id="candidate_name_english" label={t("form.name_en")}>
              <Input
                id="candidate_name_english"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("form.name_en.ph")}
                className="h-12 text-base"
              />
            </Field>

            <Field
              id="contact_number"
              label={t("form.phone")}
              hint={t("form.phone.hint")}
              required
              error={errors.contact_number}
            >
              <Input
                id="contact_number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="99833 33119"
                value={contact}
                aria-invalid={Boolean(errors.contact_number)}
                data-invalid={errors.contact_number ? "true" : undefined}
                onChange={(e) => {
                  setContact(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setErrors((p) => ({ ...p, contact_number: undefined }));
                }}
                className={cn("h-12 text-base", errors.contact_number && "border-destructive")}
              />
            </Field>

            <Field id="election_symbol" label={t("form.symbol")} hint={t("form.symbol.hint")}>
              <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="election_symbol"
                    type="button"
                    role="combobox"
                    aria-expanded={symbolOpen}
                    className="flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {symbol ? (
                      <span className="flex min-w-0 items-center gap-2">
                        {symbol.image_url ? (
                          <img
                            src={symbol.image_url}
                            alt=""
                            className="size-7 shrink-0 rounded border border-border object-contain"
                          />
                        ) : null}
                        <span className="min-w-0 truncate">
                          <span className="font-semibold">{symbol.party_name}</span>
                          <span className="text-muted-foreground"> — {symbol.symbol_name}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {symbolsQuery.isLoading ? t("form.symbol.loading") : t("form.symbol.placeholder")}
                      </span>
                    )}
                    <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(92vw,26rem)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("form.symbol.search")} />
                    <CommandList>
                      <CommandEmpty>{t("form.symbol.empty")}</CommandEmpty>
                      <CommandGroup>
                        {symbols.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.party_name} ${s.symbol_name}`}
                            onSelect={() => {
                              setSymbol(s);
                              setSymbolOpen(false);
                            }}
                            className="gap-3 py-3"
                          >
                            {s.image_url ? (
                              <img
                                src={s.image_url}
                                alt=""
                                loading="lazy"
                                className="size-8 shrink-0 rounded border border-border object-contain"
                              />
                            ) : (
                              <span className="grid size-8 shrink-0 place-items-center rounded border border-border text-muted-foreground">
                                <Vote className="size-4" />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{s.party_name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{s.symbol_name}</span>
                            </span>
                            {symbol?.id === s.id ? <Check className="size-4 text-success" /> : null}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>

            <Field id="evm_serial" label={t("form.evm")}>
              <Input
                id="evm_serial"
                inputMode="numeric"
                value={evmSerial}
                onChange={(e) => setEvmSerial(e.target.value.slice(0, 20))}
                placeholder={t("form.evm.ph")}
                className="h-12 text-base"
              />
            </Field>

            <Field id="poll_date" label={t("form.polldate")}>
              <Input
                id="poll_date"
                type="date"
                value={pollDate}
                onChange={(e) => setPollDate(e.target.value)}
                className="h-12 text-base"
              />
            </Field>
          </div>

          <Field id="slogan" label={t("form.slogan")} hint={t("form.slogan.hint")}>
            <Textarea
              id="slogan"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              maxLength={200}
              rows={2}
              className="text-base"
            />
          </Field>

          <Field id="photo" label={t("form.photo")} hint={t("form.photo.hint")} error={errors.photo}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                id="photo"
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex min-h-14 flex-1 items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 px-5 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-saffron hover:bg-saffron/5 hover:text-saffron-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  errors.photo && "border-destructive text-destructive",
                )}
              >
                <ImageUp className="size-5" />
                {photo ? t("form.photo.change") : t("form.photo.pick")}
              </button>
              {photoPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={photoPreview}
                    alt=""
                    className="size-20 rounded-xl border border-border object-cover shadow-card"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("form.photo.remove")}
                    onClick={() => {
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhoto(null);
                      setPhotoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </Field>
        </Section>

        {/* SECTION 3 — 8 designs, two columns of four */}
        <Section icon={LayoutGrid} title={t("form.section.design")} hint={t("form.design.hint")}>
          <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
            {DESIGN_CODES.map((code) => {
              const meta = DESIGN_META[code];
              const active = design === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDesign(code);
                    setErrors((p) => ({ ...p, design: undefined }));
                  }}
                  className={cn(
                    "flex flex-row items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                    active
                      ? "border-saffron bg-saffron/10 shadow-card"
                      : "border-border bg-card hover:border-saffron/50",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <p className="flex items-center gap-1.5">
                      <span className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-black text-navy-foreground">
                        {meta.label}
                      </span>
                      {active ? <Check className="ml-auto size-4 shrink-0 text-success" /> : null}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-snug text-navy">{meta.desc}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.spec}</p>
                  </div>
                  <div className="w-[30%] min-w-[3.5rem] max-w-[5rem] shrink-0">
                    <DesignPreview meta={meta} />
                  </div>
                </button>
              );
            })}
          </div>
          {errors.design ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5" /> {errors.design}
            </p>
          ) : null}
        </Section>

        {/* SECTION 4 — list options */}
        <Section icon={ListChecks} title={t("form.section.lists")} hint={t("form.lists.hint")}>
          <div className="grid gap-2">
            {LIST_OPTIONS.map((option) => {
              const checked = lists.includes(option);
              return (
                <label
                  key={option}
                  htmlFor={`list-${option}`}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors",
                    checked ? "border-saffron bg-saffron/10 text-navy" : "border-border bg-card",
                  )}
                >
                  <Checkbox
                    id={`list-${option}`}
                    checked={checked}
                    onCheckedChange={(value) =>
                      setLists((prev) =>
                        value ? [...prev, option] : prev.filter((item) => item !== option),
                      )
                    }
                  />
                  {t(LIST_LABELS[option])}
                </label>
              );
            })}
          </div>
        </Section>

        <div className="space-y-3 border-t border-border pt-5">
          <Button
            type="submit"
            variant="hero"
            size="xl"
            className="w-full"
            disabled={submitting || noGeoData}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" /> {t("form.submitting")}
              </>
            ) : (
              <>
                <MessageCircle className="size-5" /> {t("form.submit")}
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t("form.footnote")}</p>
        </div>
      </form>

      <Dialog open={Boolean(success)} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="text-center text-xl">{t("success.title")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("success.orderid")}:{" "}
              <span className="font-bold text-saffron-deep">{success?.orderId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <h4 className="text-sm font-bold text-navy">{t("pay.heading")}</h4>
              <dl className="mt-3 space-y-1.5 text-sm">
                {success?.voterCount != null ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("form.voters")}</dt>
                    <dd className="font-medium">{success.voterCount.toLocaleString("en-IN")}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.amount")}</dt>
                  <dd className="font-bold text-saffron-deep">{formatInr(success?.amount ?? null)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.status")}</dt>
                  <dd className="font-medium">{t("pay.pending")}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">{t("pay.soon")}</p>
            </div>

            <Button asChild variant="success" size="lg" className="w-full">
              <a href={waUrl()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> {t("pay.whatsapp")}
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
