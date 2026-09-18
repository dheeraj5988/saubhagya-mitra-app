import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Refund & Cancellation Policy | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "Cancellation and refund terms for voter slip orders placed with Saubhagya Matdata Parchi.";

export const Route = createFileRoute("/refund")({
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
  component: Refund,
});

function Refund() {
  const { t } = useI18n();
  return (
    <LegalPage title={t("legal.refund.page_title")}>
      <LegalSection title={t("legal.refund.sec1.title")}>
        <p>{t("legal.refund.sec1.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refund.sec2.title")}>
        <p>{t("legal.refund.sec2.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refund.sec3.title")}>
        <p>{t("legal.refund.sec3.p1")}</p>
        <p>{t("legal.refund.sec3.p2")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refund.sec4.title")}>
        <p>{t("legal.refund.sec4.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refund.sec5.title")}>
        <p>{t("legal.refund.sec5.p1")} {CONTACT_DISPLAY} {t("legal.refund.sec5.p2")} {SUPPORT_EMAIL} {t("legal.refund.sec5.p3")}</p>
      </LegalSection>

      <LegalSection title={t("legal.refund.sec6.title")}>
        <p>{t("legal.refund.sec6.p1")}</p>
      </LegalSection>
    </LegalPage>
  );
}
