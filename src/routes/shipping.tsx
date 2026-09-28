import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { DELIVERY } from "@/content/policies";

export const Route = createFileRoute("/shipping")({
  head: () =>
    policyHead(
      "Delivery Policy (Digital) | Saubhagya",
      "All orders are delivered digitally on WhatsApp or by download link — no physical shipping.",
    ),
  component: ShippingPage,
});

function ShippingPage() {
  return <PolicyPage doc={DELIVERY} showDate={true} />;
}
