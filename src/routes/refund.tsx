import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { REFUND } from "@/content/policies";

export const Route = createFileRoute("/refund")({
  head: () =>
    policyHead(
      "Refund & Cancellation Policy | Saubhagya",
      "Cancellation and refund rules for digital campaign slip orders.",
    ),
  component: RefundPage,
});

function RefundPage() {
  return <PolicyPage doc={REFUND} showDate={true} />;
}
