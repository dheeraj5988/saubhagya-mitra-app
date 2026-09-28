import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { PRIVACY } from "@/content/policies";

export const Route = createFileRoute("/privacy")({
  head: () =>
    policyHead(
      "Privacy Policy | Saubhagya",
      "How Saubhagya collects, uses and protects order information.",
    ),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <PolicyPage doc={PRIVACY} showDate={true} />;
}
