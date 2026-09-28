import { createFileRoute } from "@tanstack/react-router";

import { LegalSection, PolicyPage, policyHead } from "@/components/LegalPage";
import { TERMS, legalLine } from "@/content/policies";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () =>
    policyHead(
      "Terms & Conditions | Saubhagya",
      "Terms for print-ready digital campaign slips (PDF), data processing and software licences for Rajasthan election candidates.",
    ),
  component: TermsPage,
});

function TermsPage() {
  const { lang } = useI18n();
  return (
    <PolicyPage doc={TERMS}>
      <LegalSection
        title={lang === "en" ? "15. Contact and business details" : "15. संपर्क और व्यापार-विवरण"}
      >
        {legalLine(lang).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </LegalSection>
    </PolicyPage>
  );
}
