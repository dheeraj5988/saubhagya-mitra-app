import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_DISPLAY, SUPPORT_EMAIL } from "@/lib/campaign";

const TITLE = "Terms & Conditions | Saubhagya Matdata Parchi";
const DESCRIPTION =
  "Terms and conditions for ordering printed voter slips (matdata parchi) for Rajasthan panchayat election candidates.";

export const Route = createFileRoute("/terms")({
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
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms & Conditions">
      <LegalSection title="1. About the service">
        <p>
          Saubhagya Matdata Parchi ("we", "us") prepares and supplies printed voter slips (matdata
          parchi) for Sarpanch and Ward Panch candidates contesting panchayat elections in
          Rajasthan. By placing an order on this website you accept these terms.
        </p>
      </LegalSection>

      <LegalSection title="2. Orders and information you provide">
        <p>
          You are responsible for the accuracy of every detail you submit: candidate names, ward,
          gram panchayat, panchayat samiti, district, election symbol, slogan, photograph and
          mobile number. We print exactly what is approved in the draft you confirm on WhatsApp.
        </p>
        <p>
          You confirm that you have the right to use every photograph, name, symbol and slogan you
          upload, and that the content does not violate any law or the directions of the State
          Election Commission.
        </p>
      </LegalSection>

      <LegalSection title="3. Pricing">
        <p>
          The order amount is calculated as the voter count of the selected ward multiplied by the
          current per-voter rate shown on the order form. The amount displayed before payment is
          the amount payable. Taxes, where applicable, are included in the displayed amount.
        </p>
        <p>
          A free sample of up to 24 voter slips is available on request so you can verify quality
          and layout before paying.
        </p>
      </LegalSection>

      <LegalSection title="4. Draft approval and production">
        <p>
          After an order is placed we share a draft on WhatsApp. Production begins only after you
          approve the draft. Once printing has begun, changes to names, symbol, photograph or
          layout may not be possible.
        </p>
      </LegalSection>

      <LegalSection title="5. Payments">
        <p>
          Online payments are processed by our payment gateway partner. We do not store your card,
          UPI or banking credentials on our servers.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>
          You may not use this service for content that is obscene, defamatory, communal, or that
          breaches the model code of conduct or any election law. We may refuse or cancel any order
          that, in our judgement, breaches these rules.
        </p>
      </LegalSection>

      <LegalSection title="7. Liability">
        <p>
          Our liability for any order is limited to the amount you paid for that order. We are not
          liable for election outcomes, printing errors present in an approved draft, or delays
          caused by events beyond our control.
        </p>
      </LegalSection>

      <LegalSection title="8. Governing law">
        <p>
          These terms are governed by the laws of India, and the courts of Rajasthan have exclusive
          jurisdiction over any dispute.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Questions about these terms: {CONTACT_DISPLAY} or {SUPPORT_EMAIL}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
