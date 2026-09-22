import { Link, useRouterState } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { legalLine } from "@/content/policies";
import {
  CONTACT_DISPLAY,
  ORDERS_EMAIL,
  TRADE_NAME_EN,
  TRADE_NAME_HI,
  copyrightName,
} from "@/lib/business";
import { buildEnquiryWhatsAppUrl, buildSampleWhatsAppUrl } from "@/lib/campaign";
import { useI18n } from "@/lib/i18n";

const tel = `tel:+${CONTACT_DISPLAY.replace(/\D/g, "")}`;

const NAV = [
  { to: "/", hi: "ऑर्डर", en: "Order" },
  { to: "/pricing", hi: "रेट सूची", en: "Pricing" },
  { to: "/software", hi: "सॉफ़्टवेयर", en: "Software" },
  { to: "/about", hi: "हमारे बारे में", en: "About" },
  { to: "/contact", hi: "संपर्क", en: "Contact" },
] as const;

/** Sticky gradient header — same look as the Windows app's title bar. */
export function SiteHeader() {
  const { t, lang } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-hero-navy text-white shadow-[var(--shadow-elevated)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-gold text-sm font-extrabold text-navy"
          >
            सौ
          </span>
          <span className="truncate text-[17px] font-bold">
            {t("brand.name")}
          </span>
        </Link>
        <span className="hidden rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] text-blue-100 ring-1 ring-white/15 md:inline">
          {lang === "en" ? "Rajasthan panchayat elections" : "राजस्थान पंचायत चुनाव"}
        </span>
        <nav className="order-last flex w-full gap-1 overflow-x-auto text-[13px] sm:order-none sm:ml-2 sm:w-auto">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-full px-3 py-1 text-blue-100 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "bg-white/15 text-white" }}
              activeOptions={{ exact: true }}
            >
              {lang === "en" ? item.en : item.hi}
            </Link>
          ))}
        </nav>
        <span className="flex-1" />
        <a
          href={tel}
          className="hidden rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] text-blue-100 ring-1 ring-white/15 lg:inline"
        >
          {CONTACT_DISPLAY}
        </a>
        <LanguageSwitcher />
        <a
          href={buildEnquiryWhatsAppUrl(lang)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
        >
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>
    </header>
  );
}

const POLICY_LINKS = [
  { to: "/about", hi: "हमारे बारे में", en: "About Us" },
  { to: "/pricing", hi: "रेट सूची", en: "Pricing" },
  { to: "/terms", hi: "नियम एवं शर्तें", en: "Terms & Conditions" },
  { to: "/privacy", hi: "गोपनीयता नीति", en: "Privacy Policy" },
  { to: "/refund", hi: "रिफंड एवं रद्दीकरण", en: "Refund & Cancellation" },
  { to: "/shipping", hi: "डिलीवरी नीति (डिजिटल)", en: "Delivery Policy (Digital)" },
  { to: "/contact", hi: "संपर्क करें", en: "Contact Us" },
] as const;

/** Full business/legal block stays expanded on these pages (gateway requirement). */
const LEGAL_EXPANDED_PAGES = new Set([
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund",
  "/shipping",
]);

/** Footer with the legal line and bilingual policy links (gateway requirement). */
export function SiteFooter() {
  const { lang } = useI18n();
  const en = lang === "en";
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const legalExpanded = LEGAL_EXPANDED_PAGES.has(pathname.replace(/\/$/, "") || "/");
  return (
    <footer className="mt-12 bg-navy px-4 pb-24 pt-10 text-white/85 sm:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg font-bold text-white">{en ? TRADE_NAME_EN : TRADE_NAME_HI}</p>
          <p className="mt-1 text-sm text-white/70">
            {en
              ? "Print-ready digital voter slips and voter-slip software for Rajasthan panchayat election candidates. Digital delivery only — we do not print or ship."
              : "राजस्थान पंचायत चुनाव के प्रत्याशियों के लिए छपाई-योग्य डिजिटल वोटर स्लिप और सॉफ़्टवेयर। सिर्फ़ डिजिटल डिलीवरी — हम छपाई या कूरियर नहीं करते।"}
          </p>
          {/* Expanded on policy pages; a tidy dropdown on the homepage and elsewhere. */}
          <details key={pathname} open={legalExpanded} className="group mt-4">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-white/90 underline-offset-4 marker:content-none hover:underline">
              {en ? "Business information" : "व्यवसाय की जानकारी"}
              <span className="ml-1 text-white/55 transition-transform group-open:hidden">▸</span>
              <span className="ml-1 hidden text-white/55 group-open:inline">▾</span>
            </summary>
            <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-white/80">
              {legalLine(lang).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={buildEnquiryWhatsAppUrl(lang)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white hover:brightness-110"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <a
              href={tel}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"
            >
              <Phone className="size-4" /> {CONTACT_DISPLAY}
            </a>
            <a
              href={`mailto:${ORDERS_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"
            >
              <Mail className="size-4" /> {ORDERS_EMAIL}
            </a>
          </div>
          <p className="mt-4 text-[13px] text-white/70">
            {en ? "Want to see a sample first? " : "पहले नमूना देखना है? "}
            <a
              href={buildSampleWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-4"
            >
              {en ? "Ask on WhatsApp" : "WhatsApp पर माँगिए"}
            </a>
            {" · "}
            <Link to="/software" className="font-semibold text-white underline underline-offset-4">
              {en ? "Free sample software" : "मुफ़्त नमूना सॉफ़्टवेयर"}
            </Link>
          </p>
        </div>

        <nav aria-label={en ? "Policies" : "नीतियाँ"}>
          <p className="text-sm font-bold text-white">{en ? "Policies" : "नीतियाँ · Policies"}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {POLICY_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white hover:underline underline-offset-4">
                  {en ? item.en : `${item.hi} · ${item.en}`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-5 text-xs text-white/55">
        © {new Date().getFullYear()} {copyrightName(lang)} ·{" "}
        {en ? "All rights reserved." : "सर्वाधिकार सुरक्षित।"}
      </p>
    </footer>
  );
}
