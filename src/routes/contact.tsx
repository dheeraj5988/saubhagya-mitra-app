import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";

import { LegalSection, PolicyPage, policyHead } from "@/components/LegalPage";
import { Button } from "@/components/ui/button";
import { CONTACT, legalLine } from "@/content/policies";
import { CONTACT_DISPLAY, CONTACT_EMAIL, ORDERS_EMAIL } from "@/lib/business";
import { buildEnquiryWhatsAppUrl } from "@/lib/campaign";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () =>
    policyHead(
      "Contact Us | Saubhagya",
      "Contact Saubhagya on WhatsApp, phone or email — orders, payments and support for Rajasthan panchayat campaign slips.",
    ),
  component: ContactPage,
});

function ContactPage() {
  const { lang } = useI18n();
  const en = lang === "en";
  return (
    <PolicyPage doc={CONTACT} showDate={false}>
      <LegalSection title={en ? "Business details" : "व्यापार-विवरण"}>
        {legalLine(lang).map((line) => (
          <p key={line}>{line}</p>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="success" size="sm">
            <a href={buildEnquiryWhatsAppUrl(lang)} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`tel:+${CONTACT_DISPLAY.replace(/\D/g, "")}`}>
              <Phone /> {CONTACT_DISPLAY}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${ORDERS_EMAIL}`}>
              <Mail /> {ORDERS_EMAIL}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Mail /> {CONTACT_EMAIL}
            </a>
          </Button>
        </div>
      </LegalSection>
    </PolicyPage>
  );
}
