import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection, policyHead } from "@/components/LegalPage";
import {
  LICENCE_ROWS,
  PRICING_EXAMPLE_VOTERS,
  PRICING_NOTES,
  PRICING_ROWS,
  SAMPLE_CODE,
} from "@/content/policies";
import { useI18n } from "@/lib/i18n";
import { computeAmount, formatInr } from "@/lib/pricing";
import { getPublicPaymentConfig } from "@/lib/orders.functions";

export const Route = createFileRoute("/pricing")({
  head: () =>
    policyHead(
      "Pricing | Saubhagya",
      "Per-slip rates for digital campaign slips: P 15 paise, A 16 paise, Ph 20 paise.",
    ),
  component: PricingPage,
});

function PricingPage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const example = PRICING_EXAMPLE_VOTERS.toLocaleString("en-IN");
  const fetchConfig = useServerFn(getPublicPaymentConfig);
  const { data: config } = useQuery({
    queryKey: ["publicPaymentConfig"],
    queryFn: () => fetchConfig(),
    staleTime: 30_000,
  });
  const softwareActive = Boolean(config?.software_enabled);

  return (
    <LegalPage
      title={en ? "Pricing" : "रेट सूची"}
      intro={
        en
          ? "Amount = count in the ward / booths you select × per-slip rate. Nothing else is added."
          : "राशि = आपके चुने वार्ड / भाग की संख्या × प्रति-पर्ची रेट। इसके अलावा कुछ नहीं जुड़ता।"
      }
    >
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-soft text-[13px] text-saffron-deep">
            <tr>
              <th className="px-3 py-3 font-bold sm:px-4">{en ? "Series" : "सीरीज़"}</th>
              <th className="px-3 py-3 font-bold sm:px-4">
                {en ? "What you get" : "क्या मिलता है"}
              </th>
              <th className="hidden px-4 py-3 font-bold md:table-cell">
                {en ? "Designs" : "डिज़ाइन"}
              </th>
              <th className="px-3 py-3 font-bold sm:px-4">{en ? "Rate" : "रेट"}</th>
              <th className="hidden px-4 py-3 font-bold sm:table-cell">
                {en ? `e.g. for ${example} slips` : `उदाहरण — ${example} पर्चियों पर`}
              </th>
            </tr>
          </thead>
          <tbody>
            {PRICING_ROWS.map((row) => (
              <tr key={row.series} className="border-t border-border">
                <td className="px-3 py-3 sm:px-4">
                  <span className="rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white">
                    {row.series}
                  </span>
                </td>
                <td className="px-3 py-3 text-ink2 sm:px-4">
                  {row.what[lang]}
                  {row.designs !== "—" ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
                      {row.designs}
                    </span>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground md:table-cell">
                  {row.designs}
                </td>
                <td className="px-3 py-3 whitespace-nowrap font-bold sm:px-4">
                  {Math.round(row.rate * 100)} {en ? "paise / slip" : "पैसे / पर्ची"}
                  <span className="mt-0.5 block text-xs font-semibold text-saffron-deep sm:hidden">
                    {en ? `e.g. ${example} slips = ${formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}` : `उदा. ${example} पर्चियाँ = ${formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}`}
                  </span>
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap font-bold text-saffron-deep sm:table-cell">
                  {formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="px-3 py-3 sm:px-4">
                <span className="rounded-md bg-muted-foreground px-2 py-0.5 text-xs font-bold text-white">
                  {en ? "Sample" : "नमूना"}
                </span>
              </td>
              <td className="px-3 py-3 text-ink2 sm:px-4">
                {en ? "Sample slips on request (WhatsApp)" : "अनुरोध पर नमूना (WhatsApp)"}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">—</td>
              <td className="px-3 py-3 font-bold sm:px-4">₹0</td>
              <td className="hidden px-4 py-3 sm:table-cell">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {softwareActive ? (
        <>
          <h2 className="pt-2 text-lg font-bold text-foreground">
            {en ? "Software licence (for a full area)" : "सॉफ़्टवेयर लाइसेंस (पूरे क्षेत्र के लिए)"}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-soft text-[13px] text-saffron-deep">
                <tr>
                  <th className="px-3 py-3 font-bold sm:px-4">{en ? "Licence" : "लाइसेंस"}</th>
                  <th className="px-3 py-3 font-bold sm:px-4">
                    {en ? "What you get" : "क्या मिलता है"}
                  </th>
                  <th className="px-3 py-3 font-bold sm:px-4">{en ? "Rate" : "रेट"}</th>
                  <th className="hidden px-4 py-3 font-bold sm:table-cell">
                    {en ? `e.g. for ${example} records` : `उदाहरण — ${example} रिकॉर्ड पर`}
                  </th>
                </tr>
              </thead>
              <tbody>
                {LICENCE_ROWS.map((row) => (
                  <tr key={row.code} className="border-t border-border">
                    <td className="px-3 py-3 sm:px-4">
                      <span className="rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white">
                        {row.code}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink2 sm:px-4">{row.what[lang]}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-bold sm:px-4">
                      {Math.round(row.rate * 100)} {en ? "paise / record" : "पैसे / रिकॉर्ड"}
                      <span className="mt-0.5 block text-xs font-semibold text-saffron-deep sm:hidden">
                        {en ? `e.g. ${example} records = ${formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}` : `उदा. ${example} रिकॉर्ड = ${formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}`}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 whitespace-nowrap font-bold text-saffron-deep sm:table-cell">
                      {formatInr(computeAmount(PRICING_EXAMPLE_VOTERS, row.rate))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-3 py-3 sm:px-4">
                    <span className="rounded-md bg-muted-foreground px-2 py-0.5 text-xs font-bold text-white">
                      {en ? "Sample" : "नमूना"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink2 sm:px-4">
                    {en
                      ? `Free sample software — sample data for every panchayat samiti, code ${SAMPLE_CODE}. `
                      : `मुफ़्त नमूना सॉफ़्टवेयर — हर पंचायत समिति का नमूना डेटा, कोड ${SAMPLE_CODE}। `}
                    <Link
                      to="/software"
                      className="font-semibold text-primary underline underline-offset-4"
                    >
                      {en ? "Download" : "डाउनलोड"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-bold sm:px-4">₹0</td>
                  <td className="hidden px-4 py-3 sm:table-cell">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}

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

