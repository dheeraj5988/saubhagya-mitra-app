import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Clock3,
  FileText,
  IndianRupee,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/OrderForm";
import { CONTACT_DISPLAY, PRICE_PER_1000, buildEnquiryWhatsAppUrl } from "@/lib/campaign";

const TITLE = "सौभाग्य मतदाता पर्ची सेवा | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "राजस्थान पंचायत चुनाव के लिए सरपंच एवं वार्ड पंच प्रत्याशियों हेतु प्रोफेशनल मतदाता पर्ची — फोटो, चुनाव चिन्ह और नारे के साथ, 24 घंटे में डिलीवरी।";

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
  {
    icon: FileText,
    title: "प्रोफेशनल डिज़ाइन",
    body: "प्रत्याशी की फोटो, चुनाव चिन्ह और नारे के साथ स्पष्ट व आकर्षक मतदाता पर्ची।",
  },
  {
    icon: Clock3,
    title: "24 घंटे में तैयार",
    body: "ऑर्डर मिलते ही डिज़ाइन शुरू — अप्रूवल के बाद तुरंत प्रिंट एवं डिलीवरी।",
  },
  {
    icon: Users,
    title: "बूथवार व्यवस्था",
    body: "वार्ड और बूथ के अनुसार क्रमबद्ध पर्चियाँ, कार्यकर्ताओं के लिए आसान वितरण।",
  },
  {
    icon: ShieldCheck,
    title: "डेटा सुरक्षित",
    body: "आपकी मतदाता सूची व जानकारी पूर्णतः गोपनीय एवं सुरक्षित रखी जाती है।",
  },
];

const BENEFITS: string[] = [
  "उम्मीदवार के नाम व फोटो सहित प्रोफेशनल डिज़ाइन",
  "चुनाव चिन्ह के साथ कस्टम ब्रांडिंग",
  "WhatsApp आधारित त्वरित सपोर्ट",
  "राजस्थान पंचायत चुनावों के लिए विशेष सेवा",
  "ड्राफ्ट अप्रूवल के बाद अंतिम डिलीवरी",
];

const STEPS = [
  { n: "1", title: "फॉर्म भरें", body: "प्रत्याशी, क्षेत्र और चुनाव चिन्ह की जानकारी दर्ज करें।" },
  { n: "2", title: "डिज़ाइन अप्रूवल", body: "WhatsApp पर पर्ची का ड्राफ्ट देखें और मंज़ूरी दें।" },
  { n: "3", title: "प्रिंट एवं डिलीवरी", body: "भुगतान के बाद पर्चियाँ प्रिंट होकर आपके पते पर पहुँचती हैं।" },
];

function Index() {
  const enquiry = buildEnquiryWhatsAppUrl();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-saffron-gradient text-base font-black text-saffron-foreground">
              सौ
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight text-navy">सौभाग्य</p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">मतदाता पर्ची सेवा</p>
            </div>
          </div>
          <Button asChild variant="success" size="sm">
            <a href={enquiry} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-hero-navy px-4 py-14 text-navy-foreground sm:py-20">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-navy-foreground/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-navy-foreground/10 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-navy-foreground/15 px-4 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles className="size-3.5" /> राजस्थान पंचायत चुनाव 2026
            </span>
            <h1 className="mt-5 font-display text-3xl font-black leading-snug sm:text-5xl">
              सौभाग्य — मतदाता पर्ची सेवा
            </h1>
            <p className="mt-4 text-base leading-relaxed text-navy-foreground/90 sm:text-lg">
              सरपंच एवं वार्ड पंच प्रत्याशियों के लिए फोटो, चुनाव चिन्ह और नारे सहित प्रोफेशनल मतदाता
              पर्ची — बूथवार व्यवस्था के साथ, मात्र 24 घंटे में।
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="hero" size="xl">
                <a href="#order">
                  <FileText className="size-5" /> अभी ऑर्डर करें
                </a>
              </Button>
              <Button asChild variant="outline" size="xl" className="border-navy-foreground/70 bg-navy-foreground/10 text-navy-foreground hover:bg-navy-foreground/20">
                <a href={`tel:+91${CONTACT_DISPLAY.replace(/\D/g, "").slice(-10)}`}>
                  <Phone className="size-5" /> {CONTACT_DISPLAY}
                </a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-foreground/85">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-4" /> 500+ प्रत्याशियों का भरोसा
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-4" /> पूरे राजस्थान में डिलीवरी
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            हमारी सेवा क्यों चुनें?
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-saffron/12 text-saffron-deep">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-navy">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="bg-muted/50 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
              कैसे काम करता है?
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <span className="grid size-10 place-items-center rounded-full bg-navy text-lg font-black text-navy-foreground">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-navy">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Trust / conversion */}
        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
            क्यों चुनें सौभाग्य मतदाता पर्ची सेवा?
          </h2>
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 rounded-2xl border border-saffron/25 bg-card p-4 shadow-card"
              >
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-saffron-deep" />
                <span className="text-sm font-medium leading-relaxed text-foreground sm:text-base">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 text-center">
            <Button asChild variant="hero" size="xl">
              <a href="#order">
                <FileText className="size-5" /> अभी ऑर्डर करें
              </a>
            </Button>
          </div>
        </section>


        {/* Order form */}
        <section id="order" className="scroll-mt-20 bg-muted/50 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">ऑर्डर फॉर्म भरें</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                सभी जानकारी सही भरें — सबमिट करते ही ऑर्डर आईडी मिलेगी और WhatsApp चैट खुलेगी।
              </p>
            </div>
            <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-elevated sm:p-8">
              <OrderForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-navy px-4 py-10 text-navy-foreground/85">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-display text-lg font-bold text-navy-foreground">सौभाग्य मतदाता पर्ची सेवा</p>
          <p className="mt-2 text-sm">राजस्थान पंचायत चुनाव हेतु विश्वसनीय प्रिंटिंग एवं डिज़ाइन सेवा</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="success" size="lg">
              <a href={enquiry} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> WhatsApp पर संपर्क करें
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-navy-foreground/40 bg-navy-foreground/10 text-navy-foreground hover:bg-navy-foreground/20">
              <a href={`tel:+91${CONTACT_DISPLAY.replace(/\D/g, "").slice(-10)}`}>
                <Phone className="size-4" /> {CONTACT_DISPLAY}
              </a>
            </Button>
          </div>
          <p className="mt-8 text-xs text-navy-foreground/60">
            © {new Date().getFullYear()} सौभाग्य मतदाता पर्ची सेवा. सर्वाधिकार सुरक्षित.
          </p>
        </div>
      </footer>

      {/* Mobile sticky WhatsApp CTA */}
      <a
        href={enquiry}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp पर संपर्क करें"
        className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-success text-success-foreground shadow-elevated transition-transform hover:scale-105"
      >
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}
