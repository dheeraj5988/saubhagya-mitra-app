import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CONTACT_DISPLAY, SUPPORT_EMAIL, buildEnquiryWhatsAppUrl } from "@/lib/campaign";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-bold text-navy">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

export function LegalPage({
  title,
  updated = "January 2026",
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-navy px-4 py-4 text-navy-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg font-bold">
            सौभाग्य मतदाता पर्ची सेवा
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-navy-foreground/40 bg-navy-foreground/10 text-navy-foreground hover:bg-navy-foreground/20"
          >
            <Link to="/">
              <ArrowLeft className="size-4" /> Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div>
          <h1 className="font-display text-3xl font-black text-navy">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Last updated: {updated}</p>
        </div>

        {children}

        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="font-display text-lg font-bold text-navy">Reach us</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="success" size="sm">
              <a href={buildEnquiryWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`tel:+${CONTACT_DISPLAY.replace(/\D/g, "")}`}>
                <Phone className="size-4" /> {CONTACT_DISPLAY}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail className="size-4" /> {SUPPORT_EMAIL}
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
