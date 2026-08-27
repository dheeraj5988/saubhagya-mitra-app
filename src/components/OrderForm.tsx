import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { captureLeadPhone, createOrder, recordVisit } from "@/lib/orders.functions";
import { WHATSAPP_NUMBER, buildWhatsAppUrl } from "@/lib/campaign";
import { cn } from "@/lib/utils";

type FormState = {
  candidate_name_hindi: string;
  candidate_name_english: string;
  contact_number: string;
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  election_symbol: string;
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
  election_symbol: "",
  slogan: "",
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
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
  const visit = useServerFn(recordVisit);
  const capture = useServerFn(captureLeadPhone);
  const submitOrder = useServerFn(createOrder);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "photo", string | undefined>>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderId: string; waUrl: string } | null>(null);

  const ipRef = useRef<string | null>(null);
  const leadIdRef = useRef<string | null>(null);
  const capturedPhoneRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      setErrors((p) => ({ ...p, photo: "केवल JPG या PNG फोटो अपलोड करें।" }));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((p) => ({ ...p, photo: "फोटो का आकार 5MB से कम होना चाहिए।" }));
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, photo: undefined }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState | "photo", string | undefined>> = {};
    if (!form.candidate_name_hindi.trim()) next.candidate_name_hindi = "प्रत्याशी का नाम (हिंदी) आवश्यक है।";
    if (!form.candidate_name_english.trim()) next.candidate_name_english = "Name in English is required.";
    if (!PHONE_RE.test(form.contact_number.trim()))
      next.contact_number = "10 अंकों का सही मोबाइल नंबर दर्ज करें।";
    if (!form.district.trim()) next.district = "जिला आवश्यक है।";
    if (!form.panchayat_samiti.trim()) next.panchayat_samiti = "पंचायत समिति आवश्यक है।";
    if (!form.gram_panchayat.trim()) next.gram_panchayat = "ग्राम पंचायत आवश्यक है।";
    if (!form.ward_number.trim()) next.ward_number = "वार्ड नंबर आवश्यक है।";
    if (!form.election_symbol.trim()) next.election_symbol = "चुनाव चिन्ह आवश्यक है।";
    if (!photo) next.photo = "प्रत्याशी की फोटो (JPG/PNG) आवश्यक है।";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) {
      toast.error("कृपया सभी आवश्यक जानकारी सही भरें।");
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

      const { order_id } = await submitOrder({
        data: {
          ...form,
          candidate_name_hindi: form.candidate_name_hindi.trim(),
          candidate_name_english: form.candidate_name_english.trim(),
          contact_number: form.contact_number.trim(),
          slogan: form.slogan.trim() || null,
          photo_path: path,
          ip_address: ipRef.current,
          lead_id: leadIdRef.current,
        },
      });

      const waUrl = buildWhatsAppUrl({
        order_id,
        candidate_name_hindi: form.candidate_name_hindi.trim(),
        candidate_name_english: form.candidate_name_english.trim(),
        gram_panchayat: form.gram_panchayat.trim(),
        ward_number: form.ward_number.trim(),
        district: form.district.trim(),
        election_symbol: form.election_symbol.trim(),
        contact_number: form.contact_number.trim(),
      });

      setSuccess({ orderId: order_id, waUrl });
      toast.success(`ऑर्डर दर्ज हुआ — ${order_id}`);
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error("ऑर्डर सबमिट नहीं हो सका। कृपया दोबारा प्रयास करें।");
    } finally {
      setSubmitting(false);
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
            प्रत्याशी की जानकारी
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="candidate_name_hindi" label="प्रत्याशी का नाम (हिंदी)" required error={errors.candidate_name_hindi}>
              <Input {...inputProps("candidate_name_hindi")} placeholder="जैसे: रामलाल मीणा" autoComplete="name" />
            </Field>
            <Field
              id="candidate_name_english"
              label="Candidate Name (English)"
              required
              error={errors.candidate_name_english}
            >
              <Input {...inputProps("candidate_name_english")} placeholder="e.g. Ramlal Meena" autoComplete="name" />
            </Field>
            <Field id="contact_number" label="मोबाइल नंबर" hint="10 digits" required error={errors.contact_number}>
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
            <Field id="election_symbol" label="चुनाव चिन्ह" hint="Election symbol" required error={errors.election_symbol}>
              <Input {...inputProps("election_symbol")} placeholder="जैसे: छाता, कलम" autoComplete="off" />
            </Field>
          </div>
        </section>

        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
              <MapPin className="size-4" />
            </span>
            क्षेत्र की जानकारी
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="district" label="जिला" hint="District" required error={errors.district}>
              <Input {...inputProps("district")} placeholder="जैसे: जयपुर" autoComplete="address-level2" />
            </Field>
            <Field id="panchayat_samiti" label="पंचायत समिति" required error={errors.panchayat_samiti}>
              <Input {...inputProps("panchayat_samiti")} placeholder="जैसे: सांगानेर" autoComplete="address-level3" />
            </Field>
            <Field id="gram_panchayat" label="ग्राम पंचायत" required error={errors.gram_panchayat}>
              <Input {...inputProps("gram_panchayat")} placeholder="जैसे: बगरू" autoComplete="address-level3" />
            </Field>
            <Field id="ward_number" label="वार्ड नंबर" hint="Ward no." required error={errors.ward_number}>
              <Input {...inputProps("ward_number")} inputMode="numeric" placeholder="जैसे: 07" autoComplete="off" />
            </Field>
          </div>
        </section>

        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron-deep">
              <Vote className="size-4" />
            </span>
            नारा एवं फोटो
          </h3>

          <Field id="slogan" label="नारा (वैकल्पिक)" hint="उदाहरण: आपका विश्वास, हमारी पहचान">
            <Textarea
              id="slogan"
              value={form.slogan}
              onChange={(e) => set("slogan", e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="आपका विश्वास, हमारी पहचान"
              className="text-base"
            />
          </Field>

          <Field id="photo" label="प्रत्याशी की फोटो" hint="JPG / PNG, अधिकतम 5MB" required error={errors.photo}>
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
                {photo ? "फोटो बदलें" : "फोटो चुनें / अपलोड करें"}
              </button>
              {photoPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={photoPreview}
                    alt="चयनित प्रत्याशी फोटो का पूर्वावलोकन"
                    className="size-20 rounded-xl border border-border object-cover shadow-card"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="फोटो हटाएं"
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
                <Loader2 className="size-5 animate-spin" /> प्रोसेस हो रहा है…
              </>
            ) : (
              <>
                <MessageCircle className="size-5" /> आवेदन भेजें एवं WhatsApp पर जुड़ें
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            सबमिट करते ही आपका ऑर्डर आईडी बनेगा और WhatsApp चैट खुलेगी — भुगतान विवरण वहीं भेजा जाएगा।
          </p>
        </div>
      </form>

      <Dialog open={Boolean(success)} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="text-center text-xl">आवेदन सफलतापूर्वक दर्ज हुआ!</DialogTitle>
            <DialogDescription className="text-center">
              आपका ऑर्डर आईडी{" "}
              <span className="font-bold text-saffron-deep">{success?.orderId}</span> है। कृपया WhatsApp
              पर अपना ड्राफ्ट एवं पेमेंट विवरण प्राप्त करें।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button asChild variant="hero" size="lg" className="w-full">
              <a href={success?.waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> WhatsApp पर विवरण भेजें
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={`tel:+91${WHATSAPP_NUMBER.slice(2)}`}>
                <Phone className="size-4" /> कॉल करें
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
