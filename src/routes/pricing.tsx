import { Link, createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection, policyHead } from "@/components/LegalPage";
import { PRICING_EXAMPLE_VOTERS, PRICING_NOTES, PRICING_ROWS } from "@/content/policies";
import { useI18n } from "@/lib/i18n";
import { computeAmount, formatInr } from "@/lib/pricing";

export const Route = createFileRoute("/pricing")({
  head: () =>
    policyHead(
      "Pricing | Saubhagya Voter Slip",
      "Per-slip rates for digital voter slips: P 15 paise, S / A 16 paise, Ph 20 paise. Amount = voters × rate.",
    ),
  component: PricingPage,
});

function PricingPage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const example = PRICING_EXAMPLE_VOTERS.toLocaleString("en-IN");

  return (
    <LegalPage
      title={en ? "Pricing" : "रेट सूची"}
      intro={
        en
          ? "Amount = voters in the ward / booths you select × per-slip rate. Nothing else is added."
          : "राशि = आपके चुने वार्ड / भाग के मतदाता × प्रति-पर्ची रेट। इसके अलावा कुछ नहीं जुड़ता।"
      }
    >
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-brand-soft text-[13px] text-saffron-deep">
            <tr>
              <th className="px-4 py-3 font-bold">{en ? "Series" : "सीरीज़"}</th>
              <th className="px-4 py-3 font-bold">{en ? "What you get" : "क्या मिलता है"}</th>
              <th className="px-4 py-3 font-bold">{en ? "Designs" : "डिज़ाइन"}</th>
              <th className="px-4 py-3 font-bold">{en ? "Rate" : "रेट"}</th>
              <th className="px-4 py-3 font-bold">
                {en ? `For ${example} voters` : `${example} मतदाता पर`}
              </th>
            </tr>
          </thead>
          <tbody>
            {PRICING_ROWS.map((row) => (
              <tr key={row.series} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white">
                    {row.series}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink2">{row.what[lang]}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{row.designs}</td>
                <td className="px-4 py-3 whitespace-nowrap font-bold">
                  {Math.round(row.rate * 100)} {en ? "paise / slip" : "पैसे / पर्ची"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-bold text-saffron-deep">
                  {formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="px-4 py-3">
                <span className="rounded-md bg-muted-foreground px-2 py-0.5 text-xs font-bold text-white">
                  {en ? "Sample" : "नमूना"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink2" colSpan={2}>
                {en ? "Sample slips on request (WhatsApp)" : "अनुरोध पर नमूना (WhatsApp)"}
              </td>
              <td className="px-4 py-3 font-bold">₹0</td>
              <td className="px-4 py-3">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <LegalSection title={en ? "Good to know" : "ध्यान दीजिए"}>
        {PRICING_NOTES.map((note) => (
          <p key={note.en}>{note[lang]}</p>
        ))}
        <p>
          {en ? "Refunds and cancellations: " : "रिफंड और रद्दीकरण: "}
          <Link to="/refund" className="font-semibold text-primary underline underline-offset-4">
            {en ? "Refund & Cancellation Policy" : "रिफंड एवं रद्दीकरण नीति"}
          </Link>
          {" · "}
          <Link to="/shipping" className="font-semibold text-primary underline underline-offset-4">
            {en ? "Delivery Policy (Digital)" : "डिलीवरी नीति (डिजिटल)"}
          </Link>
        </p>
      </LegalSection>

      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-[10px] bg-saffron-gradient px-6 py-3 text-[15px] font-bold text-white shadow-card hover:brightness-110"
        >
          {en ? "Place an order" : "ऑर्डर कीजिए"}
        </Link>
      </div>
    </LegalPage>
  );
}
