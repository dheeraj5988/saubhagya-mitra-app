import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Gift,
  ImageUp,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
  User,
  Vote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  captureLeadPhone,
  createOrder,
  createSampleRequest,
  recordVisit,
} from "@/lib/orders.functions";
import { listActiveSymbols } from "@/lib/catalog.functions";
import {
  getPublicPricing,
  listDistricts,
  listGramPanchayats,
  listSamitis,
  listWards,
} from "@/lib/geo.functions";
import type { PublicSymbol } from "@/lib/catalog.schema";
import { WHATSAPP_NUMBER, buildWhatsAppUrl } from "@/lib/campaign";
import { DESIGN_CODES, computeAmount, formatInr, type DesignCode } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type FormState = {
  candidate_name_hindi: string;
  candidate_name_english: string;
  contact_number: string;
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  slogan: string;
};

const EMPTY: FormState = {
  candidate_name_hindi: "",
  candidate_name_english: "",
  contact_number: "",
  district: "",
  panchayat_samiti: "",
  gram_panchayat: "",
  ward_number: "",
  slogan: "",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHONE_RE = /^[6-9]\d{9}$/;

type ErrorKey = keyof FormState | "photo" | "symbol" | "design";

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

export function OrderForm() {
  const { t } = useI18n();
  const visit = useServerFn(recordVisit);
  const capture = useServerFn(captureLeadPhone);
  const submitOrder = useServerFn(createOrder);
  const submitSample = useServerFn(createSampleRequest);
  const fetchSymbols = useServerFn(listActiveSymbols);
  const fetchDistricts = useServerFn(listDistricts);
  const fetchSamitis = useServerFn(listSamitis);
  const fetchGps = useServerFn(listGramPanchayats);
  const fetchWards = useServerFn(listWards);
  const fetchPricing = useServerFn(getPublicPricing);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [symbol, setSymbol] = useState<PublicSymbol | null>(null);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [design, setDesign] = useState<DesignCode | "">("");
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string | undefined>>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    orderId: string;
    amount: number | null;
    voterCount: number | null;
  } | null>(null);

  // Geography selection ids, only set when master data is available.
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [samitiId, setSamitiId] = useState<string | null>(null);
  const [gpId, setGpId] = useState<string | null>(null);
  const [wardId, setWardId] = useState<string | null>(null);

  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleName, setSampleName] = useState("");
  const [sampleBusy, setSampleBusy] = useState(false);

  const ipRef = useRef<string | null>(null);
  const leadIdRef = useRef<string | null>(null);
  const capturedPhoneRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submittedRef = useRef<FormState | null>(null);

  // Catalog is fetched live, so admin activations/reordering show up without a rebuild.
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
  const sampleVoters = pricingQuery.data?.free_sample_voter_count ?? 24;

  const districtsQuery = useQuery({
    queryKey: ["geo-districts"],
    queryFn: () => fetchDistricts(),
    staleTime: 300_000,
  });
  const districts = districtsQuery.data?.options ?? [];
  // Geography master data is optional: until it is loaded the form keeps
  // accepting typed names so ordering is never blocked.
  const useMasterGeo = districts.length > 0;

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

  const selectedWard = useMemo(
    () => (wardsQuery.data?.options ?? []).find((w) => w.id === wardId) ?? null,
    [wardsQuery.data, wardId],
  );
  const estimatedAmount =
    selectedWard && rate != null ? computeAmount(selectedWard.voter_count, rate) : null;

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

  // Capture partial lead as soon as a valid mobile number is typed.
  useEffect(() => {
    const phone = form.contact_number.trim();
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
  }, [form.contact_number, capture]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

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
    if (!form.candidate_name_hindi.trim()) next.candidate_name_hindi = t("err.required.name_hi");
    if (!form.candidate_name_english.trim()) next.candidate_name_english = t("err.required.name_en");
    if (!PHONE_RE.test(form.contact_number.trim())) next.contact_number = t("err.phone");
    if (!form.district.trim()) next.district = t("err.required.district");
    if (!form.panchayat_samiti.trim()) next.panchayat_samiti = t("err.required.samiti");
    if (!form.gram_panchayat.trim()) next.gram_panchayat = t("err.required.gp");
    if (!form.ward_number.trim()) next.ward_number = t("err.required.ward");
    if (!symbol) next.symbol = t("err.required.symbol");
    if (!design) next.design = t("err.required.design");
    if (!photo) next.photo = t("err.required.photo");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function waUrl() {
    const source = submittedRef.current ?? form;
    return buildWhatsAppUrl({
      order_id: success?.orderId ?? "",
      candidate_name_hindi: source.candidate_name_hindi.trim(),
      candidate_name_english: source.candidate_name_english.trim(),
      gram_panchayat: source.gram_panchayat.trim(),
      panchayat_samiti: source.panchayat_samiti.trim(),
      ward_number: source.ward_number.trim(),
      district: source.district.trim(),
      election_symbol: symbol ? `${symbol.party_name} — ${symbol.symbol_name}` : "",
      slogan: source.slogan?.trim() ?? "",
      contact_number: source.contact_number.trim(),
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
      const firstError = document.querySelector<HTMLElement>("[data-invalid='true']");
      firstError?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const file = photo!;
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `orders/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("candidate-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const chosen = symbol!;
      const result = await submitOrder({
        data: {
          ...form,
          candidate_name_hindi: form.candidate_name_hindi.trim(),
          candidate_name_english: form.candidate_name_english.trim(),
          contact_number: form.contact_number.trim(),
          slogan: form.slogan.trim() || null,
          ward_id: wardId,
          design_code: design as DesignCode,
          election_symbol: `${chosen.party_name} — ${chosen.symbol_name}`,
          election_symbol_id: chosen.id,
          party_name_snapshot: chosen.party_name,
          symbol_name_snapshot: chosen.symbol_name,
          photo_path: path,
          ip_address: ipRef.current,
          user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400),
          lead_id: leadIdRef.current,
        },
      });

      submittedRef.current = { ...form };
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

  async function onSampleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const phone = form.contact_number.trim();
    if (!sampleName.trim() || !PHONE_RE.test(phone)) {
      toast.error(t("err.phone"));
      return;
    }
    setSampleBusy(true);
    try {
      await submitSample({
        data: {
          candidate_name: sampleName.trim(),
          contact_number: phone,
          district: form.district.trim() || null,
          panchayat_samiti: form.panchayat_samiti.trim() || null,
          gram_panchayat: form.gram_panchayat.trim() || null,
          ward_number: form.ward_number.trim() || null,
          ward_id: wardId,
          ip_address: ipRef.current,
        },
      });
      toast.success(t("sample.success"));
      setSampleOpen(false);
      setSampleName("");
    } catch (error) {
      console.error(error);
      toast.error(t("sample.error"));
    } finally {
      setSampleBusy(false);
    }
  }

  const inputProps = (key: keyof FormState) => ({
    id: key,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
    "aria-invalid": Boolean(errors[key]),
    "data-invalid": errors[key] ? "true" : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
    className: cn("h-12 text-base", errors[key] && "border-destructive focus-visible:ring-destructive"),
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
              <User className="size-4" />
            </span>
            {t("form.section.candidate")}
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="candidate_name_hindi" label={t("form.name_hi")} required error={errors.candidate_name_hindi}>
              <Input {...inputProps("candidate_name_hindi")} placeholder={t("form.name_hi.ph")} autoComplete="name" />
            </Field>
            <Field id="candidate_name_english" label={t("form.name_en")} required error={errors.candidate_name_english}>
              <Input {...inputProps("candidate_name_english")} placeholder={t("form.name_en.ph")} autoComplete="name" />
            </Field>
            <Field id="contact_number" label={t("form.phone")} hint={t("form.phone.hint")} required error={errors.contact_number}>
              <Input
                {...inputProps("contact_number")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="99833 33119"
                onChange={(e) => set("contact_number", e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </Field>

            <Field id="election_symbol" label={t("form.symbol")} hint={t("form.symbol.hint")} required error={errors.symbol}>
              <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="election_symbol"
                    type="button"
                    role="combobox"
                    aria-expanded={symbolOpen}
                    data-invalid={errors.symbol ? "true" : undefined}
                    className={cn(
                      "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      errors.symbol && "border-destructive",
                    )}
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
                              setErrors((p) => ({ ...p, symbol: undefined }));
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
          </div>
        </section>

        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
              <MapPin className="size-4" />
            </span>
            {t("form.section.area")}
          </h3>

          {useMasterGeo ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="district" label={t("form.district")} required error={errors.district}>
                <Select
                  value={districtId ?? ""}
                  onValueChange={(value) => {
                    const row = districts.find((d) => d.id === value);
                    setDistrictId(value);
                    setSamitiId(null);
                    setGpId(null);
                    setWardId(null);
                    setForm((prev) => ({
                      ...prev,
                      district: row?.name_hindi || row?.name || "",
                      panchayat_samiti: "",
                      gram_panchayat: "",
                      ward_number: "",
                    }));
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

              <Field id="panchayat_samiti" label={t("form.samiti")} required error={errors.panchayat_samiti}>
                <Select
                  value={samitiId ?? ""}
                  disabled={!districtId}
                  onValueChange={(value) => {
                    const row = (samitisQuery.data?.options ?? []).find((s) => s.id === value);
                    setSamitiId(value);
                    setGpId(null);
                    setWardId(null);
                    setForm((prev) => ({
                      ...prev,
                      panchayat_samiti: row?.name_hindi || row?.name || "",
                      gram_panchayat: "",
                      ward_number: "",
                    }));
                    setErrors((p) => ({ ...p, panchayat_samiti: undefined }));
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

              <Field id="gram_panchayat" label={t("form.gp")} required error={errors.gram_panchayat}>
                <Select
                  value={gpId ?? ""}
                  disabled={!samitiId}
                  onValueChange={(value) => {
                    const row = (gpsQuery.data?.options ?? []).find((g) => g.id === value);
                    setGpId(value);
                    setWardId(null);
                    setForm((prev) => ({
                      ...prev,
                      gram_panchayat: row?.name_hindi || row?.name || "",
                      ward_number: "",
                    }));
                    setErrors((p) => ({ ...p, gram_panchayat: undefined }));
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

              <Field id="ward_number" label={t("form.ward")} required error={errors.ward_number}>
                <Select
                  value={wardId ?? ""}
                  disabled={!gpId}
                  onValueChange={(value) => {
                    const row = (wardsQuery.data?.options ?? []).find((w) => w.id === value);
                    setWardId(value);
                    setForm((prev) => ({ ...prev, ward_number: row?.ward_number ?? "" }));
                    setErrors((p) => ({ ...p, ward_number: undefined }));
                  }}
                >
                  <SelectTrigger id="ward_number" className="h-12 text-base">
                    <SelectValue placeholder={t("form.ward.ph")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(wardsQuery.data?.options ?? []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.ward_number} — {w.voter_count.toLocaleString("en-IN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="district" label={t("form.district")} required error={errors.district}>
                <Input {...inputProps("district")} placeholder={t("form.district.ph")} autoComplete="address-level2" />
              </Field>
              <Field id="panchayat_samiti" label={t("form.samiti")} required error={errors.panchayat_samiti}>
                <Input {...inputProps("panchayat_samiti")} placeholder={t("form.samiti.ph")} autoComplete="address-level3" />
              </Field>
              <Field id="gram_panchayat" label={t("form.gp")} required error={errors.gram_panchayat}>
                <Input {...inputProps("gram_panchayat")} placeholder={t("form.gp.ph")} autoComplete="address-level3" />
              </Field>
              <Field id="ward_number" label={t("form.ward")} required error={errors.ward_number}>
                <Input {...inputProps("ward_number")} inputMode="numeric" placeholder={t("form.ward.ph")} autoComplete="off" />
              </Field>
            </div>
          )}

          {selectedWard ? (
            <dl className="grid gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("form.voters")}</dt>
                <dd className="font-bold text-navy">
                  {selectedWard.voter_count.toLocaleString("en-IN")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("form.rate")}</dt>
                <dd className="font-bold text-navy">{rate == null ? "—" : formatInr(rate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("form.amount")}</dt>
                <dd className="font-bold text-saffron-deep">{formatInr(estimatedAmount)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">{t("form.amount.pending")}</p>
          )}
        </section>

        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
              <Vote className="size-4" />
            </span>
            {t("form.section.slogan")}
          </h3>

          <Field id="design_code" label={t("form.design")} hint={t("form.design.hint")} required error={errors.design}>
            <Select
              value={design}
              onValueChange={(value) => {
                setDesign(value as DesignCode);
                setErrors((p) => ({ ...p, design: undefined }));
              }}
            >
              <SelectTrigger id="design_code" className="h-12 text-base">
                <SelectValue placeholder={t("form.design.hint")} />
              </SelectTrigger>
              <SelectContent>
                {DESIGN_CODES.map((code, index) => (
                  <SelectItem key={code} value={code}>
                    {`${code} — Design ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="slogan" label={t("form.slogan")} hint={t("form.slogan.hint")}>
            <Textarea
              id="slogan"
              value={form.slogan}
              onChange={(e) => set("slogan", e.target.value)}
              maxLength={200}
              rows={2}
              className="text-base"
            />
          </Field>

          <Field id="photo" label={t("form.photo")} hint={t("form.photo.hint")} required error={errors.photo}>
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
                data-invalid={errors.photo ? "true" : undefined}
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
        </section>

        <div className="flex flex-col gap-3 rounded-xl border border-saffron/30 bg-saffron/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-navy">
              <Gift className="size-4 text-saffron-deep" /> {t("sample.heading")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("sample.body")}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setSampleOpen(true)}>
            {t("sample.cta")}
          </Button>
        </div>

        <div className="space-y-3 border-t border-border pt-6">
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting}>
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

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sample.heading")}</DialogTitle>
            <DialogDescription>{t("sample.body")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSampleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sample_name">{t("sample.name")}</Label>
              <Input
                id="sample_name"
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample_phone">{t("form.phone")}</Label>
              <Input
                id="sample_phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.contact_number}
                onChange={(e) => set("contact_number", e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="h-12 text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {sampleVoters} {t("form.voters")}
            </p>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={sampleBusy}>
              {sampleBusy ? <Loader2 className="size-4 animate-spin" /> : null} {t("sample.submit")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                  <dd className="font-bold text-navy">{formatInr(success?.amount ?? null)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.status")}</dt>
                  <dd className="font-medium text-saffron-deep">{t("pay.pending")}</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-lg bg-card p-3 text-xs leading-relaxed text-muted-foreground">
                {t("pay.soon")}
              </p>
            </div>

            <Button asChild variant="hero" size="lg" className="w-full">
              <a href={waUrl()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> {t("pay.whatsapp")}
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={`tel:+91${WHATSAPP_NUMBER.slice(2)}`}>
                <Phone className="size-4" /> {t("pay.call")}
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
