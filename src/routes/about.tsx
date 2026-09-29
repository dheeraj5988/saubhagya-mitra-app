import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage, policyHead } from "@/components/LegalPage";
import { ABOUT } from "@/content/policies";

export const Route = createFileRoute("/about")({
  head: () =>
    policyHead(
      "About Us | Saubhagya",
      "Saubhagya prepares print-ready customized PDF templates and digital campaign slips.",
    ),
  component: AboutPage,
});

function AboutPage() {
  return <PolicyPage doc={ABOUT} showDate={false} />;
}
