import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardCopy,
  ImageUp,
  Loader2,
  MessageCircle,
  Trash2,
  Upload,
  User,
  Vote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { captureLeadPhone, createOrder, recordVisit, createCashfreePaymentSession, getPublicPaymentConfig } from "@/lib/orders.functions";
// @ts-expect-error no types for cashfree-js
import { load } from "@cashfreepayments/cashfree-js";
import {
  LIST_OPTIONS,
  PAD_LABELS,
  PAD_OPTIONS,
  isHindiText,
  type ListOption,
  type Pad,
} from "@/lib/orders.schema";
import { listActiveSymbols } from "@/lib/catalog.functions";
import { readReferral, storeReferral } from "@/lib/referral";
import { resolveReferralPartner } from "@/lib/referral.functions";
import { checkWardPhotoAvailability } from "@/lib/ward-photo.functions";
import {
  listBooths,
  listDistricts,
  listGramPanchayats,
  listSamitis,
  listWards,
} from "@/lib/geo.functions";
import type { PublicSymbol } from "@/lib/catalog.schema";
import { buildWhatsAppUrl } from "@/lib/campaign";
import { WHATSAPP_NUMBER } from "@/lib/business";
import {
  DESIGN_CODES,
  DESIGN_META,
  SERIES_LABEL,
  bannerSizeFor,
  computeAmount,
  designPrintsCandidate,
  formatBannerSize,
  formatInr,
  rateFor,
  seriesFor,
  type DesignCode,
  type DesignMeta,
} from "@/lib/pricing";
import { compareWardNumbers } from "@/lib/csv";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const PHONE_RE = /^[6-9]\d{9}$/;

type ErrorKey =
  | "pad"
  | "district"
  | "samiti"
  | "gp"
  | "ward"
  | "contact_number"
  | "design"
  | "photo"
  | "name"
  | "slogan";

const LIST_LABELS: Record<ListOption, TKey> = {
  slip: "list.slip",
  hindi_alpha: "list.hindi_alpha",
  english_alpha: "list.english_alpha",
  family: "list.family",
};

/* Local Hindi / English copy for this form. */
const TX = {
  c1: { hi: "क्षेत्र, पद और वार्ड", en: "Area, post and ward" },
  c1sub: { hi: "कस्टमाइज्ड प्रिंट टेम्पलेट्स", en: "Customized print templates" },
  pad: { hi: "पद", en: "Post" },
  padHint: {
    hi: "किस पद / श्रेणी के लिए चाहिए?",
    en: "Which post or category?",
  },
  sarpanchAll: {
    hi: "सरपंच के लिए पूरी ग्राम पंचायत — सभी वार्ड अपने-आप चुन लिए गए हैं।",
    en: "For Sarpanch the whole gram panchayat is used — all wards are selected automatically.",
  },
  multiArea: {
    hi: "आपके क्षेत्र में इस ग्राम पंचायत के जो वार्ड आते हैं वे चुनिए। दूसरी ग्राम पंचायतें ऑर्डर के बाद WhatsApp पर बता दीजिए।",
    en: "Pick the wards of this gram panchayat that fall in your constituency. Tell us other gram panchayats on WhatsApp after ordering.",
  },
  booth: { hi: "भाग (बूथ / केन्द्र)", en: "Booths / centers" },
  boothAll: { hi: "सभी भाग", en: "All booths" },
  boothQ: { hi: "कौन-कौन से भाग?", en: "Which booths?" },
  boothSelAll: { hi: "सब चुनें", en: "Select all" },
  boothNone: { hi: "कोई नहीं (= सभी)", en: "None (= all)" },
  boothOk: { hi: "ठीक है", en: "Done" },
  boothNoData: {
    hi: "इस वार्ड की भाग-सूची अभी उपलब्ध नहीं है — पूरा वार्ड लिया जाएगा।",
    en: "Booth list for this ward is not available yet — the whole ward will be used.",
  },
  boothHint: {
    hi: "कोई भाग न चुनें तो पूरे वार्ड की पर्चियाँ बनेंगी।",
    en: "If no booth is chosen, slips are made for the whole ward.",
  },
  c2: { hi: "डिज़ाइन", en: "Design" },
  c2sub: { hi: "जिस डिज़ाइन की पर्ची चाहिए उस पर क्लिक कीजिए", en: "Tap the design you want" },
  perSlip: { hi: "पैसे / पर्ची", en: "paise / slip" },
  photoTitle: { hi: "फ़ोटो सहित पर्ची (Ph)", en: "Slip with photo (Ph)" },
  photoDesc: {
    hi: "जहाँ फ़ोटो वाली सूची उपलब्ध हो — 20 पैसे / पर्ची",
    en: "Where the photo roll is available — 20 paise / slip",
  },
  c3: { hi: "नाम व विवरण", en: "Name & details" },
  c3subPlain: {
    hi: "सादे डिज़ाइन (P-16 / P-12) में नाम व विवरण नहीं छपता — खाली छोड़ सकते हैं",
    en: "Plain designs (P-16 / P-12) print no details — you can leave this empty",
  },
  c3sub: { hi: "नाम केवल हिंदी में", en: "Name in Hindi only" },
  nameErr: {
    hi: "केवल हिंदी (देवनागरी) अक्षर लिखिए — English अक्षर नहीं चलेंगे।",
    en: "Use Hindi (Devanagari) letters only — English letters are not allowed.",
  },
  c4: { hi: "विज्ञापन / बैनर की तस्वीर", en: "Advertisement / banner image" },
  c4sub: {
    hi: "सिर्फ़ चिन्ह (SR / SL) और विज्ञापन (AT / AL / AR) वाले डिज़ाइन में",
    en: "Only for symbol (SR / SL) and advertisement (AT / AL / AR) designs",
  },
  sizeLabel: { hi: "इस डिज़ाइन के बैनर का नाप", en: "Banner size for this design" },
  inch: { hi: "इंच", en: "inch" },
  copy: { hi: "नाप कॉपी करें", en: "Copy size" },
  copied: { hi: "नाप कॉपी हो गया", en: "Size copied" },
  pick: { hi: "तस्वीर चुनिए…", en: "Choose image…" },
  change: { hi: "तस्वीर बदलिए", en: "Change image" },
  bannerHint: { hi: "JPG / PNG, अधिकतम 5MB", en: "JPG / PNG, max 5MB" },
  noBanner: {
    hi: "अभी बैनर नहीं है? कोई बात नहीं — ऑर्डर के बाद WhatsApp पर भेज दीजिए।",
    en: "No banner yet? That's fine — send it on WhatsApp after ordering.",
  },
  ratioOk: { hi: "नाप ठीक बैठ रहा है।", en: "The proportions fit." },
  ratioBad: {
    hi: "इस तस्वीर का अनुपात डिज़ाइन से मेल नहीं खाता — बैनर खिंचा या कटा दिख सकता है। ऊपर दिए नाप की तस्वीर बनवाइए।",
    en: "This image's proportions don't match the design — the banner may look stretched or cropped. Get it made at the size above.",
  },
  c5: { hi: "कौन-कौन सी PDF बनानी हैं", en: "Which PDFs do you need" },
  c5sub: { hi: "जो नहीं चाहिए उस पर से ✔ हटा दीजिए", en: "Untick what you don't need" },
  c6: { hi: "संपर्क और दिनांक", en: "Contact and date" },
  phone: { hi: "मोबाइल नंबर (WhatsApp)", en: "Mobile number (WhatsApp)" },
  poll: { hi: "कार्यक्रम दिनांक", en: "Event date" },
  summary: { hi: "सार", en: "Summary" },
  voters: { hi: "रिकॉर्ड", en: "Records" },
  pages: { hi: "लगभग पेज", en: "Approx. pages" },
  rate: { hi: "रेट", en: "Rate" },
  amount: { hi: "राशि", en: "Amount" },
  design: { hi: "डिज़ाइन", en: "Design" },
  area: { hi: "क्षेत्र", en: "Area" },
  consent: {
    hi: "ऑर्डर दर्ज करके आप नियम एवं शर्तें, रिफंड नीति और WhatsApp पर ऑर्डर-सूचनाएँ पाने के लिए सहमति देते हैं।",
    en: "By placing the order you accept the Terms, the Refund policy and agree to receive order updates on WhatsApp.",
  },
  terms: { hi: "नियम", en: "Terms" },
  refund: { hi: "रिफंड नीति", en: "Refund policy" },
  privacy: { hi: "गोपनीयता", en: "Privacy" },
  bannerPending: { hi: "बैनर बाद में", en: "Banner later" },
  padErr: { hi: "पद चुनना आवश्यक है।", en: "Please choose a post." },
  blockMsg: {
    hi: "नमस्ते, मुझे सौभाग्य की वेबसाइट पर ऑर्डर दर्ज करने में दिक़्क़त आ रही है।",
    en: "Hello, I am unable to place an order on the Saubhagya website.",
  },
} as const;

type TxKey = keyof typeof TX;

function Card({
  num,
  title,
  sub,
  children,
  className,
}: {
  num: string;
  title: string;
  sub?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-border bg-card px-4 py-4 shadow-card sm:px-5",
        className,
      )}
    >
      <h2 className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15.5px] font-bold text-foreground">
        <span className="grid size-[25px] shrink-0 place-items-center rounded-lg bg-saffron-gradient text-[13px] font-bold text-white">
          {num}
        </span>
        {title}
        {sub ? (
          <span className="text-[12.5px] font-medium text-muted-foreground">{sub}</span>
        ) : null}
      </h2>
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
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[12.5px] font-semibold text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
        {hint ? <span className="ml-2 font-normal">{hint}</span> : null}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Miniature layout, like the Windows app's template tiles. */
function DesignMini({ meta, on }: { meta: DesignMeta; on: boolean }) {
  const slots = Array.from({ length: meta.rows * meta.cols });
  const cell = on ? "bg-[oklch(0.8_0.07_262)]" : "bg-border";
  return (
    <div className="mt-auto flex h-[46px] w-full gap-[2px] overflow-hidden pt-2" aria-hidden>
      {meta.ad === "left" ? <span className="w-[22%] rounded-sm bg-primary/55" /> : null}
      <div className="flex flex-1 flex-col gap-[2px]">
        {meta.ad === "top" ? <span className="h-[30%] rounded-sm bg-primary/55" /> : null}
        <div
          className="grid flex-1 gap-[2px]"
          style={{
            gridTemplateRows: `repeat(${meta.rows}, minmax(0,1fr))`,
            gridTemplateColumns: `repeat(${meta.cols}, minmax(0,1fr))`,
          }}
        >
          {slots.map((_, i) => (
            <span key={i} className={cn("relative overflow-hidden rounded-[2px]", cell)}>
              {meta.symbol ? (
                <span
                  className={cn(
                    "absolute inset-y-0 w-[36%] bg-[oklch(0.85_0.146_90.5)] opacity-80",
                    meta.symbol === "left" ? "left-0" : "right-0",
                  )}
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>
      {meta.ad === "right" ? <span className="w-[22%] rounded-sm bg-primary/55" /> : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] bg-muted px-3 py-2.5">
      <b className="block text-xl leading-tight text-foreground">{value}</b>
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function OrderForm() {
  const { t, lang } = useI18n();
  const tx = (key: TxKey) => TX[key][lang];
  const en = lang === "en";

  const visit = useServerFn(recordVisit);
  const capture = useServerFn(captureLeadPhone);
  const submitOrder = useServerFn(createOrder);
  const createCashfreeSession = useServerFn(createCashfreePaymentSession);
  const paymentConfigQuery = useQuery({ queryKey: ["paymentConfig"], queryFn: () => getPublicPaymentConfig() });
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  async function handleOnlinePayment() {
    if (!success) return;
    setIsRedirectingToPayment(true);
    try {
      const result = await createCashfreeSession({
        data: {
          orderId: success.orderId,
          amount: success.amount || 0,
          customerPhone: contact.trim(),
          customerName: nameHi.trim(),
        },
      });
      const cashfree = await load({ mode: paymentConfigQuery.data?.cashfree_env === "production" ? "production" : "sandbox" });
      await cashfree.checkout({
        paymentSessionId: result.payment_session_id,
        redirectTarget: "_self"
      });
    } catch (e) {
      console.error(e);
      toast.error(t("err.submit") || "Payment failed");
      setIsRedirectingToPayment(false);
    }
  }

  const fetchSymbols = useServerFn(listActiveSymbols);
  const resolvePartner = useServerFn(resolveReferralPartner);
  const fetchDistricts = useServerFn(listDistricts);
  const fetchSamitis = useServerFn(listSamitis);
  const fetchGps = useServerFn(listGramPanchayats);
  const fetchWards = useServerFn(listWards);
  const fetchBooths = useServerFn(listBooths);
  const fetchWardPhoto = useServerFn(checkWardPhotoAvailability);

  // Card 1 — post and area.
  const [pad, setPad] = useState<Pad>("ps_sadasya");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [samitiId, setSamitiId] = useState<string | null>(null);
  const [gpId, setGpId] = useState<string | null>(null);
  const [wardIds, setWardIds] = useState<string[]>([]);
  const [wardOpen, setWardOpen] = useState(false);
  const [boothIds, setBoothIds] = useState<string[]>([]);
  const [boothOpen, setBoothOpen] = useState(false);

  // Card 2 — design.
  const [design, setDesign] = useState<DesignCode | "">("");
  const [photoSlip, setPhotoSlip] = useState(false);
  const [photoSlipConsent, setPhotoSlipConsent] = useState(false);
  const [consentTicked, setConsentTicked] = useState(false);
  const [photoSlipInfoOpen, setPhotoSlipInfoOpen] = useState(false);
  const [voterPdf, setVoterPdf] = useState<File | null>(null);

  // Card 3 — candidate (Hindi only).
  const [nameHi, setNameHi] = useState("");
  const [evmSerial, setEvmSerial] = useState("");
  const [slogan, setSlogan] = useState("");
  const [symbol, setSymbol] = useState<PublicSymbol | null>(null);
  const [symbolOpen, setSymbolOpen] = useState(false);

  // Card 4 — banner.
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRatio, setPhotoRatio] = useState<number | null>(null);

  // Card 5 / 6.
  const [lists, setLists] = useState<ListOption[]>([...LIST_OPTIONS]);
  const [contact, setContact] = useState("");
  const [pollDate, setPollDate] = useState("");

  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string | undefined>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [blockError, setBlockError] = useState(false);
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
  const voterPdfInputRef = useRef<HTMLInputElement | null>(null);

  const clearError = (key: ErrorKey) => setErrors((prev) => ({ ...prev, [key]: undefined }));

  /* ------------------------------ data ------------------------------ */

  const symbolsQuery = useQuery({
    queryKey: ["public-symbols"],
    queryFn: () => fetchSymbols(),
    staleTime: 30_000,
  });
  const symbols = symbolsQuery.data?.symbols ?? [];

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
  const boothsQuery = useQuery({
    queryKey: ["geo-booths", wardIds],
    queryFn: () => fetchBooths({ data: { ward_ids: wardIds } }),
    enabled: wardIds.length > 0,
  });
  const wardPhotoQuery = useQuery({
    queryKey: ["ward-photo", wardIds],
    queryFn: () => fetchWardPhoto({ data: { ward_ids: wardIds } }),
    enabled: wardIds.length > 0,
  });
  const photoSlipDataAvailable = wardPhotoQuery.data?.available ?? false;

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
  const boothOptions = useMemo(
    () =>
      [...(boothsQuery.data?.options ?? [])].sort((a, b) =>
        compareWardNumbers(a.booth_number, b.booth_number),
      ),
    [boothsQuery.data],
  );
  const selectedBooths = boothOptions.filter((b) => boothIds.includes(b.id));

  // Same rule as the server: a ward with chosen booths counts only those booths.
  const wardsWithBooths = new Set(selectedBooths.map((b) => b.ward_id));
  const totalVoters =
    selectedWards
      .filter((w) => !wardsWithBooths.has(w.id))
      .reduce((sum, w) => sum + w.voter_count, 0) +
    selectedBooths.reduce((sum, b) => sum + b.voter_count, 0);

  const meta = design ? DESIGN_META[design] : null;
  const effectiveRate = design ? rateFor(design, photoSlip) : null;
  const series = design ? seriesFor(design, photoSlip) : null;
  const estimatedAmount =
    selectedWards.length && effectiveRate != null
      ? computeAmount(totalVoters, effectiveRate)
      : null;
  const approxPages = meta && totalVoters ? Math.ceil(totalVoters / meta.slipsPerPage) : null;
  const wardNumbersLabel = selectedWards.map((w) => w.ward_number).join(", ");
  const boothLabel = selectedBooths.map((b) => b.booth_number).join(", ");
  const noGeoData = !districtsQuery.isLoading && districts.length === 0;
  const bannerSize = design ? bannerSizeFor(design) : null;
  const printsCandidate = design ? designPrintsCandidate(design) : true;
  const sizeText = bannerSize ? formatBannerSize(bannerSize) : null;
  const ratioMismatch =
    bannerSize && photoRatio
      ? Math.abs(photoRatio / (bannerSize.w_mm / bannerSize.h_mm) - 1) > 0.08
      : false;

  // Sarpanch = the whole gram panchayat.
  useEffect(() => {
    if (pad === "sarpanch" && wardOptions.length) {
      setWardIds(wardOptions.map((w) => w.id));
      clearError("ward");
    }
  }, [pad, wardOptions]);

  // Drop booth choices that no longer belong to the chosen wards.
  useEffect(() => {
    setBoothIds((prev) => prev.filter((id) => boothOptions.some((b) => b.id === id)));
  }, [boothOptions]);

  /* -------------------------- visit tracking ------------------------- */

  useEffect(() => {
    let cancelled = false;
    const fromUrl =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("ref");
    if (fromUrl) storeReferral(fromUrl);
    const referral = readReferral();

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
        const result = await visit({
          data: { ip_address: ip, referral_code: referral?.code ?? null },
        });
        if (!cancelled) leadIdRef.current = result.lead_id;
      } catch {
        /* tracking is best-effort */
      }
      if (referral) {
        try {
          const partner = await resolvePartner({ data: { code: referral.code } });
          if (!cancelled && partner.valid && partner.full_name) setReferralName(partner.full_name);
        } catch {
          /* cosmetic only */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit, resolvePartner]);

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

  /* ----------------------------- handlers ---------------------------- */

  function onPickBanner(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, photo: t("err.photo.type") }));
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setErrors((prev) => ({ ...prev, photo: t("err.photo.size") }));
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    const url = URL.createObjectURL(file);
    setPhoto(file);
    setPhotoPreview(url);
    setPhotoRatio(null);
    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight) setPhotoRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = url;
    clearError("photo");
  }

  function removeBanner() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoRatio(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function hindiError(value: string) {
    return value.trim() && !isHindiText(value) ? tx("nameErr") : undefined;
  }

  async function copySize() {
    if (!sizeText) return;
    const text = `${sizeText.mm} (${sizeText.inch} inch)`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(tx("copied"));
    } catch {
      toast.message(text);
    }
  }

  function validate() {
    const next: Partial<Record<ErrorKey, string | undefined>> = {};
    if (!pad) next.pad = tx("padErr");
    if (!districtId) next.district = t("err.required.district");
    if (!samitiId) next.samiti = t("err.required.samiti");
    if (!gpId) next.gp = t("err.required.gp");
    if (!wardIds.length) next.ward = t("err.required.ward");
    if (!design) next.design = t("err.required.design");
    if (!PHONE_RE.test(contact.trim())) next.contact_number = t("err.phone");
    const nameErr = hindiError(nameHi);
    if (nameErr) next.name = nameErr;
    const sloganErr = hindiError(slogan);
    if (sloganErr) next.slogan = sloganErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function waUrl() {
    return buildWhatsAppUrl({
      order_id: success?.orderId ?? "",
      candidate_name_hindi: nameHi.trim(),
      pad_label: pad ? PAD_LABELS[pad].hi : null,
      gram_panchayat: label(selectedGp),
      panchayat_samiti: label(selectedSamiti),
      ward_number: wardNumbersLabel,
      booth_label: boothLabel || null,
      district: label(selectedDistrict),
      election_symbol: symbol ? `${symbol.party_name} — ${symbol.symbol_name}` : "",
      evm_serial: evmSerial.trim() || null,
      slogan: slogan.trim(),
      contact_number: contact.trim(),
      design_label: meta ? `${meta.label}${photoSlip ? " + फ़ोटो (Ph)" : ""}` : null,
      banner_needed: Boolean(bannerSize),
      banner_attached: Boolean(photo),
      voter_count: success?.voterCount ?? null,
      amount: success?.amount ?? null,
      payment_status: "PENDING",
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (photoSlip && !photoSlipConsent) {
      toast.error(t("err.form"));
      return;
    }
    if (!validate()) {
      toast.error(t("err.form"));
      document.querySelector<HTMLElement>("[data-invalid='true']")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      let photoPath: string | null = null;
      if (photo && bannerSize) {
        const ext = photo.type === "image/png" ? "png" : "jpg";
        photoPath = `orders/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("candidate-photos")
          .upload(photoPath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
      }

      let pdfPath: string | null = null;
      let consentTime: string | null = null;
      if (photoSlip && voterPdf) {
        pdfPath = `uploads/${crypto.randomUUID()}.pdf`;
        const { error: pdfUploadError } = await supabase.storage
          .from("voter-raw-lists")
          .upload(pdfPath, voterPdf, { contentType: "application/pdf", upsert: false });
        if (pdfUploadError) throw new Error(pdfUploadError.message);
        consentTime = new Date().toISOString();
      }

      const result = await submitOrder({
        data: {
          candidate_name_hindi: printsCandidate ? nameHi.trim() : "",
          candidate_name_english: "",
          pad: pad as Pad,
          contact_number: contact.trim(),
          district: label(selectedDistrict),
          panchayat_samiti: label(selectedSamiti),
          gram_panchayat: label(selectedGp),
          ward_number: wardNumbersLabel,
          ward_id: wardIds[0] ?? null,
          ward_ids: wardIds,
          booth_ids: boothIds,
          design_code: design as DesignCode,
          election_symbol:
            printsCandidate && symbol ? `${symbol.party_name} — ${symbol.symbol_name}` : "",
          election_symbol_id: printsCandidate ? (symbol?.id ?? null) : null,
          party_name_snapshot: printsCandidate ? (symbol?.party_name ?? null) : null,
          symbol_name_snapshot: printsCandidate ? (symbol?.symbol_name ?? null) : null,
          slogan: printsCandidate ? slogan.trim() : "",
          body_name: label(selectedGp) || null,
          evm_serial: printsCandidate ? evmSerial.trim() || null : null,
          poll_date: pollDate.trim() || null,
          list_options: lists,
          photo_path: photoPath,
          photo_slip: photoSlip,
          voter_photo_pdf_path: pdfPath,
          photo_consent_at: consentTime,
          ip_address: ipRef.current,
          user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400),
          lead_id: leadIdRef.current,
          referral_code: readReferral()?.code ?? null,
          referral_captured_at: readReferral()?.captured_at ?? null,
          banner_option: Boolean(meta?.ad),
        },
      });

      setSuccess({
        orderId: result.order_id,
        amount: result.amount,
        voterCount: result.voter_count,
      });
      toast.success(`${t("success.toast")} — ${result.order_id}`);
    } catch (error: unknown) {
      console.error(error);
      const msg = (error as Error)?.message || "";
      if (msg.includes("Cannot process order") || msg.includes("Daily limit")) {
        setBlockError(true);
      } else {
        toast.error(t("err.submit"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------ render ----------------------------- */

  const selectCls = "h-11 bg-card text-[14px]";

  const summary = (
    <section className="rounded-[14px] border border-border bg-card px-4 py-4 shadow-card sm:px-5">
      <h2 className="mb-3 text-[15.5px] font-bold text-foreground">{tx("summary")}</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          value={totalVoters ? totalVoters.toLocaleString("en-IN") : "—"}
          label={tx("voters")}
        />
        <Stat value={approxPages ? approxPages.toLocaleString("en-IN") : "—"} label={tx("pages")} />
        <Stat
          value={effectiveRate != null ? `${Math.round(effectiveRate * 100)} पैसे` : "—"}
          label={tx("rate")}
        />
        <Stat value={formatInr(estimatedAmount)} label={tx("amount")} />
      </div>
      <dl className="mt-3 space-y-1.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{tx("pad")}</dt>
          <dd className="text-right font-medium">{pad ? PAD_LABELS[pad][lang] : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{tx("area")}</dt>
          <dd className="text-right font-medium">
            {selectedGp ? `${label(selectedGp)}, ${label(selectedDistrict)}` : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("form.ward")}</dt>
          <dd className="text-right font-medium">{wardNumbersLabel || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{tx("booth")}</dt>
          <dd className="text-right font-medium">
            {boothLabel || (wardIds.length ? tx("boothAll") : "—")}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{tx("design")}</dt>
          <dd className="text-right font-medium">
            {meta ? `${meta.label}${series ? ` · ${series}` : ""}` : "—"}
          </dd>
        </div>
        {bannerSize && !photo ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">बैनर</dt>
            <dd className="text-right font-medium text-warning">{tx("bannerPending")}</dd>
          </div>
        ) : null}
      </dl>

      <Button
        type="submit"
        form="order-form"
        variant="hero"
        size="xl"
        className="mt-4 w-full rounded-[10px]"
        disabled={submitting || noGeoData}
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" /> {t("form.submitting")}
          </>
        ) : (
          <>✔ {t("form.submit")}</>
        )}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t("form.footnote")}</p>
      <p className="mt-2 text-center text-[11.5px] leading-snug text-muted-foreground">
        {tx("consent")}{" "}
        <Link to="/terms" className="underline underline-offset-2">
          {tx("terms")}
        </Link>
        {" · "}
        <Link to="/refund" className="underline underline-offset-2">
          {tx("refund")}
        </Link>
        {" · "}
        <Link to="/privacy" className="underline underline-offset-2">
          {tx("privacy")}
        </Link>
      </p>
    </section>
  );

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form id="order-form" onSubmit={onSubmit} noValidate className="space-y-4">
          {referralName ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-brand-soft px-3 py-1 text-sm font-medium text-primary">
              <User className="size-3.5" aria-hidden />
              {t("referral.badge")}: {referralName}
            </div>
          ) : null}

          {/* 1 — पद, क्षेत्र, वार्ड, भाग */}
          <Card num="1" title={tx("c1")} sub={tx("c1sub")}>
            <Field id="pad" label={tx("pad")} hint={tx("padHint")} required error={errors.pad}>
              <Select
                value={pad}
                onValueChange={(value) => {
                  const next = value as Pad;
                  if (next !== "sarpanch" && pad === "sarpanch") setWardIds([]);
                  setPad(next);
                  clearError("pad");
                }}
              >
                <SelectTrigger
                  id="pad"
                  className={cn(selectCls, "sm:max-w-xs")}
                  data-invalid={errors.pad ? "true" : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAD_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PAD_LABELS[option][lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-3">
              <Field id="district" label={t("form.district")} required error={errors.district}>
                <Select
                  value={districtId ?? ""}
                  onValueChange={(value) => {
                    setDistrictId(value);
                    setSamitiId(null);
                    setGpId(null);
                    setWardIds([]);
                    clearError("district");
                  }}
                >
                  <SelectTrigger id="district" className={selectCls}>
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
                    clearError("samiti");
                  }}
                >
                  <SelectTrigger id="panchayat_samiti" className={selectCls}>
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
                    clearError("gp");
                  }}
                >
                  <SelectTrigger id="gram_panchayat" className={selectCls}>
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
            </div>

            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              <Field id="ward_number" label={t("form.ward")} required error={errors.ward}>
                <Popover open={wardOpen} onOpenChange={setWardOpen}>
                  <PopoverTrigger asChild>
                    <button
                      id="ward_number"
                      type="button"
                      role="combobox"
                      aria-expanded={wardOpen}
                      disabled={!gpId || pad === "sarpanch"}
                      data-invalid={errors.ward ? "true" : undefined}
                      className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-[14px] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft"
                    >
                      <span className="min-w-0 truncate">
                        {selectedWards.length ? (
                          `${wardNumbersLabel} (${totalVoters.toLocaleString("en-IN")} ${tx("voters")})`
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
                      {pad !== "panch" ? (
                        <div className="flex gap-2 border-b border-border p-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setWardIds(wardOptions.map((w) => w.id));
                              clearError("ward");
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
                      ) : null}
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
                                  if (pad === "panch") {
                                    // A Panch contests one ward.
                                    setWardIds([w.id]);
                                    setWardOpen(false);
                                  } else {
                                    setWardIds((prev) =>
                                      prev.includes(w.id)
                                        ? prev.filter((id) => id !== w.id)
                                        : [...prev, w.id],
                                    );
                                  }
                                  clearError("ward");
                                }}
                                className="gap-3 py-2.5"
                              >
                                <Checkbox checked={checked} className="pointer-events-none" />
                                <span className="flex-1 font-semibold">
                                  {t("form.ward")} {w.ward_number}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {w.voter_count.toLocaleString("en-IN")} {tx("voters")}
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

              <Field id="booths" label={tx("booth")}>
                <button
                  id="booths"
                  type="button"
                  disabled={!wardIds.length || !boothOptions.length}
                  onClick={() => setBoothOpen((open) => !open)}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-card px-3.5 text-left text-[14px] font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-70"
                >
                  <span className="min-w-0 truncate">
                    {selectedBooths.length
                      ? `${selectedBooths.length} ${en ? "booths" : "भाग"} · ${boothLabel}`
                      : tx("boothAll")}
                  </span>
                  <span className="opacity-60">▾</span>
                </button>
              </Field>
            </div>

            {boothOpen && boothOptions.length ? (
              <div className="mt-2.5 rounded-[10px] border border-border bg-muted p-3">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <b className="text-[13.5px]">{tx("boothQ")}</b>
                  <span className="text-[12.5px] text-muted-foreground">
                    {selectedBooths.length}/{boothOptions.length}
                  </span>
                  <span className="flex-1" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBoothIds(boothOptions.map((b) => b.id))}
                  >
                    {tx("boothSelAll")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setBoothIds([])}>
                    {tx("boothNone")}
                  </Button>
                  <Button type="button" size="sm" onClick={() => setBoothOpen(false)}>
                    {tx("boothOk")}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {boothOptions.map((b) => {
                    const on = boothIds.includes(b.id);
                    const ward = selectedWards.find((w) => w.id === b.ward_id);
                    return (
                      <label
                        key={b.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-lg border bg-card px-3 py-2 text-[13px]",
                          on ? "border-primary bg-brand-soft" : "border-border",
                        )}
                      >
                        <Checkbox
                          checked={on}
                          className="mt-0.5"
                          onCheckedChange={(value) =>
                            setBoothIds((prev) =>
                              value ? [...prev, b.id] : prev.filter((id) => id !== b.id),
                            )
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <b>
                            {en ? "Booth" : "भाग"} {b.booth_number}
                          </b>
                          {selectedWards.length > 1 && ward ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {t("form.ward")} {ward.ward_number}
                            </span>
                          ) : null}
                          {b.booth_name ? (
                            <span className="block truncate text-muted-foreground">
                              {b.booth_name}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {b.voter_count.toLocaleString("en-IN")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-2.5 space-y-2 text-[12.5px] text-muted-foreground">
              {pad === "sarpanch" && wardOptions.length ? (
                <p className="rounded-[10px] border border-[oklch(0.892_0.053_262.7)] bg-brand-soft px-3 py-2 text-ink2">
                  {tx("sarpanchAll")}
                </p>
              ) : null}
              {(pad === "ps_sadasya" || pad === "zp_sadasya") && gpId ? (
                <p className="rounded-[10px] border border-[oklch(0.892_0.053_262.7)] bg-brand-soft px-3 py-2 text-ink2">
                  {tx("multiArea")}
                </p>
              ) : null}
              {wardIds.length && !boothsQuery.isLoading ? (
                <p>{boothOptions.length ? tx("boothHint") : tx("boothNoData")}</p>
              ) : null}
            </div>

            {noGeoData ? (
              <p className="mt-3 rounded-[10px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
                {t("form.data.empty")}
              </p>
            ) : null}
          </Card>

          {/* 2 — डिज़ाइन */}
          <Card num="2" title={tx("c2")} sub={tx("c2sub")}>
            <div
              id="design"
              role="radiogroup"
              tabIndex={-1}
              data-invalid={errors.design ? "true" : undefined}
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4"
            >
              {DESIGN_CODES.map((code) => {
                const m = DESIGN_META[code];
                const on = design === code;
                const rate = rateFor(code, false);
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setDesign(code);
                      clearError("design");
                    }}
                    className={cn(
                      "flex h-full flex-col rounded-[10px] border-[1.5px] bg-card px-3 py-2.5 text-left transition-[border-color,transform] hover:-translate-y-px",
                      on
                        ? "border-primary bg-brand-soft shadow-[0_0_0_3px_var(--brand-soft)]"
                        : "border-border hover:border-[oklch(0.84_0.04_258)]",
                    )}
                  >
                    <b className="block text-[13.5px]">{m.label}</b>
                    <span className="block text-[11.5px] leading-snug text-muted-foreground">
                      {en ? m.descEn : m.desc}
                    </span>
                    <span className="mt-1 text-[11.5px] font-semibold text-saffron-deep">
                      {Math.round(rate * 100)} {tx("perSlip")}
                    </span>
                    <DesignMini meta={m} on={on} />
                  </button>
                );
              })}
            </div>
            {errors.design ? (
              <p
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <AlertCircle className="size-3.5" /> {errors.design}
              </p>
            ) : null}
            {meta ? (
              <p className="mt-2.5 text-[12.5px] text-muted-foreground">
                {SERIES_LABEL[meta.series][lang]} · {meta.slipsPerPage}{" "}
                {en ? "slips per A4 page" : "स्लिप प्रति A4 पेज"}
              </p>
            ) : null}
          </Card>

          {/* 3 — प्रत्याशी */}
          <Card
            num="3"
            title={tx("c3")}
            sub={printsCandidate ? tx("c3sub") : tx("c3subPlain")}
            className={cn(!printsCandidate && "opacity-80")}
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field id="candidate_name_hindi" label={t("form.name_hi")} error={errors.name}>
                <Input
                  id="candidate_name_hindi"
                  lang="hi"
                  inputMode="text"
                  autoComplete="off"
                  pattern="^[\u0900-\u097F\s.]+$"
                  value={nameHi}
                  aria-invalid={Boolean(errors.name)}
                  data-invalid={errors.name ? "true" : undefined}
                  onChange={(e) => {
                    setNameHi(e.target.value);
                    setErrors((prev) => ({ ...prev, name: hindiError(e.target.value) }));
                  }}
                  placeholder={t("form.name_hi.ph")}
                  className={cn("h-11 bg-card text-[14px]", errors.name && "border-destructive")}
                />
              </Field>

              <Field id="evm_serial" label={t("form.evm")}>
                <Input
                  id="evm_serial"
                  inputMode="numeric"
                  value={evmSerial}
                  onChange={(e) => setEvmSerial(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder={t("form.evm.ph")}
                  className="h-11 bg-card text-[14px]"
                />
              </Field>
            </div>

            <div className="mt-3.5">
              <Field id="election_symbol" label={t("form.symbol")} hint={t("form.symbol.hint")}>
                <Popover open={symbolOpen} onOpenChange={setSymbolOpen}>
                  <PopoverTrigger asChild>
                    <button
                      id="election_symbol"
                      type="button"
                      role="combobox"
                      aria-expanded={symbolOpen}
                      className="flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-[14px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft"
                    >
                      {symbol ? (
                        <span className="flex min-w-0 items-center gap-2">
                          {symbol.image_url ? (
                            <img
                              src={symbol.image_url}
                              alt=""
                              className="size-8 shrink-0 rounded border border-border object-contain"
                            />
                          ) : null}
                          <span className="min-w-0 truncate">
                            <span className="font-semibold">{symbol.symbol_name}</span>
                            <span className="text-muted-foreground"> — {symbol.party_name}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {symbolsQuery.isLoading
                            ? t("form.symbol.loading")
                            : t("form.symbol.placeholder")}
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
                              className="gap-3 py-2.5"
                            >
                              {s.image_url ? (
                                <img
                                  src={s.image_url}
                                  alt=""
                                  loading="lazy"
                                  className="size-9 shrink-0 rounded border border-border object-contain"
                                />
                              ) : (
                                <span className="grid size-9 shrink-0 place-items-center rounded border border-border text-muted-foreground">
                                  <Vote className="size-4" />
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">
                                  {s.symbol_name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {s.party_name}
                                </span>
                              </span>
                              {symbol?.id === s.id ? (
                                <Check className="size-4 text-success" />
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </Field>
              {symbol ? (
                <button
                  type="button"
                  onClick={() => setSymbol(null)}
                  className="mt-1.5 text-xs font-semibold text-primary underline underline-offset-2"
                >
                  {en ? "Remove symbol" : "चिन्ह हटाएँ"}
                </button>
              ) : null}
            </div>

            <div className="mt-3.5">
              <Field
                id="slogan"
                label={t("form.slogan")}
                hint={t("form.slogan.hint")}
                error={errors.slogan}
              >
                <Input
                  id="slogan"
                  lang="hi"
                  value={slogan}
                  maxLength={200}
                  data-invalid={errors.slogan ? "true" : undefined}
                  onChange={(e) => {
                    setSlogan(e.target.value);
                    setErrors((prev) => ({ ...prev, slogan: hindiError(e.target.value) }));
                  }}
                  className={cn("h-11 bg-card text-[14px]", errors.slogan && "border-destructive")}
                />
              </Field>
            </div>
          </Card>

          {/* 4 — बैनर */}
          {bannerSize && sizeText ? (
            <Card num="4" title={tx("c4")} sub={tx("c4sub")}>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="rounded-[10px] border border-[oklch(0.892_0.053_262.7)] bg-brand-soft px-3.5 py-3">
                  <div className="text-[12.5px] text-muted-foreground">{tx("sizeLabel")}</div>
                  <div className="text-[22px] font-extrabold tracking-wide text-saffron-deep">
                    {sizeText.mm}
                  </div>
                  <div className="text-[13px] text-ink2">
                    {sizeText.inch} {tx("inch")}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2.5"
                    onClick={copySize}
                  >
                    <ClipboardCopy /> {tx("copy")}
                  </Button>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => onPickBanner(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageUp /> {photo ? tx("change") : tx("pick")}
                    </Button>
                    {photo ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="remove"
                        onClick={removeBanner}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{tx("bannerHint")}</span>
                  </div>
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt=""
                      className="mt-2.5 max-h-[90px] max-w-[220px] rounded-md border border-border bg-white object-contain"
                    />
                  ) : (
                    <p className="mt-2.5 text-[12.5px] text-muted-foreground">{tx("noBanner")}</p>
                  )}
                  {photoRatio ? (
                    <p
                      className={cn(
                        "mt-2 rounded-[10px] border px-3 py-2 text-[12.5px]",
                        ratioMismatch
                          ? "border-[oklch(0.88_0.06_73)] bg-warning-soft text-warning"
                          : "border-[oklch(0.88_0.05_165)] bg-success-soft text-success",
                      )}
                    >
                      {ratioMismatch ? tx("ratioBad") : tx("ratioOk")}
                    </p>
                  ) : null}
                  {errors.photo ? (
                    <p
                      role="alert"
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive"
                    >
                      <AlertCircle className="size-3.5" /> {errors.photo}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {/* 5 — PDF सूची */}
          <Card num={bannerSize ? "5" : "4"} title={tx("c5")} sub={tx("c5sub")}>
            <div className="flex flex-wrap gap-2">
              {LIST_OPTIONS.map((option) => {
                const checked = lists.includes(option);
                return (
                  <label
                    key={option}
                    htmlFor={`list-${option}`}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[13.5px] select-none",
                      checked
                        ? "border-primary bg-brand-soft font-semibold text-saffron-deep"
                        : "border-border bg-muted",
                    )}
                  >
                    <Checkbox
                      id={`list-${option}`}
                      checked={checked}
                      className="size-4"
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

            <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[10px] border border-border bg-muted px-3 py-2.5">
              <Label
                htmlFor="photo-slip-toggle"
                className="flex min-w-0 cursor-pointer flex-col gap-0.5"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                  {tx("photoTitle")}
                  {photoSlipDataAvailable ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                      {t("photo_slip.badge")}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11.5px] leading-tight text-muted-foreground">
                  {tx("photoDesc")}
                </span>
              </Label>
              <Switch
                id="photo-slip-toggle"
                checked={photoSlip}
                onCheckedChange={(checked) => {
                  if (checked && !photoSlipConsent) setPhotoSlipInfoOpen(true);
                  else setPhotoSlip(checked);
                }}
              />
            </div>
          </Card>

          {/* 6 — संपर्क */}
          <Card num={bannerSize ? "6" : "5"} title={tx("c6")}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                id="contact_number"
                label={tx("phone")}
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
                    clearError("contact_number");
                  }}
                  className={cn(
                    "h-11 bg-card text-[14px]",
                    errors.contact_number && "border-destructive",
                  )}
                />
              </Field>
              <Field id="poll_date" label={tx("poll")}>
                <Input
                  id="poll_date"
                  type="date"
                  value={pollDate}
                  onChange={(e) => setPollDate(e.target.value)}
                  className="h-11 bg-card text-[14px]"
                />
              </Field>
            </div>
          </Card>
        </form>

        <aside className="lg:sticky lg:top-[76px]">{summary}</aside>
      </div>

      {/* Photo-slip consent (voter-list PDF upload) */}
      <Dialog
        open={photoSlipInfoOpen}
        onOpenChange={(open) => {
          setPhotoSlipInfoOpen(open);
          if (!open && !photoSlipConsent) setPhotoSlip(false);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("photo_slip.consent.title")}</DialogTitle>
            <DialogDescription>{t("photo_slip.consent.desc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3">
              <input
                ref={voterPdfInputRef}
                id="voter-pdf"
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 50 * 1024 * 1024) {
                    toast.error(
                      en ? "PDF must be smaller than 50MB" : "PDF 50MB से छोटी होनी चाहिए",
                    );
                    if (voterPdfInputRef.current) voterPdfInputRef.current.value = "";
                    return;
                  }
                  setVoterPdf(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => voterPdfInputRef.current?.click()}
              >
                <Upload className="size-4" />
                <span className="truncate">{voterPdf ? voterPdf.name : t("photo_slip.pdf")}</span>
              </Button>
              {voterPdf ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setVoterPdf(null);
                    if (voterPdfInputRef.current) voterPdfInputRef.current.value = "";
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-muted p-3">
              <Checkbox
                id="photo-slip-consent"
                checked={consentTicked}
                onCheckedChange={(checked) => setConsentTicked(checked === true)}
              />
              <Label
                htmlFor="photo-slip-consent"
                className="cursor-pointer text-sm font-medium leading-snug"
              >
                {t("photo_slip.consent.checkbox")}
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="ghost" onClick={() => setPhotoSlipInfoOpen(false)}>
              {en ? "Cancel" : "रद्द करें"}
            </Button>
            <Button
              disabled={!voterPdf || !consentTicked}
              onClick={() => {
                setPhotoSlipConsent(true);
                setPhotoSlip(true);
                setPhotoSlipInfoOpen(false);
              }}
            >
              {t("photo_slip.agree")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order placed */}
      <Dialog open={Boolean(success)} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="text-center text-xl">{t("success.title")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("success.orderid")}:{" "}
              <span className="font-bold text-saffron-deep">{success?.orderId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-[14px] border border-border bg-muted p-4">
              <h4 className="text-sm font-bold text-foreground">{t("pay.heading")}</h4>
              <dl className="mt-3 space-y-1.5 text-sm">
                {success?.voterCount != null ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{tx("voters")}</dt>
                    <dd className="font-medium">{success.voterCount.toLocaleString("en-IN")}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.amount")}</dt>
                  <dd className="font-bold text-saffron-deep">
                    {formatInr(success?.amount ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("pay.status")}</dt>
                  <dd className="font-medium">{t("pay.pending")}</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-[10px] border border-[oklch(0.88_0.06_73)] bg-warning-soft px-3 py-2 text-[13px] text-warning">
                {t("pay.soon")}
              </p>
              {bannerSize && !photo ? (
                <p className="mt-2 text-[12.5px] text-muted-foreground">{tx("noBanner")}</p>
              ) : null}
            </div>

            {paymentConfigQuery.data?.cashfree_enabled ? (
              <Button
                variant="hero"
                size="lg"
                className="w-full rounded-[10px]"
                disabled={isRedirectingToPayment}
                onClick={handleOnlinePayment}
              >
                {isRedirectingToPayment ? (
                  <Loader2 className="mr-2 size-5 animate-spin" />
                ) : null}
                {"Pay Now"}
              </Button>
            ) : (
              <Button asChild variant="success" size="lg" className="w-full">
                <a href={waUrl()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-5" /> {t("pay.whatsapp")}
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked */}
      <Dialog open={blockError} onOpenChange={setBlockError}>
        <DialogContent className="p-6 text-center sm:max-w-md">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <DialogTitle className="mb-2 text-xl">{t("block.title")}</DialogTitle>
          <DialogDescription className="mb-6 text-base">{t("block.desc")}</DialogDescription>
          <Button asChild variant="success" size="lg" className="w-full">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(tx("blockMsg"))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-5" /> {t("block.btn")}
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
