import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { ABOUT } from "@/content/policies";

export const Route = createFileRoute("/about")({
  head: () =>
    policyHead(
      "About Us | Saubhagya",
      "Saubhagya prepares print-ready PDF campaign slips from the State Election Commission's public rolls for Rajasthan panchayat candidates.",
    ),
  component: AboutPage,
});

function AboutPage() {
  return <PolicyPage doc={ABOUT} showDate={false} />;
}
