import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Privacy Policy | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "How Saubhagya Matdata Parchi collects, uses and protects candidate details, photographs and contact information.";

export const Route = createFileRoute("/privacy")({
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
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection title="What we collect">
        <p>
          To prepare your voter slips we collect the candidate name (Hindi and English), mobile
          number, district, panchayat samiti, gram panchayat, ward number, election symbol, an
          optional slogan and the candidate photograph you upload.
        </p>
        <p>
          For security and analytics we also record the IP address and browser details of visits to
          this site, and the mobile number you enter on the order form even if the order is not
          completed, so our team can help you finish it.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          Your information is used only to design, print and deliver your order, to contact you on
          WhatsApp or phone about that order, to process payment, and to prevent misuse of the
          service.
        </p>
        <p>We do not sell your data and we do not use it for unrelated marketing.</p>
      </LegalSection>

      <LegalSection title="Storage and security">
        <p>
          Candidate photographs are stored in private storage and are never publicly accessible.
          Access is limited to our operations team through an authenticated internal console, using
          short-lived links. Payment credentials are handled by our payment gateway partner and are
          never stored on our servers.
        </p>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>
          We share information only with the service providers needed to fulfil your order —
          hosting, payment processing and printing/delivery partners — and where the law requires
          it.
        </p>
      </LegalSection>

      <LegalSection title="Retention and your choices">
        <p>
          Order records are retained for our accounting and support obligations. You may ask us to
          delete your photograph and contact details after delivery by writing to {SUPPORT_EMAIL}{" "}
          or messaging {CONTACT_DISPLAY}. We will act on the request unless we are required to keep
          the record.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>This service is intended for election candidates and is not directed at children.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy; the revised date at the top of this page shows when it last
          changed.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
