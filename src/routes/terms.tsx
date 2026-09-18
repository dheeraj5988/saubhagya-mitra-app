import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Terms & Conditions | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "Terms and conditions for ordering printed voter slips (matdata parchi) for Rajasthan panchayat election candidates.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  const { t } = useI18n();
  return (
    <LegalPage title={t("legal.terms.page_title")}>
      <LegalSection title={t("legal.terms.sec1.title")}>
        <p>{t("legal.dom.3")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec2.title")}>
        <p>{t("legal.dom.4")}</p>
        <p>{t("legal.dom.5")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec3.title")}>
        <p>{t("legal.dom.6")}</p>
        <p>{t("legal.dom.7")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec4.title")}>
        <p>{t("legal.dom.8")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec5.title")}>
        <p>{t("legal.dom.9")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec6.title")}>
        <p>{t("legal.dom.10")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec7.title")}>
        <p>{t("legal.dom.11")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec8.title")}>
        <p>{t("legal.dom.12")}</p>
      </LegalSection>

      <LegalSection title={t("legal.terms.sec9.title")}>
        <p>
          {t("legal.terms.sec9.p1")} {CONTACT_DISPLAY} or {SUPPORT_EMAIL}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
