import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { ABOUT } from "@/content/policies";

export const Route = createFileRoute("/about")({
  head: () =>
    policyHead(
      "About Us | Saubhagya Voter Slip",
      "Saubhagya Voter Slip prepares print-ready PDF voter slips from the State Election Commission's public electoral rolls for Rajasthan panchayat candidates.",
    ),
  component: AboutPage,
});

function AboutPage() {
  return <PolicyPage doc={ABOUT} showDate={false} />;
}
