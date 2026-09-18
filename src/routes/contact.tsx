import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { BUSINESS_ADDRESS, BUSINESS_NAME, CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Contact Us | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "Contact the Saubhagya Matdata Parchi team on WhatsApp, phone or email for voter slip orders and support in Rajasthan.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useI18n();
  return (
    <LegalPage title={t("legal.contact.page_title")}>
      <LegalSection title={t("legal.contact.sec1.title")}>
        <p>{t("legal.contact.sec1.whatsapp")}{CONTACT_DISPLAY}<br />{t("legal.contact.sec1.email")}{SUPPORT_EMAIL}</p>
      </LegalSection>

      <LegalSection title={t("legal.contact.sec2.title")}>
        <p>
          {BUSINESS_NAME}
          <br />
          {BUSINESS_ADDRESS}
        </p>
      </LegalSection>

      <LegalSection title={t("legal.contact.sec3.title")}>
        <p>{t("legal.contact.sec3.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.contact.sec4.title")}>
        <p>{t("legal.contact.sec4.p1")}</p>
      </LegalSection>
    </LegalPage>
  );
}
