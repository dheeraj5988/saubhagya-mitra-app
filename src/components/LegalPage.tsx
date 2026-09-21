import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import type { PolicyDoc } from "@/content/policies";
import { POLICY_DATE_EN, POLICY_DATE_HI } from "@/lib/business";
import { useI18n } from "@/lib/i18n";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-[15.5px] font-bold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2 text-[14.5px] leading-relaxed text-ink2">{children}</div>
    </section>
  );
}

/** Page shell for policies and info pages: header, title, effective date, footer. */
export function LegalPage({
  title,
  intro,
  showDate = true,
  children,
}: {
  title: string;
  intro?: string | undefined;
  showDate?: boolean;
  children: ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <div className="min-h-dvh bg-page">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-[28px]">{title}</h1>
          {showDate ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "en"
                ? `Effective from ${POLICY_DATE_EN}`
                : `प्रभावी तिथि: ${POLICY_DATE_HI}`}
            </p>
          ) : null}
          {intro ? <p className="mt-3 text-[15px] leading-relaxed text-ink2">{intro}</p> : null}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Renders a bilingual PolicyDoc in the visitor's language. */
export function PolicyPage({
  doc,
  showDate = true,
  children,
}: {
  doc: PolicyDoc;
  showDate?: boolean;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <LegalPage title={doc.title[lang]} intro={doc.intro?.[lang]} showDate={showDate}>
      {doc.sections.map((section) => (
        <LegalSection key={section.title.en} title={section.title[lang]}>
          {section.paras.map((para) => (
            <p key={para.en}>{para[lang]}</p>
          ))}
          {section.list?.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {section.list.map((item) => (
                <li key={item.en}>{item[lang]}</li>
              ))}
            </ul>
          ) : null}
        </LegalSection>
      ))}
      {children}
    </LegalPage>
  );
}

/** Standard head() meta for a policy route. */
export function policyHead(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
