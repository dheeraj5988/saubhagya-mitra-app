import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <LegalPage title="Shipping & Delivery Policy">
      <LegalSection title="Order processing">
        <p>
          Every order begins with a design draft shared on WhatsApp for your approval. Printing
          starts after the draft is approved and payment is confirmed.
        </p>
      </LegalSection>

      <LegalSection title="Digital delivery">
        <p>
          Print-ready files are shared on the WhatsApp number submitted with the order. Digital
          files are normally shared within 1-2 working days of draft approval.
        </p>
      </LegalSection>

      <LegalSection title="Printed delivery">
        <p>
          Printed voter slips are dispatched to the address confirmed with our team over WhatsApp.
          Delivery within Rajasthan typically takes 2-5 working days after printing, depending on
          the quantity and your location.
        </p>
        <p>
          During peak election periods timelines can extend. If your polling date is close, tell us
          before ordering so we can confirm whether we can meet it.
        </p>
      </LegalSection>

      <LegalSection title="Delivery charges">
        <p>
          Standard delivery within Rajasthan is included in the order amount. Any express or
          out-of-state courier requirement is quoted separately and confirmed with you before
          dispatch.
        </p>
      </LegalSection>

      <LegalSection title="Tracking and support">
        <p>
          Dispatch details and tracking, where available, are shared on WhatsApp. For any delivery
          question, message {CONTACT_DISPLAY} with your Order ID.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
