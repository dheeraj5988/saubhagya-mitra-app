import { Link, createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OrderForm } from "@/components/OrderForm";
import { CONTACT_DISPLAY, buildEnquiryWhatsAppUrl } from "@/lib/campaign";
import { useI18n } from "@/lib/i18n";

const TITLE = "सौभाग्य मतदाता पर्ची सेवा | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "राजस्थान पंचायत चुनाव के लिए सरपंच एवं वार्ड पंच प्रत्याशियों हेतु मतदाता पर्ची आवेदन — क्षेत्र चुनें, डिज़ाइन चुनें और आवेदन भेजें।";

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

function Index() {
  const { t, lang } = useI18n();
  const enquiry = buildEnquiryWhatsAppUrl(lang);
  const tel = `tel:+91${CONTACT_DISPLAY.replace(/\D/g, "").slice(-10)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo-512.png"
              alt={t("brand.full")}
              className="size-8 shrink-0 rounded-full bg-white p-1 sm:size-10"
            />
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

      <main id="order" className="px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-xl font-bold text-navy sm:text-2xl">
            {t("order.heading")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("order.subheading")}</p>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <OrderForm />
          </div>
        </div>
      </main>

      <footer className="mt-10 bg-navy px-4 py-8 text-navy-foreground/85">
        <div className="mx-auto max-w-3xl text-center">
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
          <nav
            aria-label={t("footer.legal")}
            className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm"
          >
            <Link to="/terms" className="underline-offset-4 hover:underline">
              {t("legal.terms")}
            </Link>
            <Link to="/privacy" className="underline-offset-4 hover:underline">
              {t("legal.privacy")}
            </Link>
            <Link to="/refund" className="underline-offset-4 hover:underline">
              {t("legal.refund")}
            </Link>
            <Link to="/shipping" className="underline-offset-4 hover:underline">
              {t("legal.shipping")}
            </Link>
            <Link to="/contact" className="underline-offset-4 hover:underline">
              {t("legal.contact")}
            </Link>
          </nav>
          <p className="mt-6 text-xs text-navy-foreground/60">
            © {new Date().getFullYear()} {t("brand.full")}. {t("footer.rights")}
          </p>
        </div>
      </footer>

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
