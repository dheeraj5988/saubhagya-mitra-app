import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, MessageCircle } from "lucide-react";

import { LegalPage, LegalSection, policyHead } from "@/components/LegalPage";
import { Button } from "@/components/ui/button";
import { SAMPLE_CODE, SAMPLE_DOWNLOADS, SOFTWARE } from "@/content/policies";
import { whatsappLink } from "@/lib/business";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/software")({
  head: () =>
    policyHead(
      "Software | Saubhagya Voter Slip",
      "Free sample of the Saubhagya Voter Slip software for Windows, with the sample data inside. Software licences for a full panchayat samiti or district.",
    ),
  component: SoftwarePage,
});

function SoftwarePage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const files = SAMPLE_DOWNLOADS.filter((f) => f.href);
  const exeReady = files.some((f) => f.key.startsWith("exe"));
  const askText = en
    ? "Hello, please send me the free sample of the Saubhagya Voter Slip software."
    : "नमस्ते, मुझे सौभाग्य वोटर स्लिप सॉफ़्टवेयर का मुफ़्त नमूना चाहिए।";
  const helpText = en
    ? "Hello, the Saubhagya Voter Slip sample software is not downloading."
    : "नमस्ते, सौभाग्य वोटर स्लिप का नमूना सॉफ़्टवेयर डाउनलोड नहीं हो रहा।";

  return (
    <LegalPage title={SOFTWARE.title[lang]} intro={SOFTWARE.intro?.[lang]} showDate={false}>
      <section className="rounded-2xl border-2 border-primary/30 bg-brand-soft p-5 shadow-card">
        <h2 className="text-[15.5px] font-bold text-foreground">
          {en ? "Download the free sample" : "मुफ़्त नमूना डाउनलोड कीजिए"}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f) =>
            f.key.startsWith("exe") ? (
              <Button
                key={f.key}
                asChild
                variant="success"
                size="sm"
                className="h-auto min-h-8 whitespace-normal py-1.5 text-left"
              >
                <a href={f.href} download target="_blank" rel="noopener noreferrer">
                  <Download /> {f.label[lang]} ({f.size})
                </a>
              </Button>
            ) : (
              <Button key={f.key} asChild variant="outline" size="sm">
                <a href={f.href} target="_blank" rel="noopener noreferrer">
                  <FileText /> {f.label[lang]} ({f.size})
                </a>
              </Button>
            ),
          )}
          {exeReady ? null : (
            <Button asChild variant="success" size="sm">
              <a href={whatsappLink(askText)} target="_blank" rel="noopener noreferrer">
                <MessageCircle />{" "}
                {en ? "Get the sample software on WhatsApp" : "नमूना सॉफ़्टवेयर WhatsApp पर माँगिए"}
              </a>
            </Button>
          )}
        </div>
        {exeReady ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {en ? "Trouble downloading? " : "डाउनलोड में दिक़्क़त हो तो "}
            <a
              href={whatsappLink(helpText)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {en ? "tell us on WhatsApp" : "WhatsApp पर बताइए"}
            </a>
          </p>
        ) : null}
        <p className="mt-4 text-[14.5px] text-ink2">
          {en ? "Code to open the sample:" : "नमूना खोलने का कोड:"}{" "}
          <span className="text-2xl font-extrabold tracking-wide text-destructive">
            {SAMPLE_CODE}
          </span>
        </p>
      </section>

      {SOFTWARE.sections.map((section) => (
        <LegalSection key={section.title.en} title={section.title[lang]}>
          {section.paras.map((para) => (
            <p key={para.en}>{para[lang]}</p>
          ))}
          {section.list?.length ? (
            <ol className="list-decimal space-y-1 pl-5">
              {section.list.map((item) => (
                <li key={item.en}>{item[lang]}</li>
              ))}
            </ol>
          ) : null}
        </LegalSection>
      ))}
    </LegalPage>
  );
}
