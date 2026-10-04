import { useI18n } from "@/lib/i18n";

/* 04.10.2026 -- वेबसाइट कैसे इस्तेमाल करें (पंचायतीराज आम चुनाव 2026).
   PDF विधियाँ order.saubhagya.net/downloads/sop/ से (Cloudflare R2). */
const SOP = "https://order.saubhagya.net/downloads/sop/";
const SOP_ORDER = SOP + "sop_order_pdf.pdf";
const SOP_SOFTWARE = SOP + "sop_software_install.pdf";
const SOP_SAMPLE = SOP + "sop_namuna_pdf.pdf";

type Card = { icon: string; hi: string; en: string; forHi: string; forEn: string; stepsHi: string[]; stepsEn: string[]; pdf: string; soft?: boolean };

const CARDS: Card[] = [
  {
    icon: "🧾",
    hi: "वोटर पर्ची PDF",
    en: "Voter slip PDF",
    forHi: "पंच, सरपंच, पंचायत समिति सदस्य या ज़िला परिषद सदस्य के प्रत्याशी — छपाई के लिए तैयार पर्चियाँ और सूचियाँ।",
    forEn: "Candidates for Panch, Sarpanch, Panchayat Samiti or Zila Parishad member — print-ready slips and lists.",
    stepsHi: [
      "क्षेत्र: ज़िला → पंचायत समिति → ग्राम पंचायत → पद → वार्ड / निर्वाचन क्षेत्र। मतदाता संख्या और राशि तुरंत दिखती है।",
      "डिज़ाइन: P (सादी), S (नाम + चुनाव चिन्ह), A (विज्ञापन / बैनर), Ph (मतदाता की फ़ोटो)।",
      "S में प्रत्याशी का नाम, चिन्ह और क्रम संख्या; A में सही नाप की बैनर तस्वीर (नाप वहीं लिखा आता है)।",
      "अपना WhatsApp नंबर लिखिए, मतदान दिनांक जाँचकर ✔ लगाइए और ऑर्डर भेजिए।",
      "ऑर्डर नंबर + पासवर्ड \"📋 दोनों कॉपी करें\" से सुरक्षित रखिए।",
      "फ़ाइलें तैयार होते ही QR / PhonePe से भुगतान — 24 घंटे के अंदर। भुगतान मिलते ही डाउनलोड।",
    ],
    stepsEn: [
      "Area: district → panchayat samiti → gram panchayat → post → ward / constituency. Voters and amount show at once.",
      "Design: P (plain), S (name + symbol), A (banner), Ph (voter photo).",
      "S needs candidate name, symbol and serial number; A needs a banner image of the size shown.",
      "Enter your WhatsApp number, tick the poll date and send the order.",
      "Save the order number + password with \"📋 Copy both\".",
      "Pay by QR / PhonePe within 24 hours once files are ready; download right after payment.",
    ],
    pdf: SOP_ORDER,
  },
  {
    icon: "📦",
    hi: "डेटा (सॉफ़्टवेयर के लिए)",
    en: "Data (for the software)",
    forHi: "जिनके पास सौभाग्य सॉफ़्टवेयर है और जो अपने कंप्यूटर पर ख़ुद पर्चियाँ बनाना चाहते हैं।",
    forEn: "For those who have the Saubhagya software and want to make slips on their own computer.",
    stepsHi: [
      "ज़िला चुनिए, फिर कितना डेटा — एक पंचायत समिति, पूरा ज़िला या एक ग्राम पंचायत।",
      "कौन-कौन से पद — चारों पद या पंच + सरपंच।",
      "भुगतान के बाद .sbd डेटा फ़ाइल और खोलने का कोड WhatsApp पर आता है।",
      "फ़ाइल सॉफ़्टवेयर के पास वाले \"सौभाग्य डेटा\" फ़ोल्डर में रखिए — पहली बार कोड डालिए।",
    ],
    stepsEn: [
      "Pick the district, then how much data — one panchayat samiti, the whole district or one gram panchayat.",
      "Which posts — all four, or Panch + Sarpanch.",
      "After payment the .sbd data file and its code come on WhatsApp.",
      "Put the file in the \"सौभाग्य डेटा\" folder next to the software and enter the code once.",
    ],
    pdf: SOP_SOFTWARE,
    soft: true,
  },
  {
    icon: "💻",
    hi: "सॉफ़्टवेयर (EXE)",
    en: "Software (EXE)",
    forHi: "पूरे क्षेत्र के डेटा के साथ तैयार सॉफ़्टवेयर — बिना इंटरनेट, जितनी चाहें पर्चियाँ।",
    forEn: "Ready software with your area's data — no internet needed, unlimited slips.",
    stepsHi: [
      "\"🛒 ख़रीदें — आपका क्षेत्र\": क्षेत्र और पद चुनिए, फिर आपका कंप्यूटर — Windows 10 / 11 या Windows 7 / 8।",
      "\"🆓 नमूना — मुफ़्त\": दोनों Windows के लिए अलग नमूना सॉफ़्टवेयर, खोलने का कोड Guest@123।",
      "पहली बार खोलने पर \"Windows protected your PC\" आए तो More info → Run anyway।",
    ],
    stepsEn: [
      "\"Buy — your area\": choose area and posts, then your computer — Windows 10 / 11 or Windows 7 / 8.",
      "\"Sample — free\": separate sample software for both Windows versions, code Guest@123.",
      "If \"Windows protected your PC\" appears the first time, click More info → Run anyway.",
    ],
    pdf: SOP_SOFTWARE,
    soft: true,
  },
  {
    icon: "🆓",
    hi: "मुफ़्त नमूना",
    en: "Free sample",
    forHi: "ऑर्डर से पहले अपने ही क्षेत्र की असली पर्ची देखिए — पहले 15 मतदाता, कोई भुगतान नहीं।",
    forEn: "See a real slip of your own area before ordering — first 15 voters, no payment.",
    stepsHi: [
      "ज़िला, पद और वार्ड / क्षेत्र चुनिए; डिज़ाइन चुनिए।",
      "चाहें तो प्रत्याशी का नाम, चिन्ह, क्रम संख्या या बैनर भी लगाइए।",
      "\"इस डिज़ाइन का नमूना\" या \"सभी डिज़ाइनों के नमूने (एक PDF)\" — हर डिज़ाइन का कोड बड़े लाल अक्षरों में।",
    ],
    stepsEn: [
      "Choose district, post and ward / area; choose a design.",
      "Optionally add candidate name, symbol, serial number or banner.",
      "\"This design\" or \"All designs (one PDF)\" — each design code printed large in red.",
    ],
    pdf: SOP_SAMPLE,
  },
];

const PHASES: [string, string, string, string][] = [
  ["1", "23.10.2026", "25.10.2026", "24.10"],
  ["2", "29.10.2026", "31.10.2026", "30.10"],
  ["3", "04.11.2026", "06.11.2026", "05.11"],
  ["4", "14.11.2026", "16.11.2026", "15.11"],
];

/** ऑर्डर वाले हिस्से के ऊपर — छोटा "ऑर्डर कैसे करें" */
export function OrderHowTo() {
  const { lang } = useI18n();
  const en = lang === "en";
  const c = CARDS[0];
  return (
    <details className="mt-3 rounded-[10px] border border-border bg-card px-4 py-2.5 text-sm shadow-card">
      <summary className="cursor-pointer font-semibold text-primary">
        {en ? "📖 How to order? (7 easy steps)" : "📖 ऑर्डर कैसे करें? (आसान 7 कदम)"}
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink2">
        <li>{en ? "At the top choose what you need: Voter slip PDF, Data, Software (EXE) or Free sample." : "सबसे ऊपर चुनिए क्या चाहिए: वोटर पर्ची PDF, डेटा, सॉफ़्टवेयर (EXE) या मुफ़्त नमूना।"}</li>
        {(en ? c.stepsEn : c.stepsHi).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-2 text-muted-foreground">
        {en
          ? "Files are ready in a few minutes. Not paid in 1 hour → WhatsApp reminder; not paid in 24 hours → the order is cancelled automatically."
          : "फ़ाइलें कुछ ही मिनट में तैयार। 1 घंटे में भुगतान न हो तो WhatsApp पर याद-दिहानी; 24 घंटे में न हो तो ऑर्डर अपने-आप रद्द।"}{" "}
        <a href={SOP_ORDER} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">
          {en ? "Full guide (PDF)" : "पूरी विधि (PDF)"}
        </a>
      </p>
    </details>
  );
}

/** होम पेज — चारों बटन की पूरी जानकारी + चुनाव कार्यक्रम */
export function HowToUse({ showSoftware = true }: { showSoftware?: boolean }) {
  const { lang } = useI18n();
  const en = lang === "en";
  const cards = CARDS.filter((x) => showSoftware || !x.soft);
  return (
    <section id="kaise" className="mt-10">
      <h2 className="text-lg font-bold text-foreground">
        {en ? "How to use this website" : "वेबसाइट कैसे इस्तेमाल करें"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {en
          ? "Panchayati Raj general elections 2026 — the order section above has these buttons. Tap a card to read the steps."
          : "पंचायतीराज संस्थाओं के आम चुनाव 2026 — ऊपर ऑर्डर वाले हिस्से में ये बटन हैं। हर बटन की विधि नीचे खोलकर पढ़िए।"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {cards.map((x) => (
          <details key={x.hi} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <summary className="cursor-pointer list-none">
              <span className="text-xl" aria-hidden>{x.icon}</span>{" "}
              <span className="font-bold text-foreground">{en ? x.en : x.hi}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{en ? x.forEn : x.forHi}</span>
              <span className="mt-1 block text-xs font-semibold text-primary">{en ? "Show steps ▾" : "विधि देखें ▾"}</span>
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink2">
              {(en ? x.stepsEn : x.stepsHi).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <a href={x.pdf} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-4">
              {en ? "📖 Detailed guide (PDF)" : "📖 पूरी विधि (PDF)"}
            </a>
          </details>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="font-bold text-foreground">
          {en ? "Poll dates — order early" : "मतदान तिथियाँ — पर्ची समय से बनवाइए"}
        </p>
        <table className="mt-2 w-full min-w-[480px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">{en ? "Phase" : "चरण"}</th>
              <th className="py-1 pr-2">{en ? "PS / ZP member (EVM)" : "पं.स. / ज़ि.प. सदस्य (EVM)"}</th>
              <th className="py-1 pr-2">{en ? "Panch / Sarpanch (ballot)" : "पंच / सरपंच (बैलेट)"}</th>
              <th className="py-1">{en ? "Panch/Sarpanch symbols" : "पंच/सरपंच चिन्ह"}</th>
            </tr>
          </thead>
          <tbody className="text-ink2">
            {PHASES.map((r) => (
              <tr key={r[0]} className="border-t border-border">
                <td className="py-1 pr-2 font-semibold">{r[0]}</td>
                <td className="py-1 pr-2">{r[1]}</td>
                <td className="py-1 pr-2">{r[2]}</td>
                <td className="py-1">{r[3]} {en ? "after 2 PM" : "दोपहर 2 बजे बाद"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          {en
            ? "Polling 7 AM – 6 PM. PS / ZP counting on 20.11.2026. On symbol-allotment days demand is very high — place P-series orders early and add symbol details as soon as they are allotted."
            : "मतदान प्रातः 7 से सायं 6 बजे तक। पं.स. / ज़ि.प. सदस्यों की मतगणना 20.11.2026। चिन्ह मिलने वाले दिन बहुत भीड़ रहती है — नाम/चिन्ह वाली पर्ची के लिए चिन्ह मिलते ही तुरंत ऑर्डर कीजिए।"}
        </p>
      </div>
    </section>
  );
}
