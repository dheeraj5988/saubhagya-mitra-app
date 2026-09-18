import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Privacy Policy | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "How Saubhagya Matdata Parchi collects, uses and protects candidate details, photographs and contact information.";

export const Route = createFileRoute("/privacy")({
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
  component: Privacy,
});

function Privacy() {
  const { t } = useI18n();
  return (
    <LegalPage title={t("legal.privacy.page_title")}>
      <LegalSection title={t("legal.privacy.sec1.title")}>
        <p>{t("legal.privacy.sec1.p1")}</p>
        <p>{t("legal.privacy.sec1.p2")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.sec2.title")}>
        <p>{t("legal.privacy.sec2.p1")}</p>
        <p>{t("legal.dom.1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.sec3.title")}>
        <p>{t("legal.privacy.sec3.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.sec4.title")}>
        <p>{t("legal.privacy.sec4.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.sec5.title")}>
        <p>{t("legal.privacy.sec5.p1")} {SUPPORT_EMAIL}{" "} {t("legal.privacy.sec5.p2")} {CONTACT_DISPLAY}{t("legal.privacy.sec5.p3")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.sec6.title")}>
        <p>{t("legal.dom.2")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacy.sec7.title")}>
        <p>{t("legal.privacy.sec7.p1")}</p>
      </LegalSection>
    </LegalPage>
  );
}
