import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ImageUp,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Trash2,
  Upload,
  User,
  Vote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  attachPaymentScreenshot,
  getPaymentPanel,
  listActiveSymbols,
  startPaypurPayment,
} from "@/lib/catalog.functions";
import type { PublicSymbol } from "@/lib/catalog.schema";
import { WHATSAPP_NUMBER, buildWhatsAppUrl } from "@/lib/campaign";
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
const SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHONE_RE = /^[6-9]\d{9}$/;

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
  const { t, lang } = useI18n();
  const visit = useServerFn(recordVisit);
  const capture = useServerFn(captureLeadPhone);
  const submitOrder = useServerFn(createOrder);
  const fetchSymbols = useServerFn(listActiveSymbols);
  const fetchPanel = useServerFn(getPaymentPanel);
  const attachScreenshot = useServerFn(attachPaymentScreenshot);
  const startPaypur = useServerFn(startPaypurPayment);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [symbol, setSymbol] = useState<PublicSymbol | null>(null);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "photo" | "symbol", string | undefined>>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderId: string } | null>(null);
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [paypurBusy, setPaypurBusy] = useState(false);

  const ipRef = useRef<string | null>(null);
  const leadIdRef = useRef<string | null>(null);
  const capturedPhoneRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shotInputRef = useRef<HTMLInputElement | null>(null);
  const submittedRef = useRef<FormState | null>(null);

  // Catalog is fetched live, so admin activations/reordering show up without a rebuild.
  const symbolsQuery = useQuery({
    queryKey: ["public-symbols"],
    queryFn: () => fetchSymbols(),
    staleTime: 30_000,
  });
  const symbols = symbolsQuery.data?.symbols ?? [];

  const panelQuery = useQuery({
    queryKey: ["public-payment-panel"],
    queryFn: () => fetchPanel(),
    enabled: Boolean(success),
  });
  const panel = panelQuery.data;

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
    const next: Partial<Record<keyof FormState | "photo" | "symbol", string | undefined>> = {};
    if (!form.candidate_name_hindi.trim()) next.candidate_name_hindi = t("err.required.name_hi");
    if (!form.candidate_name_english.trim()) next.candidate_name_english = t("err.required.name_en");
    if (!PHONE_RE.test(form.contact_number.trim())) next.contact_number = t("err.phone");
    if (!form.district.trim()) next.district = t("err.required.district");
    if (!form.panchayat_samiti.trim()) next.panchayat_samiti = t("err.required.samiti");
    if (!form.gram_panchayat.trim()) next.gram_panchayat = t("err.required.gp");
    if (!form.ward_number.trim()) next.ward_number = t("err.required.ward");
    if (!symbol) next.symbol = t("err.required.symbol");
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
      payment_screenshot_sent: screenshotUploaded,
      payment_method: "MANUAL_QR",
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
      const { order_id } = await submitOrder({
        data: {
          ...form,
          candidate_name_hindi: form.candidate_name_hindi.trim(),
          candidate_name_english: form.candidate_name_english.trim(),
          contact_number: form.contact_number.trim(),
          slogan: form.slogan.trim() || null,
          election_symbol: `${chosen.party_name} — ${chosen.symbol_name}`,
          election_symbol_id: chosen.id,
          party_name_snapshot: chosen.party_name,
          symbol_name_snapshot: chosen.symbol_name,
          photo_path: path,
          ip_address: ipRef.current,
          lead_id: leadIdRef.current,
        },
      });

      submittedRef.current = { ...form };
      setScreenshotUploaded(false);
      setSuccess({ orderId: order_id });
      toast.success(`${t("success.toast")} — ${order_id}`);
    } catch (error) {
      console.error(error);
      toast.error(t("err.submit"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onPickScreenshot(file: File | null) {
    if (!file || !success) return;
    if (!SCREENSHOT_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      toast.error(t("pay.upload.type"));
      return;
    }
    setUploadingShot(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `screenshots/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-assets")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      await attachScreenshot({ data: { order_id: success.orderId, path } });
      setScreenshotUploaded(true);
      toast.success(t("pay.uploaded"));
    } catch (error) {
      console.error(error);
      toast.error(t("pay.upload.error"));
    } finally {
      setUploadingShot(false);
      if (shotInputRef.current) shotInputRef.current.value = "";
    }
  }

  async function onPaypur() {
    if (!success) return;
    setPaypurBusy(true);
    try {
      const res = await startPaypur({ data: { order_id: success.orderId } });
      if (res.ok && res.pay_url) {
        window.location.href = res.pay_url;
        return;
      }
      toast.error(t("pay.paypur.error"));
    } catch {
      toast.error(t("pay.paypur.error"));
    } finally {
      setPaypurBusy(false);
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
                placeholder="98285 55751"
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
        </section>

        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
              <Vote className="size-4" />
            </span>
            {t("form.section.slogan")}
          </h3>

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
              <h4 className="flex items-center gap-2 text-sm font-bold text-navy">
                <QrCode className="size-4 text-saffron-deep" /> {t("pay.heading")}
              </h4>

              {panelQuery.isLoading ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </p>
              ) : panel?.qr_url ? (
                <div className="mt-3 space-y-3">
                  <img
                    src={panel.qr_url}
                    alt="Payment QR"
                    className="mx-auto size-52 rounded-xl border border-border bg-card object-contain p-2"
                  />
                  <p className="text-center text-xs text-muted-foreground">{t("pay.qr.hint")}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("pay.none")}</p>
              )}

              <dl className="mt-3 space-y-1.5 text-sm">
                {panel?.amount != null ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("pay.amount")}</dt>
                    <dd className="font-bold text-navy">₹{panel.amount}</dd>
                  </div>
                ) : null}
                {panel?.display_name ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("pay.account")}</dt>
                    <dd className="break-all font-medium">{panel.display_name}</dd>
                  </div>
                ) : null}
                {panel?.upi_id ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("pay.upi")}</dt>
                    <dd className="break-all font-medium">{panel.upi_id}</dd>
                  </div>
                ) : null}
              </dl>

              {panel?.instructions ? (
                <p className="mt-3 whitespace-pre-line rounded-lg bg-card p-3 text-xs leading-relaxed text-muted-foreground">
                  {panel.instructions}
                </p>
              ) : null}

              <input
                ref={shotInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onPickScreenshot(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant={screenshotUploaded ? "success" : "outline"}
                size="lg"
                className="mt-4 w-full"
                disabled={uploadingShot}
                onClick={() => shotInputRef.current?.click()}
              >
                {uploadingShot ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {t("pay.uploading")}
                  </>
                ) : screenshotUploaded ? (
                  <>
                    <CheckCircle2 className="size-4" /> {t("pay.uploaded")}
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> {t("pay.upload")}
                  </>
                )}
              </Button>

              {panel?.paypur_enabled ? (
                <Button
                  type="button"
                  variant="navy"
                  size="lg"
                  className="mt-2 w-full"
                  disabled={paypurBusy}
                  onClick={onPaypur}
                >
                  {paypurBusy ? <Loader2 className="size-4 animate-spin" /> : null} {t("pay.paypur")}
                </Button>
              ) : null}
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
