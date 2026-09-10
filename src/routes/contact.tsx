import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/LegalPage";
import { BUSINESS_ADDRESS, BUSINESS_NAME, CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Contact Us | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "Contact the Saubhagya Matdata Parchi team on WhatsApp, phone or email for voter slip orders and support in Rajasthan.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <LegalPage title="Contact Us">
      <LegalSection title="Talk to our team">
        <p>
          WhatsApp and calls: {CONTACT_DISPLAY}
          <br />
          Email: {SUPPORT_EMAIL}
        </p>
      </LegalSection>

      <LegalSection title="Business address">
        <p>
          {BUSINESS_NAME}
          <br />
          {BUSINESS_ADDRESS}
        </p>
      </LegalSection>

      <LegalSection title="Service area">
        <p>
          We serve Sarpanch and Ward Panch candidates across Rajasthan — district, panchayat samiti,
          gram panchayat and ward wise.
        </p>
      </LegalSection>

      <LegalSection title="Order support">
        <p>
          Keep your Order ID (for example SBG-1234) handy when you write to us; it lets us pull up
          your draft, payment and delivery status immediately.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
