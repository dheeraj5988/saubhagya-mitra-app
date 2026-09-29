/**
 * Text for /about, /pricing, /software and every policy page, in Hindi and English.
 * First version: payment-gateway audit (19.09.2026), sections 5.1–5.7.
 * Updated 22.09.2026: the terms now cover every service the business offers or
 * will add — voter-slip PDFs, data processing and software licences (with the
 * free sample software) — so the policies stay valid for the payment gateway as
 * services grow. Digital delivery only; refunds after payment minus the gateway fee.
 *
 * Business details (legal name, GSTIN, emails, hours) come from
 * src/lib/business.ts — edit them there, never here.
 */
import {
  ADDRESS_EN,
  ADDRESS_HI,
  CONTACT_DISPLAY,
  CONTACT_EMAIL,
  GSTIN,
  HOURS_EN,
  HOURS_HI,
  LEGAL_NAME,
  ORDERS_EMAIL,
  PROPRIETOR_NAME,
  TRADE_NAME_EN,
  TRADE_NAME_HI,
  UDYAM_NUMBER,
  hasGstin,
  hasLegalName,
  isComposition,
} from "@/lib/business";
import { SERIES_RATES } from "@/lib/pricing";

export type Bi = { hi: string; en: string };
export type PolicySection = { title: Bi; paras: Bi[]; list?: Bi[] };
export type PolicyDoc = { title: Bi; intro?: Bi; sections: PolicySection[] };

const p = (hi: string, en: string): Bi => ({ hi, en });
const paise = (r: number) => Math.round(r * 100);

const whoHi = hasLegalName() ? `${LEGAL_NAME} (व्यापार-नाम: ${TRADE_NAME_HI})` : TRADE_NAME_HI;
const whoEn = hasLegalName() ? `${LEGAL_NAME} (trading as ${TRADE_NAME_EN})` : TRADE_NAME_EN;

const taxHi = isComposition()
  ? "हम GST Composition योजना में पंजीकृत हैं — रेट में अलग से कोई GST नहीं जोड़ा जाता। भुगतान के बाद Bill of Supply WhatsApp पर मिलता है।"
  : "दिखाई गई राशि ही देय राशि है — भुगतान के समय इसमें कोई अतिरिक्त शुल्क नहीं जुड़ता।";
const taxEn = isComposition()
  ? "We are registered under the GST Composition scheme — no GST is added on top of the rate. A Bill of Supply is sent on WhatsApp after payment."
  : "The amount shown is the amount payable — nothing extra is added at payment.";

/* ------------------------------------------------------------------ */
/* Software licence rates and sample downloads                         */
/* ------------------------------------------------------------------ */

/** Software licence fee per voter (in rupees) of the licensed area. */
export const LICENCE_RATES = { all: 0.3, one: 0.2 } as const;

/** Code that opens the free sample data inside the software. */
export const SAMPLE_CODE = "Guest@123";

/**
 * Files on the /software page. Fill href with a public direct-download link
 * (a file in public/downloads/, or a Google Drive link in the form
 * https://drive.google.com/uc?export=download&id=FILE_ID). An empty href
 * hides the button; with no EXE link a WhatsApp request button shows instead.
 * The sample data (code Guest@123) is built into both EXE files.
 */
export const SAMPLE_DOWNLOADS: { key: string; label: Bi; href: string; size: string }[] = [
  {
    key: "exe",
    label: p("सॉफ़्टवेयर — Windows 10 / 11", "Software — Windows 10 / 11"),
    href: "https://drive.google.com/uc?export=download&id=1Ztn6mg2UBoBKx7GbJPakt_QLYtIq19zG",
    size: "73 MB",
  },
  {
    key: "exe-win7",
    label: p(
      "सॉफ़्टवेयर — Windows 7 / 8 (10 / 11 पर भी चलता है)",
      "Software — Windows 7 / 8 (also runs on 10 / 11)",
    ),
    href: "https://drive.google.com/uc?export=download&id=1b1h3Pft24fEFLOwzQbOuYwMbheh6AyuE",
    size: "57 MB",
  },
  {
    key: "sop",
    label: p("कैसे चलाएँ — SOP (PDF)", "How to use — SOP (PDF)"),
    href: "",
    size: "0.2 MB",
  },
];

/* ------------------------------------------------------------------ */
/* Legal line (footer, contact, end of terms)                          */
/* ------------------------------------------------------------------ */

export function legalLine(lang: "hi" | "en"): string[] {
  const hi = lang === "hi";
  const lines: string[] = [];
  if (hasLegalName()) {
    lines.push(
      hi
        ? `${LEGAL_NAME}${PROPRIETOR_NAME ? ` (स्वामित्व फ़र्म · प्रोप्राइटर: ${PROPRIETOR_NAME})` : ""}`
        : `${LEGAL_NAME}${PROPRIETOR_NAME ? ` (Sole proprietorship · Proprietor: ${PROPRIETOR_NAME})` : ""}`,
    );
    lines.push(hi ? `व्यापार-नाम: ${TRADE_NAME_HI}` : `Trading as ${TRADE_NAME_EN}`);
  } else {
    lines.push(hi ? TRADE_NAME_HI : TRADE_NAME_EN);
  }
  if (UDYAM_NUMBER.trim()) {
    lines.push(hi ? `Udyam पंजीकरण: ${UDYAM_NUMBER}` : `Udyam registration: ${UDYAM_NUMBER}`);
  }
  if (hasGstin()) {
    lines.push(
      `GSTIN: ${GSTIN}${isComposition() ? (hi ? " (Composition योजना)" : " (Composition scheme)") : ""}`,
    );
  }
  lines.push(hi ? `पता: ${ADDRESS_HI}` : `Address: ${ADDRESS_EN}`);
  lines.push(
    hi
      ? `फ़ोन / WhatsApp: ${CONTACT_DISPLAY} · ईमेल: ${ORDERS_EMAIL}`
      : `Phone / WhatsApp: ${CONTACT_DISPLAY} · Email: ${ORDERS_EMAIL}`,
  );
  lines.push(hi ? `कार्य-समय: ${HOURS_HI}` : `Working hours: ${HOURS_EN}`);
  return lines;
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

export const ABOUT: PolicyDoc = {
  title: p("हमारे बारे में", "About Us"),
  sections: [
    {
      title: p("हम कौन हैं", "Who we are"),
      paras: [
        p(
          `${whoHi} लक्ष्मणगढ़ (सीकर, राजस्थान) का एक स्वामित्व फ़र्म है। हम ग्राहकों और उनके कार्यालयों के लिए छपाई-योग्य कस्टमाइज्ड डिजिटल टेम्पलेट्स, सूचियाँ और डिजिटल अभियान पर्चियाँ तैयार करते हैं। अभी हमारा मुख्य काम राजस्थान के विभिन्न क्षेत्रों — पंच, सरपंच, पंचायत समिति और ज़िला परिषद क्षेत्र — के लिए है।`,
          `${whoEn} is a sole proprietorship based in Laxmangarh (Sikar, Rajasthan). We prepare print-ready customized digital templates, lists, and digital campaign slips. Our main focus is Rajasthan's local areas — Panch, Sarpanch, Panchayat Samiti and Zila Parishad areas.`,
        ),
      ],
    },
    {
      title: p("हम क्या करते हैं", "What we do"),
      paras: [
        p(
          "हमारी सभी सेवाएँ डिजिटल रूप में मिलती हैं:",
          "All our services are delivered digitally:",
        ),
      ],
      list: [
        p(
          "अभियान पर्चियाँ और सूचियाँ (PDF) — वितरण की पर्ची, हिंदी वर्णमाला क्रम सूची, English Alphabetical सूची और परिवार-वार सूची, चुने हुए वार्ड / भाग के लिए।",
          "Campaign slips and lists (PDF) — slips for distribution, Hindi alphabetical, English alphabetical and family-wise lists, for the ward / booths selected.",
        ),
        p(
          "डेटा प्रोसेसिंग — सूचियों (और आपकी दी फ़ोटो सहित सूची) को छाँटकर, क्रम देकर छपाई-योग्य और खोज-योग्य बनाना।",
          "Data processing — sorting and arranging records (and a photo roll you provide) into printable, searchable form.",
        ),
        p(
          "सॉफ़्टवेयर लाइसेंस — बड़े क्षेत्र (पूरी पंचायत समिति / ज़िला) के लिए Windows सॉफ़्टवेयर, जिससे आप अपने कंप्यूटर पर, बिना इंटरनेट, जितनी चाहें पर्चियाँ बना सकें। मुफ़्त नमूना: saubhagya.net/software",
          "Software licence — Windows software for a large area (a whole panchayat samiti / district) so you can make as many slips as you need on your own computer, offline. Free sample: saubhagya.net/software",
        ),
      ],
    },
    {
      title: p("डिज़ाइन", "Designs"),
      paras: [
        p(
          "सादी पर्ची (P-16, P-12) में पूरी जानकारी होती है। प्रतीक-चिन्ह (SR-10 / SL-10) और विज्ञापन (AT-9, AT-8, AL-8, AR-8) वाले डिज़ाइन में नाम, प्रतीक चिन्ह, क्रम संख्या और आपका बैनर भी छपता है।",
          "Plain slips (P-16, P-12) carry full details. Symbol designs (SR-10 / SL-10) and advertisement designs (AT-9, AT-8, AL-8, AR-8) also carry the name, symbol, serial number and your banner.",
        ),
      ],
    },
    {
      title: p("हम क्या नहीं करते", "What we do not do"),
      paras: [],
      list: [
        p(
          "हम सूची में कोई बदलाव नहीं करते, उसमें कोई निजी जानकारी नहीं जोड़ते, और सूचियों को कच्चे डेटा (raw data) के रूप में अलग से नहीं बेचते।",
          "We do not alter the electoral roll, do not add any personal data to it, and do not sell lists separately as raw data.",
        ),
        p(
          "हम कोई भौतिक छपाई या डिलीवरी नहीं करते — PDF आप अपने प्रिंटर या स्थानीय प्रेस से छपवाते हैं।",
          "We do not print or ship anything — you print the PDFs yourself or at a local press.",
        ),
        p(
          "हम किसी राजनीतिक दल से जुड़े नहीं हैं।",
          "We are not affiliated with any political party.",
        ),
        p(
          "हम चंदा / फ़ंड नहीं लेते-देते और प्रचार-संदेश (bulk SMS / WhatsApp) नहीं भेजते।",
          "We do not collect or route donations or funds and we do not send bulk promotional SMS / WhatsApp messages.",
        ),
      ],
    },
    {
      title: p("संपर्क", "Contact"),
      paras: [
        p(
          `फ़ोन / WhatsApp: ${CONTACT_DISPLAY} · ईमेल: ${CONTACT_EMAIL} · ${ADDRESS_HI}`,
          `Phone / WhatsApp: ${CONTACT_DISPLAY} · Email: ${CONTACT_EMAIL} · ${ADDRESS_EN}`,
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Pricing (tables are rendered by the route; these are the notes)     */
/* ------------------------------------------------------------------ */

export const PRICING_ROWS: {
  series: string;
  what: Bi;
  designs: string;
  rate: number;
}[] = [
  {
    series: "P",
    what: p("सादी पर्ची — पूरी जानकारी", "Plain slip — full details"),
    designs: "P-16, P-12",
    rate: SERIES_RATES.P,
  },
  {
    series: "A",
    what: p("विज्ञापन / बैनर — P + आपका बैनर", "Advertisement / banner — P + your banner"),
    designs: "AT-9, AT-8, AL-8, AR-8",
    rate: SERIES_RATES.A,
  },
  {
    series: "Ph",
    what: p(
      "फ़ोटो सहित (जहाँ फ़ोटो-सूची उपलब्ध हो)",
      "With photo (where the photo roll is available)",
    ),
    designs: "—",
    rate: SERIES_RATES.Ph,
  },
];

export const LICENCE_ROWS: { code: string; what: Bi; rate: number }[] = [
  {
    code: "L4",
    what: p(
      "सॉफ़्टवेयर लाइसेंस — चारों पद (पंच, सरपंच, पंचायत समिति सदस्य, ज़िला परिषद सदस्य); क्षेत्र का डेटा आपके कोड से बंद, सारे डिज़ाइन, PDF असीमित",
      "Software licence — all four posts (Panch, Sarpanch, Panchayat Samiti member, Zila Parishad member); area data locked with your code, all designs, unlimited PDFs",
    ),
    rate: LICENCE_RATES.all,
  },
  {
    code: "L1",
    what: p(
      "सॉफ़्टवेयर लाइसेंस — कोई एक पद; सारे डिज़ाइन, PDF असीमित",
      "Software licence — any one post; all designs, unlimited PDFs",
    ),
    rate: LICENCE_RATES.one,
  },
];

export const PRICING_NOTES: Bi[] = [
  p(
    "राशि = चुने हुए वार्ड / भाग की संख्या × प्रति-पर्ची रेट। संख्या ऑर्डर फ़ॉर्म पर चुनते ही दिखती है, और भुगतान से पहले पूरी राशि बताई जाती है।",
    "Amount = count in the selected ward / booths × per-slip rate. The count appears on the order form as you select, and the full amount is shown before payment.",
  ),
  p(
    "सॉफ़्टवेयर लाइसेंस का शुल्क = लाइसेंस वाले क्षेत्र (ग्राम पंचायत / पंचायत समिति / ज़िला) की संख्या × लाइसेंस रेट। लाइसेंस जारी होने की तिथि से निर्दिष्ट अवधि तक चलता है।",
    "Software licence fee = count in the licensed area (gram panchayat / panchayat samiti / district) × licence rate. The licence runs for the specified period from the date of issue.",
  ),
  p(taxHi, taxEn),
  p(
    "भुगतान: अभी WhatsApp पर (UPI)। ऑनलाइन भुगतान (UPI / कार्ड / नेटबैंकिंग) हमारे payment gateway partner के सुरक्षित पेज पर जल्द शुरू होगा; भुगतान की जानकारी हमारे पास नहीं रहती।",
    "Payment: on WhatsApp (UPI) for now. Online payment (UPI / card / netbanking) on our payment gateway partner's secure page is coming soon; we never store payment credentials.",
  ),
  p(
    "नमूना: पर्ची का नमूना अनुरोध पर (WhatsApp पर अपना ज़िला / पंचायत बताइए); सॉफ़्टवेयर का मुफ़्त नमूना saubhagya.net/software पर।",
    "Samples: sample slips on request (share your district / panchayat on WhatsApp); the free sample software is at saubhagya.net/software.",
  ),
];

export const PRICING_EXAMPLE_VOTERS = 7500;

/* ------------------------------------------------------------------ */
/* Terms                                                               */
/* ------------------------------------------------------------------ */

export const TERMS: PolicyDoc = {
  title: p("नियम एवं शर्तें", "Terms & Conditions"),
  intro: p(
    "saubhagya.net, इसका ऑर्डर-पेज, सौभाग्य सॉफ़्टवेयर और WhatsApp पर दी जाने वाली सभी सेवाएँ इन शर्तों के अधीन हैं। ऑर्डर दर्ज करके, भुगतान करके या सॉफ़्टवेयर डाउनलोड / इस्तेमाल करके आप ये शर्तें स्वीकार करते हैं।",
    "saubhagya.net, its order page, the Saubhagya software and every service we provide on WhatsApp are governed by these terms. By placing an order, making a payment or downloading / using the software you accept them.",
  ),
  sections: [
    {
      title: p("1. सेवा प्रदाता", "1. Service provider"),
      paras: [
        p(
          `${whoHi}${PROPRIETOR_NAME ? `, प्रोप्राइटर ${PROPRIETOR_NAME}` : ""}, पता: ${ADDRESS_HI} ("हम")।`,
          `${whoEn}${PROPRIETOR_NAME ? `, proprietor ${PROPRIETOR_NAME}` : ""}, of ${ADDRESS_EN} ("we", "us").`,
        ),
      ],
    },
    {
      title: p("2. हमारी सेवाएँ", "2. Our services"),
      paras: [
        p(
          "हमारी सभी सेवाएँ डिजिटल हैं — हम छपाई नहीं करते और कोई भौतिक वस्तु नहीं भेजते। ये शर्तें नीचे की हर सेवा पर, और ऐसी हर नई सेवा पर लागू हैं जो हम समय-समय पर इस वेबसाइट पर जोड़ें:",
          "All our services are digital — we do not print and do not ship any physical goods. These terms apply to each service below and to any new service we add to this website from time to time:",
        ),
      ],
      list: [
        p(
          "(क) अभियान पर्चियाँ और सूचियाँ (PDF): राज्य निर्वाचन आयोग, राजस्थान की सार्वजनिक सूची से, आपके चुने क्षेत्र और डिज़ाइन में छपाई-योग्य अभियान पर्चियाँ और सूचियाँ (हिंदी वर्णमाला, English Alphabetical, परिवार वार)।",
          "(a) Campaign slips and lists (PDF): print-ready slips and lists (Hindi alphabetical, English alphabetical, family-wise) in the area and design you choose, from the State Election Commission, Rajasthan's public rolls.",
        ),
        p(
          "(ख) डेटा प्रोसेसिंग सेवाएँ: सार्वजनिक सूचियों और आपकी दी हुई सूचियों (जैसे फ़ोटो सहित सूची) को पढ़ना, छाँटना, क्रम देना और खोज-योग्य / छपाई-योग्य रूप में बदलना, तथा इनसे जुड़ी अन्य डेटा-सेवाएँ।",
          "(b) Data processing services: reading, sorting and arranging public rolls and lists you provide (such as a photo roll) into searchable / printable form, and related data services.",
        ),
        p(
          '(ग) सॉफ़्टवेयर लाइसेंस: आपके अपने कंप्यूटर पर चलने वाला "सौभाग्य" सॉफ़्टवेयर, और आपके चुने क्षेत्र की कोड से बंद (encrypted) डेटा-फ़ाइल — जिससे आप ख़ुद पर्चियाँ बना सकते हैं।',
          '(c) Software licences: the "Saubhagya" software that runs on your own computer, with an encrypted, code-locked data file for the area you choose, so you can make slips yourself.',
        ),
        p(
          "(घ) अन्य डिजिटल सेवाएँ: नमूने, डिज़ाइन / टेम्पलेट, बैनर के नाप की जाँच, सहायता, और ऊपर की सेवाओं से जुड़ी अन्य डिजिटल सेवाएँ।",
          "(d) Other digital services: samples, designs / templates, banner size checks, support and other digital services related to the above.",
        ),
      ],
    },
    {
      title: p("3. सूची का स्रोत", "3. Source of the electoral data"),
      paras: [
        p(
          "पर्चियाँ और डेटा सार्वजनिक रूप से उपलब्ध सूची से बनते हैं, जैसी वह ऑर्डर के समय उपलब्ध है। हम सूची में कोई नाम जोड़ते, हटाते या बदलते नहीं।",
          "Slips and data are prepared from publicly published lists as available at the time of the order. We do not add, remove or change any name in the list.",
        ),
        p(
          "ऑर्डर के बाद प्रकाशित संशोधन पहले से बनी PDF में अपने-आप नहीं आता — उसके लिए नया ऑर्डर लगेगा। सॉफ़्टवेयर लाइसेंस में ऐसा नहीं है — वहाँ नया डेटा लाइसेंस अवधि तक मुफ़्त मिलता है (खंड 9)। सूची के मूल डेटा में रह गई त्रुटि के लिए हम ज़िम्मेदार नहीं हैं।",
          "Revisions made after your order do not flow into PDFs already made — those need a new order. Software licences are different: there the updated data is free throughout the licence period (clause 9). We are not responsible for errors in the third-party source roll.",
        ),
      ],
    },
    {
      title: p("4. ऑर्डर और आपकी दी हुई जानकारी", "4. Orders and the information you provide"),
      paras: [
        p(
          "क्षेत्र, पद, वार्ड / भाग, डिज़ाइन, नाम (हिंदी में), प्रतीक चिन्ह, क्रम संख्या, बैनर और मोबाइल नंबर की सही जानकारी देना आपकी ज़िम्मेदारी है। हम वही छापते हैं जो आप ऑर्डर में देते हैं।",
          "You are responsible for the accuracy of the area, post, ward / booths, design, name (in Hindi), symbol, serial number, banner and mobile number you submit. We print exactly what you give in the order.",
        ),
        p(
          "आप पुष्टि करते हैं कि आपके दिए हर नाम, चिन्ह, नारे और तस्वीर को इस्तेमाल करने का अधिकार आपके पास है। बैनर का नाप डिज़ाइन से मेल न खाने की चेतावनी के बाद भी आप उसे लगवाते हैं, तो उसकी ज़िम्मेदारी आपकी है।",
          "You confirm that you have the right to use every name, symbol, slogan and image you provide. If you still use a banner after being warned that its size does not fit the design, that choice is yours.",
        ),
      ],
    },
    {
      title: p("5. रेट", "5. Pricing"),
      paras: [
        p(
          `अभियान पर्चियाँ: राशि = चुने हुए क्षेत्र की संख्या × प्रति-पर्ची रेट (P ${paise(SERIES_RATES.P)} पैसे, A ${paise(SERIES_RATES.A)} पैसे, Ph ${paise(SERIES_RATES.Ph)} पैसे)। सॉफ़्टवेयर लाइसेंस: शुल्क = लाइसेंस वाले क्षेत्र की संख्या × लाइसेंस रेट (चारों पद ${paise(LICENCE_RATES.all)} पैसे, एक पद ${paise(LICENCE_RATES.one)} पैसे)। पूरी रेट सूची: saubhagya.net/pricing`,
          `Campaign slips: amount = count in the selected area × per-slip rate (P ${paise(SERIES_RATES.P)} paise, A ${paise(SERIES_RATES.A)} paise, Ph ${paise(SERIES_RATES.Ph)} paise). Software licence: fee = count in the licensed area × licence rate (all four posts ${paise(LICENCE_RATES.all)} paise, one post ${paise(LICENCE_RATES.one)} paise). Full rate list: saubhagya.net/pricing`,
        ),
        p(
          "पूरी संख्या और राशि भुगतान से पहले बताई जाती है। रेट बदल सकते हैं, पर जिस ऑर्डर का भुगतान हो चुका है उस पर पुराना रेट ही लागू रहेगा।",
          "The count and full amount are shown before payment. Rates may change, but an order that has been paid keeps its original rate.",
        ),
        p(taxHi, taxEn),
      ],
    },
    {
      title: p("6. ऑर्डर की पुष्टि और भुगतान", "6. Order confirmation and payment"),
      paras: [
        p(
          "ऑर्डर दर्ज होने के बाद हम उसे तैयार करते हैं; तैयार होते ही भुगतान का अनुरोध (QR / लिंक) भेजा जाता है। भुगतान मिलते ही फ़ाइलें और बिल भेज दिए जाते हैं। भुगतान 100% अग्रिम है — डिलीवरी से पहले। ऊपर दिए दाम कर-रहित हैं; कोई भी कर (GST आदि) लागू होने पर वह ग्राहक द्वारा देय होगा।",
          "After an order is placed we prepare it; as soon as it is ready we send the payment request (QR / link). Files and the bill are sent as soon as payment is received. Payment is 100% in advance — before delivery. Prices shown are exclusive of tax; any applicable tax (GST etc.) is payable by the customer.",
        ),
        p(
          "अभी भुगतान WhatsApp पर बताए गए UPI से होता है। ऑनलाइन भुगतान शुरू होने पर वह हमारे payment gateway partner के सुरक्षित पेज पर होगा। कार्ड / UPI / बैंक की जानकारी हमारे सर्वर पर कभी नहीं आती। रिफंड और रद्दीकरण: saubhagya.net/refund",
          "For now payment is made by UPI as shared on WhatsApp. Once online payment starts, it will take place on our payment gateway partner's secure page. Card / UPI / bank details never reach our servers. Refunds and cancellations: saubhagya.net/refund",
        ),
      ],
    },
    {
      title: p("7. डिलीवरी", "7. Delivery"),
      paras: [
        p(
          "PDF फ़ाइलें WhatsApp पर (फ़ाइल या डाउनलोड लिंक के रूप में) भेजी जाती हैं। सॉफ़्टवेयर इस वेबसाइट से डाउनलोड होता है; लाइसेंस वाली डेटा-फ़ाइल और उसका कोड WhatsApp पर मिलते हैं। विवरण: saubhagya.net/shipping (डिलीवरी नीति)।",
          "PDF files are delivered on WhatsApp (as files or a download link). The software is downloaded from this website; the licensed data file and its code are sent on WhatsApp. Details: saubhagya.net/shipping (Delivery Policy).",
        ),
      ],
    },
    {
      title: p(
        "8. फ़ोटो सहित सूची (Ph) और आपकी सहमति",
        "8. Photo roll (Ph) and your consent",
      ),
      paras: [
        p(
          "फ़ोटो सहित पर्ची के लिए उस क्षेत्र की फ़ोटो वाली सूची (PDF) चाहिए। हमारे पास उपलब्ध हो तो सीधे बनती है; न हो तो आप वह PDF ऑर्डर के साथ भेजते हैं।",
          "Photo slips need the photo roll (PDF) of that area. If we already have it, we use it; otherwise you send the PDF with your order.",
        ),
        p(
          "PDF भेजकर आप पुष्टि करते हैं कि आपने उसे वैध रूप से प्राप्त किया है, और सहमति देते हैं कि हम उस सूची को उसी क्षेत्र की दूसरी अभियान पर्चियाँ / सूचियाँ बनाने में भी इस्तेमाल कर सकते हैं। फ़ोटो सिर्फ़ पर्ची / सूची बनाने में लगती है — हम फ़ोटो का कोई अलग डेटाबेस नहीं बेचते या साझा नहीं करते।",
          "By sending the PDF you confirm that you obtained it lawfully, and you consent to our using that roll to prepare other campaign slips / lists for the same area. Photos are used only to make slips / lists — we never sell or share a separate photo database.",
        ),
      ],
    },
    {
      title: p("9. सॉफ़्टवेयर लाइसेंस की शर्तें", "9. Software licence terms"),
      paras: [],
      list: [
        p(
          "लाइसेंस, स्वामित्व नहीं: आपको सॉफ़्टवेयर और डेटा-फ़ाइल के इस्तेमाल का अधिकार मिलता है। लाइसेंस निर्दिष्ट अवधि तक वैध है — तब तक आप जितनी चाहें पर्चियाँ, जितने चाहें डिज़ाइनों के लिए बना सकते हैं।",
          "A licence, not ownership: you get the right to use the software and the data file. The licence is valid for the specified tenure — until then you may make as many slips and templates as you like.",
        ),
        p(
          "कोड: हर लाइसेंस की डेटा-फ़ाइल आपके अपने कोड से बंद रहती है। कोड गोपनीय रखना आपकी ज़िम्मेदारी है; खो जाए तो पहचान की पुष्टि के बाद दोबारा दिया जा सकता है।",
          "Code: each licensed data file is locked with your own code. Keeping the code confidential is your responsibility; if lost, it can be reissued after verifying your identity.",
        ),
        p(
          'आगे देना: सॉफ़्टवेयर की "हिस्सा आगे देना" सुविधा से आप किसी वार्ड / क्षेत्र का हिस्सा अपने कोड से बंद करके अपने ग्राहक को दे सकते हैं, और बनी हुई PDF बेच सकते हैं।',
          'Passing on: with the software\'s "share a part" feature you may lock a ward / area part with your own code and give it to your customer, and you may sell the PDFs you make.',
        ),
        p(
          "मनाही: सूची का कच्चा डेटा निकालना या उसे अलग फ़ाइल / सूची के रूप में बेचना या बाँटना; सॉफ़्टवेयर को खोलना (reverse-engineering), बदलना या उसका कोड हटाना मना है।",
          "Not allowed: extracting the raw data, or selling or distributing it as a separate file / list; reverse-engineering, modifying or removing the protection of the software.",
        ),
        p(
          "विशेष (exclusive) अधिकार: पूरे ज़िले का लाइसेंस लेने पर उस अवधि के लिए उस ज़िले का लाइसेंस हम किसी और को नहीं देते (पहले से दी गई इकाइयों को छोड़कर)। आंशिक लाइसेंस विशेष नहीं होता। PDF सेवा पर यह लागू नहीं।",
          "Exclusivity: a whole-district licence means we do not license that district to anyone else during that period (except units already licensed). Partial licences are not exclusive. This does not apply to the PDF service.",
        ),
        p(
          "अपडेट: लाइसेंस अवधि में सॉफ़्टवेयर के सुधार और डेटा — दोनों निःशुल्क। अद्यतन डेटा सूची आने पर उसी लाइसेंस का नया डेटा हम अपनी ओर से, बिना किसी शुल्क के, लाइसेंस अवधि तक भेजते रहते हैं — आपका कोड वही रहता है। आपने एक से ज़्यादा क्षेत्र लिए हों तो सबका अपडेट एक ही फ़ाइल में आता है।",
          "Updates: both software fixes and data are free during the licence period. When updated data or lists become available, we send the updated data for that licence ourselves, free of charge, during the licence period — your code stays the same. If you hold more than one area, all of them arrive in a single file.",
        ),
        p(
          "समाप्ति: इन शर्तों के उल्लंघन (जैसे कच्चा डेटा बेचना) पर लाइसेंस बिना रिफंड समाप्त किया जा सकता है।",
          "Termination: a licence may be ended without refund if these terms are breached (for example by selling raw data).",
        ),
        p(
          `मुफ़्त नमूना: वेबसाइट का नमूना सॉफ़्टवेयर (कोड ${SAMPLE_CODE}) सिर्फ़ सेवा को परखने के लिए है; उसका डेटा नमूना-मात्र है।`,
          `Free sample: the sample software on this website (code ${SAMPLE_CODE}) is only for trying the service; its data is a sample only.`,
        ),
      ],
    },
    {
      title: p("10. स्वीकार्य उपयोग", "10. Acceptable use"),
      paras: [
        p(
          "पर्चियों, सूचियों और सॉफ़्टवेयर का उपयोग सिर्फ़ वैध कार्यों और लागू नियमों के अनुसार करना आपकी ज़िम्मेदारी है। विवरण का उपयोग spam, उत्पीड़न, धोखाधड़ी या किसी ग़ैर-क़ानूनी काम के लिए नहीं किया जा सकता।",
          "You are responsible for using the slips, lists and software only for lawful purposes, in line with applicable laws and rules. Information may not be used for spam, harassment, fraud or any unlawful purpose.",
        ),
        p(
          "अश्लील, अपमानजनक, सांप्रदायिक या क़ानून तोड़ने वाली सामग्री वाला ऑर्डर हम मना या रद्द कर सकते हैं। सेवा सबको एक ही निष्पक्ष शर्तों पर मिलती है।",
          "We may refuse or cancel any order with content that is obscene, defamatory, communal or in breach of law. The service is offered to everyone on the same fair terms.",
        ),
      ],
    },
    {
      title: p("11. प्रतिनिधि (रेफ़रल) लिंक", "11. Representative (referral) links"),
      paras: [
        p(
          "हमारे प्रतिनिधि के लिंक / कोड से आया ऑर्डर उसी प्रतिनिधि से जुड़ा रहता है। इससे ग्राहक का रेट नहीं बदलता।",
          "An order that comes through a representative's link / code stays linked to that representative. This does not change the customer's rate.",
        ),
      ],
    },
    {
      title: p("12. बौद्धिक संपदा", "12. Intellectual property"),
      paras: [
        p(
          'सॉफ़्टवेयर, डिज़ाइन / टेम्पलेट, लेआउट और "सौभाग्य" नाम हमारी संपदा हैं। बनी हुई PDF आप अपने अभियान और प्रचार में जितना चाहें इस्तेमाल कर सकते हैं। आपकी दी हुई सामग्री (नाम, चिन्ह, बैनर) आपकी है — हम उसे सिर्फ़ आपके ऑर्डर के लिए इस्तेमाल करते हैं।',
          'The software, designs / templates, layouts and the "Saubhagya" name are our property. You may use the PDFs you receive in your campaign as much as you like. Material you provide (name, symbol, banner) remains yours — we use it only for your order.',
        ),
      ],
    },
    {
      title: p("13. दायित्व", "13. Liability"),
      paras: [
        p(
          "किसी ऑर्डर या लाइसेंस के लिए हमारा दायित्व उसकी चुकाई गई राशि तक सीमित है। बाहरी स्रोतों की त्रुटियाँ, आपकी दी हुई ग़लत जानकारी, या हमारे नियंत्रण से बाहर की देरी (इंटरनेट, बिजली, WhatsApp, बैंक / gateway की बाधा) के लिए हम ज़िम्मेदार नहीं हैं।",
          "Our liability for any order or licence is limited to the amount paid for it. We are not liable for third-party data errors, incorrect information you supplied, or delays beyond our control (internet, power, WhatsApp, bank / gateway outages).",
        ),
        p(
          'सॉफ़्टवेयर "जैसा है" दिया जाता है; हम उसके ठीक चलने का पूरा प्रयास करते हैं, पर हर कंप्यूटर पर बिना बाधा चलने की गारंटी नहीं दे सकते।',
          'The software is provided "as is"; we make every effort for it to work well but cannot guarantee uninterrupted operation on every computer.',
        ),
      ],
    },
    {
      title: p(
        "14. लागू क़ानून और शर्तों में बदलाव",
        "14. Governing law and changes to these terms",
      ),
      paras: [
        p(
          "ये शर्तें भारत के क़ानून के अधीन हैं; किसी भी विवाद पर राजस्थान के न्यायालयों का विशेष क्षेत्राधिकार होगा। हम पहले आपसी बातचीत से हल निकालने का प्रयास करेंगे।",
          "These terms are governed by the laws of India, and the courts of Rajasthan have exclusive jurisdiction over any dispute. We will first try to resolve any issue by talking with you.",
        ),
        p(
          "हम ये शर्तें समय-समय पर बदल सकते हैं; वेबसाइट पर लगते ही नई शर्तें आगे के ऑर्डरों पर लागू होंगी। कोई धारा अमान्य ठहरे तो बाकी धाराएँ लागू रहेंगी।",
          "We may update these terms from time to time; the new terms apply to orders placed after they are published here. If any clause is held invalid, the rest remain in force.",
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Privacy                                                             */
/* ------------------------------------------------------------------ */

export const PRIVACY: PolicyDoc = {
  title: p("गोपनीयता नीति", "Privacy Policy"),
  sections: [
    {
      title: p("हम क्या जानकारी लेते हैं", "What we collect"),
      paras: [
        p(
          "ऑर्डर के लिए: नाम (हिंदी), मोबाइल नंबर, ज़िला / क्षेत्र / वार्ड / भाग, पद, डिज़ाइन, प्रतीक चिन्ह, क्रम संख्या, नारा, दिनांक, बैनर की तस्वीर, और फ़ोटो-पर्ची के लिए आपकी अपलोड की हुई सूची PDF।",
          "For an order: name (Hindi), mobile number, district / area / ward / booths, post, design, symbol, serial number, slogan, date, banner image, and — for photo slips — the list PDF you upload.",
        ),
        p(
          "सॉफ़्टवेयर लाइसेंस के लिए: लाइसेंस का क्षेत्र और पद, आपको दिया गया कोड, और (अगर आप दें) GST नंबर।",
          "For a software licence: the licensed area and post(s), the code issued to you and, if you give it, your GST number.",
        ),
        p(
          "सुरक्षा और दुरुपयोग रोकने के लिए हम वेबसाइट पर आने वालों का IP पता और ब्राउज़र की जानकारी दर्ज करते हैं (IP जानने के लिए एक बाहरी सेवा ipify.org का उपयोग होता है), और फ़ॉर्म में भरा मोबाइल नंबर भी — ऑर्डर पूरा न हो तब भी — ताकि हमारी टीम आपकी मदद कर सके।",
          "For security and to prevent misuse we record visitors' IP address and browser details (an external service, ipify.org, is used to read the IP), and the mobile number typed into the form — even if the order is not completed — so our team can help you finish it.",
        ),
      ],
    },
    {
      title: p("सूची का डेटा", "Public list data"),
      paras: [
        p(
          "पर्चियों पर छपने वाला विवरण सार्वजनिक रूप से प्रकाशित सूची से लिया जाता है। हम उसमें कोई बदलाव या जोड़ नहीं करते, और उसे सिर्फ़ छपाई-योग्य पर्ची, सूची और लाइसेंस वाली डेटा-फ़ाइल बनाने के लिए प्रोसेस करते हैं — विज्ञापन, प्रोफ़ाइलिंग या अलग से बेचने के लिए नहीं। लाइसेंस वाली डेटा-फ़ाइलें ग्राहक के कोड से बंद (encrypted) रहती हैं।",
          "The details printed on the slips come from publicly available published lists. We do not alter or add to them, and we process them only to make printable slips, lists and licensed data files — never for advertising, profiling or separate sale. Licensed data files are encrypted with the customer's code.",
        ),
      ],
    },
    {
      title: p("जानकारी का उपयोग", "How we use it"),
      paras: [
        p(
          "आपकी जानकारी सिर्फ़ आपका ऑर्डर या लाइसेंस बनाने, उसके बारे में आपसे WhatsApp / फ़ोन पर बात करने, भुगतान पूरा करने, फ़ाइल और बिल भेजने और सेवा के दुरुपयोग को रोकने के लिए इस्तेमाल होती है। हम आपकी जानकारी बेचते नहीं और असंबंधित प्रचार के लिए इस्तेमाल नहीं करते।",
          "Your information is used only to prepare your order or licence, contact you about it on WhatsApp / phone, complete payment, send files and bills, and prevent misuse of the service. We do not sell your data or use it for unrelated marketing.",
        ),
      ],
    },
    {
      title: p("WhatsApp सूचनाएँ — आपकी सहमति", "WhatsApp notifications — your consent"),
      paras: [
        p(
          "ऑर्डर दर्ज करके आप सहमति देते हैं कि ऑर्डर में दिए नंबर पर ऑर्डर-पुष्टि, भुगतान, फ़ाइल और बिल की सूचनाएँ WhatsApp पर (अपने-आप भी) भेजी जाएँ। प्रचार-संदेश नहीं भेजे जाते।",
          "By placing an order you consent to receiving order confirmation, payment, file and bill notifications — including automated ones — on WhatsApp at the number given. No promotional messages are sent.",
        ),
      ],
    },
    {
      title: p("भुगतान", "Payments"),
      paras: [
        p(
          "ऑनलाइन भुगतान हमारे payment gateway partner के पेज पर होता है; कार्ड / UPI विवरण हमारे सर्वर पर कभी नहीं आते। हम केवल भुगतान-पहचान (transaction ID / UTR), राशि और स्थिति रखते हैं।",
          "Online payments happen on our payment gateway partner's page; card / UPI details never reach our servers. We keep only the transaction ID / UTR, amount and status.",
        ),
      ],
    },
    {
      title: p(
        "जानकारी कहाँ रहती है, किसके साथ साझा होती है",
        "Where it is kept and who we share it with",
      ),
      paras: [
        p(
          "वेबसाइट के ऑर्डर हमारे होस्टिंग / डेटाबेस सेवा-प्रदाता के सर्वर पर रहते हैं; फ़ाइलें बनाने का काम हमारे अपने कंप्यूटर पर होता है। तैयार फ़ाइलें डाउनलोड-लिंक के लिए सीमित समय तक क्लाउड फ़ाइल-स्टोरेज पर रहती हैं।",
          "Website orders are stored on our hosting / database provider's servers; the files are made on our own computers. Finished files stay on cloud file storage for a limited time for the download link.",
        ),
        p(
          "जानकारी सिर्फ़ सेवा चलाने के लिए ज़रूरी साझेदारों के साथ साझा होती है: होस्टिंग / डेटाबेस, फ़ाइल-स्टोरेज, WhatsApp संदेश-सेवा और payment gateway partner — और क़ानूनी माँग होने पर सक्षम प्राधिकारी के साथ। किसी छपाई या कूरियर कंपनी के साथ जानकारी साझा नहीं होती, क्योंकि हमारी डिलीवरी पूरी तरह डिजिटल है।",
          "We share information only with partners needed to run the service — hosting / database, file storage, WhatsApp messaging and our payment gateway partner — and with a competent authority when required by law. Nothing is shared with printing or courier companies because our delivery is fully digital.",
        ),
      ],
    },
    {
      title: p("Cookies", "Cookies"),
      paras: [
        p(
          "साइट सिर्फ़ ज़रूरी ब्राउज़र-स्टोरेज इस्तेमाल करती है — भाषा का चयन और रेफ़रल कोड याद रखने के लिए। विज्ञापन या tracking cookies नहीं।",
          "The site uses only essential browser storage — to remember your language and referral code. No advertising or tracking cookies.",
        ),
      ],
    },
    {
      title: p("जानकारी कब तक रहती है / हटवाना", "Retention and deletion"),
      paras: [
        p(
          "तैयार PDF हम 30 दिन तक रखते हैं; डाउनलोड-लिंक सीमित समय के लिए होते हैं और 30 दिन बाद फ़ाइल स्टोरेज से अपने आप हट जाती है। बैनर और अपलोड की गई फ़ोटो सूची 90 दिन के भीतर हटा दी जाती हैं। ऑर्डर और बिल का रिकॉर्ड हिसाब-किताब और क़ानूनी ज़रूरत तक रखा जाता है।",
          "We keep finished PDFs for 30 days; download links are time-limited and the file is removed from storage automatically after 30 days. Banners and uploaded photo lists are deleted within 90 days. Order and bill records are kept for accounting and legal needs.",
        ),
        p(
          `अपनी जानकारी देखने, सुधारने या हटवाने के लिए ${ORDERS_EMAIL} या WhatsApp ${CONTACT_DISPLAY} पर लिखिए — 7 कार्यदिवस में जवाब मिलेगा। जो रिकॉर्ड क़ानूनन रखना ज़रूरी है, वह उस अवधि तक रहेगा।`,
          `To see, correct or delete your information, write to ${ORDERS_EMAIL} or WhatsApp ${CONTACT_DISPLAY} — we reply within 7 working days. Records we must keep by law are kept for that period.`,
        ),
      ],
    },
    {
      title: p("सुरक्षा", "Security"),
      paras: [
        p(
          "लाइसेंस वाली डेटा-फ़ाइलें ग्राहक के कोड से बंद रहती हैं, डाउनलोड-लिंक समय-सीमित होते हैं और हमारे सिस्टम पासवर्ड से सुरक्षित हैं। हमारी सेवाएँ 18 वर्ष से अधिक आयु के लोगों के लिए हैं। इस नीति में बदलाव इसी पेज पर लगते ही लागू होगा।",
          "Licensed data files are locked with the customer's code, download links are time-limited and our systems are password-protected. Our services are meant for people over 18. Changes to this policy apply once published on this page.",
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Refund & Cancellation                                               */
/* ------------------------------------------------------------------ */

export const REFUND: PolicyDoc = {
  title: p("रिफंड एवं रद्दीकरण नीति", "Refund & Cancellation Policy"),
  sections: [
    {
      title: p("1. फ़ाइलें तैयार होने से पहले", "1. Before the files are ready"),
      paras: [
        p(
          "जब तक आपकी फ़ाइलें तैयार नहीं हुई हैं, ऑर्डर पेज से या WhatsApp पर बताकर ऑर्डर बिना किसी शुल्क के रद्द किया जा सकता है। भुगतान का QR फ़ाइलें तैयार होने के बाद ही भेजा जाता है — इसलिए QR बन जाने के बाद ऑर्डर रद्द नहीं होता। QR बनने के बाद भुगतान न करें तो QR तय समय में अपने-आप समाप्त हो जाता है और कोई राशि देय नहीं होती।",
          "Until your files are ready, an order can be cancelled free of charge from the order page or by telling us on WhatsApp. The payment QR is sent only after the files are ready — so once the QR has been generated, the order can no longer be cancelled. If you do not pay after the QR is generated, the QR simply expires after its validity period and nothing is owed.",
        ),
      ],
    },
    {
      title: p(
        "2. भुगतान के बाद, फ़ाइल बनने से पहले",
        "2. After payment, before the files are made",
      ),
      paras: [
        p(
          "ऑर्डर रद्द किया जा सकता है। पूरी राशि, payment gateway का शुल्क (यदि कोई) काटकर, 5–7 कार्यदिवस में मूल भुगतान-माध्यम में लौटा दी जाती है।",
          "The order can be cancelled. The full amount, minus the payment gateway's fee (if any), is returned to the original payment method within 5–7 working days.",
        ),
      ],
    },
    {
      title: p("3. फ़ाइल बनने / मिलने के बाद", "3. After the files are made or delivered"),
      paras: [
        p(
          "यह डिजिटल उत्पाद है — PDF WhatsApp या डाउनलोड लिंक पर पहुँचने के बाद रद्दीकरण या रिफंड संभव नहीं है।",
          "This is a digital product — once the PDFs reach you on WhatsApp or by download link, cancellation or refund is not possible.",
        ),
      ],
    },
    {
      title: p("4. सॉफ़्टवेयर लाइसेंस", "4. Software licences"),
      paras: [
        p(
          "लाइसेंस वाली डेटा-फ़ाइल और उसका कोड भेजे जाने के बाद रिफंड संभव नहीं है; लाइसेंस अवधि तक सहायता मिलती रहेगी। डेटा-फ़ाइल भेजे जाने से पहले रद्द करने पर बिंदु 2 लागू होगा।",
          "Once the licensed data file and its code have been sent, no refund is possible; support continues for the licence period. Cancelling before the data file is sent is covered by point 2.",
        ),
      ],
    },
    {
      title: p("5. हमारी ग़लती", "5. Our error"),
      paras: [
        p(
          "अगर फ़ाइल में हमारी ओर से त्रुटि है (ग़लत वार्ड, टूटी फ़ाइल, छूटे नाम, या आपके दिए नाम / चिन्ह से अलग छपाई), तो 48 घंटे में WhatsApp पर बताइए — हम बिना शुल्क दोबारा बना देंगे; दोबारा बनाना संभव न हो तो पूरा रिफंड।",
          "If a file has an error on our side (wrong ward, broken file, missing names, or a name / symbol different from what you gave), tell us on WhatsApp within 48 hours — we will remake it free of charge, or refund in full if remaking is not possible.",
        ),
      ],
    },
    {
      title: p("6. आपकी दी हुई जानकारी", "6. Information you provided"),
      paras: [
        p(
          "नाम, चिन्ह, क्रम संख्या, बैनर और दिनांक आप ऑर्डर देते समय देखकर देते हैं — इनमें बदलाव के लिए नया ऑर्डर लगेगा। बैनर के नाप की चेतावनी के बाद भी लगवाए गए बैनर वाली PDF पर रिफंड नहीं।",
          "You review and provide the name, symbol, serial number, banner and date when ordering — changing them needs a new order. No refund applies to a PDF made with a banner you chose to use after a size warning.",
        ),
      ],
    },
    {
      title: p("7. दोहरा / असफल भुगतान", "7. Duplicate or failed payments"),
      paras: [
        p(
          "एक ही ऑर्डर का दो बार भुगतान, या कटकर असफल हुआ भुगतान 5–7 कार्यदिवस में पूरा लौटाया जाता है; न लौटे तो ऑर्डर आईडी के साथ बताइए।",
          "A duplicate payment, or a payment that was debited but failed, is returned in full within 5–7 working days; if it does not arrive, contact us with your order ID.",
        ),
      ],
    },
    {
      title: p("8. हमारी ओर से रद्द", "8. Cancellation by us"),
      paras: [
        p(
          "सामग्री नियमों के विरुद्ध हो या सेवा देना संभव न हो, तो हम ऑर्डर रद्द कर सकते हैं — ली गई पूरी राशि 5–7 कार्यदिवस में लौटा दी जाएगी।",
          "If the content breaks our terms or we cannot provide the service, we may cancel the order — any amount received is refunded in full within 5–7 working days.",
        ),
      ],
    },
    {
      title: p("9. रिफंड कैसे माँगें", "9. How to ask for a refund"),
      paras: [
        p(
          `WhatsApp ${CONTACT_DISPLAY} या ${ORDERS_EMAIL} पर ऑर्डर आईडी और कारण लिखिए। स्वीकृत रिफंड 3 कार्यदिवस में शुरू होता है और बैंक / gateway के अनुसार 5–7 कार्यदिवस में खाते में आता है।`,
          `Write to WhatsApp ${CONTACT_DISPLAY} or ${ORDERS_EMAIL} with your order ID and the reason. Approved refunds are initiated within 3 working days and reach your account within 5–7 working days, depending on the bank / gateway.`,
        ),
      ],
    },
    {
      title: p("10. नमूना", "10. Samples"),
      paras: [
        p(
          "अनुरोध पर दिया गया पर्ची का नमूना और वेबसाइट का नमूना सॉफ़्टवेयर निःशुल्क हैं, इसलिए उन पर रिफंड का प्रश्न नहीं उठता।",
          "Sample slips given on request and the sample software on this website are free, so no refund arises for them.",
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Delivery (digital) — served at /shipping                            */
/* ------------------------------------------------------------------ */

export const DELIVERY: PolicyDoc = {
  title: p("डिलीवरी नीति (डिजिटल)", "Delivery Policy (Digital)"),
  intro: p(
    "हमारे सभी उत्पाद डिजिटल हैं — छपाई-योग्य PDF फ़ाइलें, सॉफ़्टवेयर और लाइसेंस वाली डेटा-फ़ाइलें। कोई भौतिक वस्तु, कूरियर या डाक से नहीं भेजी जाती, और कोई shipping शुल्क नहीं है।",
    "All our products are digital — print-ready PDF files, software and licensed data files. Nothing is sent by courier or post, and there is no shipping charge.",
  ),
  sections: [
    {
      title: p("कैसे मिलता है", "How you receive it"),
      paras: [],
      list: [
        p(
          "अभियान पर्ची PDF: ऑर्डर मिलते ही फ़ाइलें बनना शुरू हो जाती हैं। तैयार होने पर भुगतान का अनुरोध (QR / लिंक) भेजा जाता है, और भुगतान की पुष्टि होते ही फ़ाइलें ऑर्डर में दिए WhatsApp नंबर पर भेज दी जाती हैं — फ़ाइल के रूप में या डाउनलोड लिंक के रूप में। लिंक 30 दिन तक चलता है।",
          "Campaign slip PDFs: preparation starts as soon as the order is received. When the files are ready we send the payment request (QR / link), and once payment is confirmed the files are sent to the WhatsApp number in the order — as files or as a download link. The link stays valid for 30 days.",
        ),
        p(
          'सॉफ़्टवेयर: इसी वेबसाइट के "सॉफ़्टवेयर" पेज (saubhagya.net/software) से डाउनलोड होता है।',
          'Software: downloaded from the "Software" page of this website (saubhagya.net/software).',
        ),
        p(
          "सॉफ़्टवेयर लाइसेंस: आपके क्षेत्र की कोड से बंद डेटा-फ़ाइल और उसका कोड WhatsApp पर भेजे जाते हैं।",
          "Software licence: the code-locked data file for your area and its code are sent on WhatsApp.",
        ),
      ],
    },
    {
      title: p("समय", "Timing"),
      paras: [
        p(
          "अभियान पर्चियाँ: सामान्यतः 15 मिनट + हर 10,000 पर्चियों पर 10 मिनट। बड़े ऑर्डर / पूरी पंचायत समिति: 2–4 घंटे। बैनर वाले ऑर्डर में बैनर के नाप की जाँच के कारण थोड़ा अधिक समय लग सकता है।",
          "Campaign slips: usually 15 minutes + 10 minutes per 10,000 slips. Large orders / a whole panchayat samiti: 2–4 hours. Banner orders can take slightly longer while we check the banner size.",
        ),
        p(
          "सॉफ़्टवेयर लाइसेंस: भुगतान के बाद सामान्यतः उसी दिन; पूरे ज़िले का लाइसेंस होने पर 24 घंटे तक। कार्य-समय के बाहर हुए भुगतान की फ़ाइलें अगले कार्य-समय में भेजी जाती हैं।",
          "Software licences: usually the same day after payment; up to 24 hours for a whole-district licence. Files for payments made outside working hours are sent in the next working hours.",
        ),
      ],
    },
    {
      title: p("क्या मिलता है", "What you receive"),
      paras: [
        p(
          "आपके चुने डिज़ाइन में अभियान पर्ची PDF और चुनी हुई सूचियाँ (हिंदी वर्णमाला, English Alphabetical, परिवार वार), साथ में भुगतान का बिल। लाइसेंस में डेटा-फ़ाइल, उसका कोड और बिल।",
          "Campaign slip PDFs in your chosen design and the lists you selected (Hindi alphabetical, English alphabetical, family-wise), with the payment bill. A licence comes with the data file, its code and the bill.",
        ),
      ],
    },
    {
      title: p("छपाई", "Printing"),
      paras: [
        p(
          "PDF आप अपने प्रिंटर या स्थानीय प्रेस से A4 काग़ज़ पर, “Actual size / 100%” पर छपवाते हैं। हम छपाई नहीं करते।",
          "You print the PDFs on A4 paper at “Actual size / 100%” on your own printer or at a local press. We do not print.",
        ),
      ],
    },
    {
      title: p("फ़ाइल न मिले तो", "If you do not receive the files"),
      paras: [
        p(
          `कार्य-समय में 2 घंटे तक फ़ाइल न आए तो WhatsApp ${CONTACT_DISPLAY} पर ऑर्डर आईडी भेजिए। डाउनलोड लिंक की अवधि लिंक के साथ बताई जाती है — समय पर फ़ाइल उतार लीजिए; अवधि बीत जाए तो ज़रूरत पर दोबारा भेज देंगे।`,
          `If the files have not arrived within 2 hours during working hours, send your order ID on WhatsApp ${CONTACT_DISPLAY}. The validity of each download link is shown with the link — please download in time; if it expires, we can resend it.`,
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export const CONTACT: PolicyDoc = {
  title: p("संपर्क करें", "Contact Us"),
  sections: [
    {
      title: p("हमसे बात करें", "Talk to us"),
      paras: [
        p(`फ़ोन / WhatsApp: ${CONTACT_DISPLAY}`, `Phone / WhatsApp: ${CONTACT_DISPLAY}`),
        p(
          `ऑर्डर, भुगतान, रिफंड: ${ORDERS_EMAIL} · अन्य जानकारी: ${CONTACT_EMAIL}`,
          `Orders, payments, refunds: ${ORDERS_EMAIL} · General enquiries: ${CONTACT_EMAIL}`,
        ),
        p(`कार्य-समय: ${HOURS_HI}`, `Working hours: ${HOURS_EN}`),
      ],
    },
    {
      title: p("व्यापार का पता", "Business address"),
      paras: [p(ADDRESS_HI, ADDRESS_EN)],
    },
    {
      title: p("सेवा-क्षेत्र", "Service area"),
      paras: [
        p(
          "पूरा राजस्थान — कस्टमाइज्ड प्रिंट-रेडी टेम्पलेट्स, अभियान पर्ची PDF, डेटा प्रोसेसिंग और डिजिटल फ़ाइलें — सब डिजिटल डिलीवरी।",
          "All of Rajasthan — print-ready customized templates, campaign slip PDFs, data processing and digital files — all digital delivery.",
        ),
      ],
    },
    {
      title: p("ऑर्डर-सहायता", "Order support"),
      paras: [
        p(
          "लिखते समय अपना ऑर्डर आईडी (जैसे SBG-1234) साथ रखिए — उससे हम आपका ऑर्डर, भुगतान और डिलीवरी तुरंत देख सकते हैं।",
          "Keep your order ID (for example SBG-1234) handy when you write — it lets us pull up your order, payment and delivery straight away.",
        ),
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Software (sample download page)                                     */
/* ------------------------------------------------------------------ */

export const SOFTWARE: PolicyDoc = {
  title: p("सौभाग्य सॉफ़्टवेयर", "Saubhagya software"),
  intro: p(
    "मुफ़्त नमूना — पहले अपने कंप्यूटर पर चलाकर देखिए। पूरे क्षेत्र की पर्चियाँ ख़ुद बनानी हों तो उस क्षेत्र का लाइसेंस लीजिए।",
    "Free sample — try it on your own computer first. To make slips for a whole area yourself, take a licence for that area.",
  ),
  sections: [
    {
      title: p("यह क्या है", "What it is"),
      paras: [
        p(
          "Windows पर चलने वाला सॉफ़्टवेयर, जिससे आप अपने कंप्यूटर पर, बिना इंटरनेट, अभियान पर्ची PDF और सूचियाँ बना सकते हैं — हमारे सभी डिज़ाइन (P, A) के साथ। कुछ इंस्टॉल नहीं करना — फ़ाइल खोलिए और कोड डालिए।",
          "Windows software that lets you make campaign slip PDFs and lists on your own computer, offline — with all our designs (P, A). Nothing to install — open the file and enter the code.",
        ),
      ],
    },
    {
      title: p("नमूने में क्या है", "What the sample contains"),
      paras: [
        p(
          `नमूना डेटा इसी फ़ाइल के अंदर है — अलग से कुछ डाउनलोड नहीं करना। सॉफ़्टवेयर वही है जो लाइसेंस में मिलता है; नमूने में राजस्थान के सभी 41 ज़िलों के हर वार्ड / क्षेत्र के पहले 15 रिकॉर्ड (नमूना-मात्र; ऐप में ज़िला चुनिए), चारों पद — पंच, सरपंच, पंचायत समिति सदस्य, ज़िला परिषद सदस्य। खोलने का कोड: ${SAMPLE_CODE}`,
          `The sample data is inside the same file — nothing else to download. It is the same software you get with a licence; the sample just has limited data: the first 15 records of every ward / constituency in all 41 districts of Rajasthan (sample only; pick a district in the app), all four posts — Panch, Sarpanch, Panchayat Samiti member, Zila Parishad member. Code to open: ${SAMPLE_CODE}`,
        ),
      ],
    },
    {
      title: p("कैसे चलाएँ", "How to run it"),
      paras: [],
      list: [
        p(
          'ऊपर के हरे बटन से फ़ाइल डाउनलोड कीजिए (ब्राउज़र चेतावनी दिखाए तो "Keep / रखें" चुनिए) और खोलिए।',
          'Download the file with the green button above (if the browser warns, choose "Keep") and open it.',
        ),
        p(`कोड ${SAMPLE_CODE} डालिए।`, `Enter the code ${SAMPLE_CODE}.`),
        p(
          "ज़िला → पंचायत समिति → पद → क्षेत्र चुनिए, डिज़ाइन चुनिए और PDF बनाइए।",
          "Choose district → panchayat samiti → post → area, pick a design and make the PDF.",
        ),
        p(
          'Windows "unknown publisher" दिखाए तो More info → Run anyway दबाइए।',
          'If Windows shows "unknown publisher", click More info → Run anyway.',
        ),
      ],
    },
    {
      title: p("पूरे क्षेत्र का लाइसेंस", "Licence for a full area"),
      paras: [
        p(
          `WhatsApp ${CONTACT_DISPLAY} पर अपना ज़िला / पंचायत समिति और पद बताइए — इसी सॉफ़्टवेयर में खुलने वाली डेटा-फ़ाइल और उसका कोड भेजे जाएँगे। रेट: चारों पद ${paise(LICENCE_RATES.all)} पैसे / रिकॉर्ड, एक पद ${paise(LICENCE_RATES.one)} पैसे / रिकॉर्ड। लाइसेंस निर्दिष्ट अवधि तक; शर्तें: saubhagya.net/terms (धारा 9)।`,
          `Tell us your district / panchayat samiti and post(s) on WhatsApp ${CONTACT_DISPLAY} — we send a data file that opens in this same software, with its code. Rates: all four posts ${paise(LICENCE_RATES.all)} paise / record, one post ${paise(LICENCE_RATES.one)} paise / record. The licence runs for the specified period; terms: saubhagya.net/terms (clause 9).`,
        ),
      ],
    },
  ],
};
