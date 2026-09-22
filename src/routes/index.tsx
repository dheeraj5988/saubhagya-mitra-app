import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, FileText, ListOrdered, MessageCircle, Send } from "lucide-react";

import { OrderForm } from "@/components/OrderForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { buildEnquiryWhatsAppUrl } from "@/lib/campaign";
import { useI18n } from "@/lib/i18n";
import { SERIES_RATES } from "@/lib/pricing";

const TITLE = "सौभाग्य वोटर स्लिप | Saubhagya Voter Slip — पंचायत चुनाव की डिजिटल वोटर स्लिप";
const DESCRIPTION =
  "राजस्थान पंचायत चुनाव (पंच, सरपंच, पंचायत समिति व ज़िला परिषद सदस्य) के लिए छपाई-योग्य वोटर स्लिप PDF — P 15 पैसे, S / A 16 पैसे, Ph 20 पैसे प्रति पर्ची। डिजिटल डिलीवरी।";

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

const p = (r: number) => Math.round(r * 100);

function Index() {
  const { t, lang } = useI18n();
  const en = lang === "en";

  const deliver = [
    {
      icon: FileText,
      title: en ? "PDF voter slips" : "PDF वोटर स्लिप",
      body: en
        ? "Booth-wise, ready to print on A4 — plain, with symbol, or with your banner."
        : "बूथ-वार, A4 पर छपाई के लिए तैयार — सादी, चुनाव चिन्ह वाली या आपके बैनर के साथ।",
    },
    {
      icon: ListOrdered,
      title: en ? "Voter lists" : "मतदाता सूचियाँ",
      body: en
        ? "Hindi alphabetical, English alphabetical and family-wise lists for booth work."
        : "बूथ पर काम के लिए हिंदी वर्णमाला, English Alphabetical और परिवार वार सूची।",
    },
    {
      icon: Send,
      title: en ? "Digital delivery" : "डिजिटल डिलीवरी",
      body: en
        ? "Files come on WhatsApp after payment. We do not print or courier anything."
        : "भुगतान के बाद फ़ाइलें WhatsApp पर। हम छपाई या कूरियर नहीं करते।",
    },
  ];

  return (
    <div className="min-h-screen bg-page">
      <SiteHeader />

      <main id="order" className="mx-auto max-w-6xl px-4 pt-5">
        {/* Rate strip — gateway reviewers look for prices on the home page. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-[oklch(0.892_0.053_262.7)] bg-brand-soft px-4 py-2.5 text-[13.5px] text-ink2">
          <span className="font-bold text-saffron-deep">{en ? "Rates:" : "रेट:"}</span>
          <span>
            P {p(SERIES_RATES.P)} · S / A {p(SERIES_RATES.S)} · Ph {p(SERIES_RATES.Ph)}{" "}
            {en ? "paise per slip" : "पैसे प्रति पर्ची"}
          </span>
          <span className="text-muted-foreground">
            {en ? "Amount = voters × rate" : "राशि = मतदाता × रेट"}
          </span>
          <Link to="/pricing" className="font-semibold text-primary underline underline-offset-4">
            {en ? "Full rate list" : "पूरी रेट सूची"}
          </Link>
        </div>

        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {t("order.heading")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {en
            ? "Rajasthan panchayat elections — Panch, Sarpanch, Panchayat Samiti and Zila Parishad members."
            : "राजस्थान पंचायत चुनाव — पंच, सरपंच, पंचायत समिति सदस्य और ज़िला परिषद सदस्य।"}
        </p>

        <div className="mt-5">
          <OrderForm />
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-foreground">
            {en ? "What we deliver" : "हम क्या देते हैं"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deliver.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <item.icon className="size-5 text-primary" aria-hidden />
                <p className="mt-2 font-bold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
            <Link
              to="/software"
              className="rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary"
            >
              <Download className="size-5 text-primary" aria-hidden />
              <p className="mt-2 font-bold text-foreground">
                {en ? "Software licence" : "सॉफ़्टवेयर लाइसेंस"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {en
                  ? "For a whole panchayat samiti or district — make unlimited slips on your own computer."
                  : "पूरी पंचायत समिति या ज़िले के लिए — अपने कंप्यूटर पर जितनी चाहें पर्चियाँ।"}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary underline underline-offset-4">
                {en ? "Download the free sample" : "मुफ़्त नमूना डाउनलोड कीजिए"}
              </p>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />

      <a
        href={buildEnquiryWhatsAppUrl(lang)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-success text-white shadow-elevated transition-transform hover:scale-105"
      >
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}
