import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useI18n } from "@/lib/i18n";
import { getPublicPaymentConfig } from "@/lib/orders.functions";

/**
 * 06.10.2026 — owner: a clean home page with only the 4 main buttons.
 * Each button opens our order page https://order.saubhagya.net/order with that
 * choice already selected (?kind=pdf | sample | exe | data). Header and footer
 * (policy links needed for PhonePe) stay as they are.
 * Software (EXE) and Data buttons follow the admin "software" switch, as before.
 */
const TITLE = "सौभाग्य | Saubhagya — कस्टमाइज्ड प्रिंट-रेडी टेम्पलेट्स और डिजिटल पर्ची";
const DESCRIPTION =
  "छपाई-योग्य कस्टमाइज्ड टेम्पलेट्स और अभियान पर्ची PDF — पंच, सरपंच, पंचायत समिति और ज़िला परिषद सदस्य। डिजिटल डिलीवरी।";

const ORDER_URL = "https://order.saubhagya.net/order";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Card = {
  kind: "adv" | "pdf" | "sample" | "exe" | "data";
  /** 18.10.2026 — order site par seedha alag pej (kind ki jagah) */
  href?: string;
  /** 18.10.2026 — highlighted (agrim booking) */
  hot?: boolean;
  badgeHi?: string;
  badgeEn?: string;
  icon: string;
  hi: string;
  en: string;
  subHi: string;
  subEn: string;
};

const CARDS: Card[] = [
  {
    kind: "adv",
    icon: "🗓",
    hi: "सरपंच / पंच — अग्रिम बुकिंग · 1 घंटे में चुनाव-चिन्ह सहित पर्चियाँ",
    en: "Sarpanch / Panch — Advance booking · slips with symbol within 1 hour",
    subHi: "चुनाव-चिन्ह मिलने वाले दिन सबसे ज़्यादा भीड़ होती है — अभी अपना 1 घंटे का स्लॉट पक्का कीजिए; स्लॉट में जानकारी भरिए, चुनाव-चिन्ह सहित पर्चियाँ लगभग 1 घंटे में।",
    subEn: "The symbol-allotment day is the busiest — book your 1-hour slot now; fill in your details in the slot and get your slips with the symbol in about an hour.",
    hot: true,
    badgeHi: "नया · सीमित स्लॉट",
    badgeEn: "New · limited slots",
  },
  {
    kind: "pdf",
    icon: "🧾",
    hi: "वोटर पर्ची PDF",
    en: "Voter slip PDF",
    subHi: "पंच, सरपंच, पं.स. व ज़ि.प. प्रत्याशी — छपाई के लिए तैयार",
    subEn: "Print-ready slips for every post",
  },
  {
    kind: "sample",
    icon: "🆓",
    hi: "नमूना PDF — फ़्री",
    en: "Free sample PDF",
    subHi: "अपने क्षेत्र की नमूना पर्ची PDF तुरंत",
    subEn: "A sample slip PDF for your area, instantly",
  },
  {
    kind: "exe",
    icon: "💻",
    hi: "सॉफ़्टवेयर (EXE)",
    en: "Software (EXE)",
    subHi: "अपने कंप्यूटर पर ख़ुद पर्चियाँ बनाइए",
    subEn: "Make slips yourself on your computer",
  },
  {
    kind: "data",
    icon: "📦",
    hi: "डेटा — सॉफ़्टवेयर के लिए",
    en: "Data — for the software",
    subHi: "समिति / ज़िले का डेटा, सॉफ़्टवेयर पहले से हो तो",
    subEn: "Samiti / district data for your software",
  },
];


/**
 * 19.10.2026 — owner: use the empty side space (wide screens) to show samples of every slip
 * design we make. Images are rendered by the PC app (order.saubhagya.net/namune/<id>.png, with the
 * design code as a light purple watermark); a missing image just hides its card.
 */
const NAMUNE_BASE = "https://order.saubhagya.net/namune/";
type Namuna = { png: string; id: string; hi: string; en: string };
const NAMUNE_LEFT: Namuna[] = [
  { png: "SR-10", id: "SR-10", hi: "चिन्ह दायीं ओर — उम्मीदवार का नाम, चिन्ह व क्रम", en: "Symbol right — name, symbol & serial" },
  { png: "SR-10_pic", id: "SR-10", hi: "चिन्ह की पट्टी में आपकी फ़ोटो / छोटा बैनर", en: "Your photo / small banner in the strip" },
  { png: "SL-10", id: "SL-10", hi: "चिन्ह बायीं ओर", en: "Symbol left" },
  { png: "SL-10_pic", id: "SL-10", hi: "पट्टी में आपकी फ़ोटो / बैनर", en: "Your photo / banner in the strip" },
  { png: "P-16", id: "P-16", hi: "सादी — 16 स्लिप, चौड़ा पेज", en: "Plain — 16 per page" },
  { png: "P-12", id: "P-12", hi: "सादी — 12 स्लिप", en: "Plain — 12 per page" },
  { png: "P-10", id: "P-10", hi: "सादी — 10 स्लिप", en: "Plain — 10 per page" },
  { png: "P-9", id: "P-9", hi: "सादी — 9 स्लिप, चौड़ा पेज", en: "Plain — 9 per page" },
  { png: "P-8", id: "P-8", hi: "सादी — 8 स्लिप (बड़ी)", en: "Plain — 8 (large)" },
  { png: "P-6", id: "P-6", hi: "सादी — 6 स्लिप (बड़ी)", en: "Plain — 6 (large)" },
  { png: "P-4", id: "P-4", hi: "सादी — 4 स्लिप (सबसे बड़ी)", en: "Plain — 4 (largest)" },
  { png: "Ph-16", id: "Ph-16", hi: "फ़ोटो वाली — हर पर्ची पर मतदाता की फ़ोटो (16 स्लिप)", en: "With voter photo — 16 per page" },
  { png: "Ph-12", id: "Ph-12", hi: "फ़ोटो वाली — 12 स्लिप", en: "With voter photo — 12" },
  { png: "Ph-10", id: "Ph-10", hi: "फ़ोटो वाली — 10 स्लिप", en: "With voter photo — 10" },
  { png: "Ph-8", id: "Ph-8", hi: "फ़ोटो वाली — 8 स्लिप (बड़ी)", en: "With voter photo — 8 (large)" },
  { png: "Ph-4", id: "Ph-4", hi: "फ़ोटो वाली — 4 स्लिप (सबसे बड़ी)", en: "With voter photo — 4 (largest)" },
];
const NAMUNE_RIGHT: Namuna[] = [
  { png: "AT-9", id: "AT-9", hi: "विज्ञापन ऊपर — 9 स्लिप; यहाँ आपका दिया बैनर / फ़ोटो छपता है", en: "Ad on top — 9; your banner / photo prints here" },
  { png: "AT-8", id: "AT-8", hi: "विज्ञापन ऊपर — 8 स्लिप", en: "Ad on top — 8" },
  { png: "AL-8", id: "AL-8", hi: "विज्ञापन बायीं ओर — 8 स्लिप", en: "Ad left — 8" },
  { png: "AR-8", id: "AR-8", hi: "विज्ञापन दायीं ओर — 8 स्लिप", en: "Ad right — 8" },
  { png: "AL-8a", id: "AL-8a", hi: "पूरी चौड़ाई, विज्ञापन बायीं ओर", en: "Full width, ad left" },
  { png: "AR-8a", id: "AR-8a", hi: "पूरी चौड़ाई, विज्ञापन दायीं ओर", en: "Full width, ad right" },
  { png: "AT-4", id: "AT-4", hi: "विज्ञापन ऊपर — 4 स्लिप (सबसे बड़ी)", en: "Ad on top — 4 (largest)" },
  { png: "AL-4", id: "AL-4", hi: "पूरी चौड़ाई, विज्ञापन बायीं ओर (सबसे बड़ी)", en: "Full width, ad left (largest)" },
  { png: "AR-4", id: "AR-4", hi: "पूरी चौड़ाई, विज्ञापन दायीं ओर (सबसे बड़ी)", en: "Full width, ad right (largest)" },
];

function NamuneRail({ items, title, en }: { items: Namuna[]; title: string; en: boolean }) {
  return (
    <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-64 shrink-0 overflow-y-auto pr-1 xl:block">
      <h2 className="mb-2 text-sm font-bold text-slate-700">{title}</h2>
      {items.map((n) => (
        <figure
          key={n.png}
          className="mb-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        >
          <img
            src={`${NAMUNE_BASE}${n.png}.png`}
            alt={n.id}
            loading="lazy"
            className="block w-full rounded-md bg-slate-50"
            onError={(e) => {
              const f = e.currentTarget.closest("figure") as HTMLElement | null;
              if (f) f.style.display = "none";
            }}
          />
          <figcaption className="mt-1 text-[11px] leading-snug text-slate-600">
            <b className="text-slate-800">{n.id}</b> — {en ? n.en : n.hi}
          </figcaption>
        </figure>
      ))}
    </aside>
  );
}

function Index() {
  const { lang } = useI18n();
  const en = lang === "en";
  const fetchConfig = useServerFn(getPublicPaymentConfig);
  const { data: config } = useQuery({
    queryKey: ["publicPaymentConfig"],
    queryFn: () => fetchConfig(),
    staleTime: 30_000,
  });
  const softwareActive = Boolean(config?.software_enabled);
  const cards = CARDS.filter((c) => softwareActive || (c.kind !== "exe" && c.kind !== "data"));

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 justify-center gap-6 px-4 py-10">
      <NamuneRail items={NAMUNE_LEFT} title={en ? "Slip designs — plain & with symbol" : "पर्ची के डिज़ाइन — सादी व चिन्ह वाली"} en={en} />
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-center">
        <h1 className="text-center text-2xl font-bold text-slate-800 sm:text-3xl">
          {en ? "What do you need?" : "आपको क्या चाहिए?"}
        </h1>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <a
              key={c.kind}
              href={c.href ?? `${ORDER_URL}?kind=${c.kind}`}
              className={
                c.hot
                  ? "group relative flex items-center gap-4 rounded-2xl border-2 border-orange-600 bg-gradient-to-br from-orange-50 to-orange-100 p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:col-span-2"
                  : "group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              }
            >
              {c.hot && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  {en ? c.badgeEn : c.badgeHi}
                </span>
              )}
              <span className="text-4xl leading-none" aria-hidden="true">
                {c.icon}
              </span>
              <span className="flex flex-col">
                <span
                  className={
                    c.hot
                      ? "text-lg font-bold text-orange-800"
                      : "text-lg font-semibold text-slate-800 group-hover:text-primary"
                  }
                >
                  {en ? c.en : c.hi}
                </span>
                <span className="mt-0.5 text-sm text-slate-500">{en ? c.subEn : c.subHi}</span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-6 text-right text-xs text-slate-400">
          <a
            href="https://order.saubhagya.net/order/matpatra"
            className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-600 no-underline hover:border-primary hover:text-primary"
          >
            {en ? "🗳 Free sample ballot / EVM →" : "🗳 नमूना मतपत्र / EVM (फ़्री) →"}
          </a>
        </p>
      </main>
      <NamuneRail items={NAMUNE_RIGHT} title={en ? "With advertisement (your banner)" : "विज्ञापन वाली (आपका बैनर / फ़ोटो)"} en={en} />
      </div>
      <SiteFooter />
    </div>
  );
}
