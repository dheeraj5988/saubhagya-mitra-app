import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Clock3,
  FileText,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OrderForm } from "@/components/OrderForm";
import { CONTACT_DISPLAY, buildEnquiryWhatsAppUrl } from "@/lib/campaign";
import { useI18n, type TKey } from "@/lib/i18n";

const TITLE = "सौभाग्य मतदाता पर्ची सेवा | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "राजस्थान पंचायत चुनाव के लिए सरपंच एवं वार्ड पंच प्रत्याशियों हेतु प्रोफेशनल मतदाता पर्ची — फोटो, चुनाव चिन्ह और नारे के साथ, ड्राफ्ट अप्रूवल के बाद शीघ्र डिलीवरी।";

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

const FEATURES = [
  { icon: FileText, title: "features.1.title", body: "features.1.body" },
  { icon: Clock3, title: "features.2.title", body: "features.2.body" },
  { icon: Users, title: "features.3.title", body: "features.3.body" },
  { icon: ShieldCheck, title: "features.4.title", body: "features.4.body" },
] satisfies { icon: typeof FileText; title: TKey; body: TKey }[];

const BENEFITS: TKey[] = ["trust.1", "trust.2", "trust.3", "trust.4", "trust.5"];

const STEPS = [
  { n: "1", title: "steps.1.title", body: "steps.1.body" },
  { n: "2", title: "steps.2.title", body: "steps.2.body" },
  { n: "3", title: "steps.3.title", body: "steps.3.body" },
] satisfies { n: string; title: TKey; body: TKey }[];

function Index() {
  const { t, lang } = useI18n();
  const enquiry = buildEnquiryWhatsAppUrl(lang);
  const tel = `tel:+91${CONTACT_DISPLAY.replace(/\D/g, "").slice(-10)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-saffron-gradient text-base font-black text-saffron-foreground">
              सौ
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight text-navy">
                {t("brand.name")}
              </p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {t("brand.tagline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="success" size="sm">
              <a href={enquiry} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">{t("nav.whatsapp")}</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-hero-navy px-4 py-14 text-navy-foreground sm:py-20">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-navy-foreground/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-navy-foreground/10 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-navy-foreground/15 px-4 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles className="size-3.5" /> {t("hero.badge")}
            </span>
            <h1 className="mt-5 font-display text-3xl font-black leading-snug sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-navy-foreground/90 sm:text-lg">
              {t("hero.body")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="hero" size="xl">
                <a href="#order">
                  <FileText className="size-5" /> {t("hero.cta")}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="border-navy-foreground/70 bg-navy-foreground/10 text-navy-foreground hover:bg-navy-foreground/20"
              >
                <a href={tel}>
                  <Phone className="size-5" /> {CONTACT_DISPLAY}
                </a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-foreground/85">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-4" /> {t("hero.trust1")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-4" /> {t("hero.trust2")}
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            {t("features.heading")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <span className="grid size-11 place-items-center rounded-xl bg-saffron/12 text-saffron-deep">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-navy">{t(f.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(f.body)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="bg-muted/50 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
              {t("steps.heading")}
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <span className="grid size-10 place-items-center rounded-full bg-navy text-lg font-black text-navy-foreground">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-navy">{t(s.title)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(s.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Trust / conversion */}
        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            {t("trust.heading")}
          </h2>
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-saffron/25 bg-card p-4 shadow-card"
              >
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-saffron-deep" />
                <span className="text-sm font-medium leading-relaxed text-foreground sm:text-base">
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-7 text-center">
            <Button asChild variant="hero" size="xl">
              <a href="#order">
                <FileText className="size-5" /> {t("hero.cta")}
              </a>
            </Button>
          </div>
        </section>

        {/* Order form */}
        <section id="order" className="scroll-mt-20 bg-muted/50 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
                {t("order.heading")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("order.subheading")}</p>
            </div>
            <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-8">
              <OrderForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-navy px-4 py-10 text-navy-foreground/85">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-display text-lg font-bold text-navy-foreground">{t("brand.full")}</p>
          <p className="mt-2 text-sm">{t("footer.tagline")}</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="success" size="lg">
              <a href={enquiry} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> {t("footer.whatsapp")}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-navy-foreground/40 bg-navy-foreground/10 text-navy-foreground hover:bg-navy-foreground/20"
            >
              <a href={tel}>
                <Phone className="size-4" /> {CONTACT_DISPLAY}
              </a>
            </Button>
          </div>
          <p className="mt-8 text-xs text-navy-foreground/60">
            © {new Date().getFullYear()} {t("brand.full")}. {t("footer.rights")}
          </p>
        </div>
      </footer>

      {/* Mobile sticky WhatsApp CTA */}
      <a
        href={enquiry}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("footer.whatsapp")}
        className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-success text-success-foreground shadow-elevated transition-transform hover:scale-105"
      >
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}
