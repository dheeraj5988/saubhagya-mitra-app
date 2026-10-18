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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
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
      <SiteFooter />
    </div>
  );
}
