import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <LegalSection title="Before draft approval">
        <p>
          You may cancel an order any time before you approve the printing draft. The full amount
          paid is refunded to the original payment method.
        </p>
      </LegalSection>

      <LegalSection title="After draft approval">
        <p>
          Voter slips are printed to order and carry your name, photograph and ward, so they cannot
          be resold. Once you approve the draft and production begins, the order cannot be
          cancelled and the amount is non-refundable.
        </p>
      </LegalSection>

      <LegalSection title="Defective or incorrect work">
        <p>
          If the delivered slips differ from the approved draft, or arrive damaged, report it
          within 48 hours of delivery with photographs. We will reprint the affected quantity free
          of charge, or refund it if a reprint is no longer useful before your election date.
        </p>
        <p>
          Errors already present in the draft you approved are not covered, because printing
          follows the approved draft exactly.
        </p>
      </LegalSection>

      <LegalSection title="Failed or duplicate payments">
        <p>
          If money is debited but the order is not created, or you are charged twice, the amount is
          refunded in full. Bank settlement usually takes 5-7 working days.
        </p>
      </LegalSection>

      <LegalSection title="How to request a refund">
        <p>
          Message {CONTACT_DISPLAY} on WhatsApp or email {SUPPORT_EMAIL} with your Order ID and the
          reason. Approved refunds are initiated within 3 working days and credited to the original
          payment method.
        </p>
      </LegalSection>

      <LegalSection title="Free sample">
        <p>
          The free 24-voter sample carries no charge, so no refund arises for it.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
