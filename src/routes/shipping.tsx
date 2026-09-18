import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_DISPLAY } from "@/lib/campaign";

const TITLE = "Shipping & Delivery Policy | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "Delivery timelines, courier coverage and digital delivery terms for voter slip orders in Rajasthan.";

export const Route = createFileRoute("/shipping")({
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
  component: Shipping,
});

function Shipping() {
  const { t } = useI18n();
  return (
    <LegalPage title={t("legal.shipping.page_title")}>
      <LegalSection title={t("legal.shipping.sec1.title")}>
        <p>{t("legal.shipping.sec1.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.shipping.sec2.title")}>
        <p>{t("legal.shipping.sec2.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.shipping.sec3.title")}>
        <p>{t("legal.shipping.sec3.p1")}</p>
        <p>{t("legal.shipping.sec3.p2")}</p>
      </LegalSection>

      <LegalSection title={t("legal.shipping.sec4.title")}>
        <p>{t("legal.shipping.sec4.p1")}</p>
      </LegalSection>

      <LegalSection title={t("legal.shipping.sec5.title")}>
        <p>{t("legal.shipping.sec5.p1")} {CONTACT_DISPLAY} {t("legal.shipping.sec5.p2")}</p>
      </LegalSection>
    </LegalPage>
  );
}
