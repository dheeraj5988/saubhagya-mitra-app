import { createFileRoute } from "@tanstack/react-router";

import { LegalSection, PolicyPage, policyHead } from "@/components/LegalPage";
import { TERMS, legalLine } from "@/content/policies";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () =>
    policyHead(
      "Terms & Conditions | Saubhagya Voter Slip",
      "Terms for ordering print-ready digital voter slips (PDF) for Rajasthan panchayat election candidates.",
    ),
  component: TermsPage,
});

function TermsPage() {
  const { lang } = useI18n();
  return (
    <PolicyPage doc={TERMS}>
      <LegalSection
        title={lang === "en" ? "10. Contact and business details" : "10. संपर्क और व्यापार-विवरण"}
      >
        {legalLine(lang).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </LegalSection>
    </PolicyPage>
  );
}
