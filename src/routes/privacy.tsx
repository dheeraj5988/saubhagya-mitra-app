import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { PRIVACY } from "@/content/policies";

export const Route = createFileRoute("/privacy")({
  head: () =>
    policyHead(
      "Privacy Policy | Saubhagya Voter Slip",
      "How Saubhagya Voter Slip collects, uses and protects order information, and the source of voter data.",
    ),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <PolicyPage doc={PRIVACY} showDate={true} />;
}
