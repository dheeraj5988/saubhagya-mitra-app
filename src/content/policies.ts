/**
 * Text for /about, /pricing and every policy page, in Hindi and English.
 * Source: payment-gateway audit (19.09.2026), sections 5.1–5.7, with the
 * owner's decisions: panchayat elections only, digital delivery only,
 * refunds after payment minus the gateway fee, free sample only on request.
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
          `${whoHi} लक्ष्मणगढ़ (सीकर, राजस्थान) का एक स्वामित्व फ़र्म है। हम राजस्थान के पंचायत राज चुनाव — पंच, सरपंच, पंचायत समिति सदस्य और ज़िला परिषद सदस्य — के प्रत्याशियों के लिए छपाई-योग्य डिजिटल वोटर स्लिप (मतदाता पर्ची) तैयार करते हैं।`,
          `${whoEn} is a sole proprietorship based in Lachhmangarh (Sikar, Rajasthan). We prepare print-ready digital voter slips for candidates in Rajasthan's Panchayati Raj elections — Panch, Sarpanch, Panchayat Samiti member and Zila Parishad member.`,
        ),
      ],
    },
    {
      title: p("हम क्या करते हैं", "What we do"),
      paras: [
        p(
          "हम राज्य निर्वाचन आयोग, राजस्थान द्वारा सार्वजनिक रूप से प्रकाशित मतदाता-सूची से, प्रत्याशी के चुने हुए वार्ड / भाग की छपाई-योग्य PDF तैयार करते हैं:",
          "From the electoral rolls publicly published by the State Election Commission, Rajasthan, we prepare print-ready PDFs for the ward / booths the candidate selects:",
        ),
      ],
      list: [
        p("वोटर स्लिप — घर-घर बाँटने के लिए", "Voter slips — for door-to-door distribution"),
        p("हिंदी वर्णमाला क्रम सूची", "Hindi alphabetical list"),
        p("English Alphabetical सूची", "English alphabetical list"),
        p("परिवार वार सूची", "Family-wise list"),
      ],
    },
    {
      title: p("डिज़ाइन", "Designs"),
      paras: [
        p(
          "सादी पर्ची (P-16, P-12) में सिर्फ़ मतदाता की जानकारी होती है। चुनाव-चिन्ह (SR-10 / SL-10) और विज्ञापन (AT-9, AT-8, AL-8, AR-8) वाले डिज़ाइन में प्रत्याशी का नाम, चुनाव चिन्ह, EVM क्रम संख्या और आपका बैनर भी छपता है।",
          "Plain slips (P-16, P-12) carry voter details only. Symbol designs (SR-10 / SL-10) and advertisement designs (AT-9, AT-8, AL-8, AR-8) also carry the candidate's name, election symbol, EVM serial number and your banner.",
        ),
      ],
    },
    {
      title: p("हम क्या नहीं करते", "What we do not do"),
      paras: [],
      list: [
        p(
          "हम मतदाता-सूची में कोई बदलाव नहीं करते और कोई निजी जानकारी नहीं जोड़ते।",
          "We do not alter the electoral roll or add any personal data to it.",
        ),
        p(
          "हम कोई भौतिक छपाई या डिलीवरी नहीं करते — PDF आप अपने प्रिंटर या स्थानीय प्रेस से छपवाते हैं।",
          "We do not print or ship anything — you print the PDFs yourself or at a local press.",
        ),
        p(
          "हम किसी राजनीतिक दल या प्रत्याशी से जुड़े नहीं हैं।",
          "We are not affiliated with any political party or candidate.",
        ),
        p(
          "हम चंदा / फ़ंड नहीं लेते-देते और चुनाव-प्रचार नहीं करते।",
          "We do not collect or route donations or campaign funds, and we do not run campaigns.",
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
/* Pricing (table is rendered by the route; these are the notes)       */
/* ------------------------------------------------------------------ */

export const PRICING_ROWS: {
  series: string;
  what: Bi;
  designs: string;
  rate: number;
}[] = [
  {
    series: "P",
    what: p("सादी पर्ची — मतदाता की पूरी जानकारी", "Plain slip — full voter details"),
    designs: "P-16, P-12",
    rate: SERIES_RATES.P,
  },
  {
    series: "S",
    what: p(
      "चुनाव-चिन्ह पट्टी — P + प्रत्याशी का नाम, चिन्ह, EVM क्रम",
      "Symbol strip — P + candidate name, symbol, EVM serial",
    ),
    designs: "SR-10, SL-10",
    rate: SERIES_RATES.S,
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
      "मतदाता की फ़ोटो सहित (जहाँ फ़ोटो-सूची उपलब्ध हो)",
      "With voter photo (where the photo roll is available)",
    ),
    designs: "—",
    rate: SERIES_RATES.Ph,
  },
];

export const PRICING_NOTES: Bi[] = [
  p(
    "राशि = चुने हुए वार्ड / भाग के मतदाता × प्रति-पर्ची रेट। मतदाता-गिनती ऑर्डर फ़ॉर्म पर चुनते ही दिखती है, और भुगतान से पहले पूरी राशि बताई जाती है।",
    "Amount = voters in the selected ward / booths × per-slip rate. The voter count appears on the order form as you select, and the full amount is shown before payment.",
  ),
  p(taxHi, taxEn),
  p(
    "भुगतान: अभी WhatsApp पर (UPI)। ऑनलाइन भुगतान (UPI / कार्ड / नेटबैंकिंग) हमारे payment gateway partner के सुरक्षित पेज पर जल्द शुरू होगा; भुगतान की जानकारी हमारे पास नहीं रहती।",
    "Payment: on WhatsApp (UPI) for now. Online payment (UPI / card / netbanking) on our payment gateway partner's secure page is coming soon; we never store payment credentials.",
  ),
  p(
    "नमूना (sample) अनुरोध पर — WhatsApp पर अपना ज़िला / पंचायत बताइए।",
    "A sample is available on request — share your district / panchayat on WhatsApp.",
  ),
];

export const PRICING_EXAMPLE_VOTERS = 7500;

/* ------------------------------------------------------------------ */
/* Terms                                                               */
/* ------------------------------------------------------------------ */

export const TERMS: PolicyDoc = {
  title: p("नियम एवं शर्तें", "Terms & Conditions"),
  intro: p(
    "इस वेबसाइट पर ऑर्डर देकर आप नीचे लिखी शर्तें स्वीकार करते हैं।",
    "By placing an order on this website you accept the terms below.",
  ),
  sections: [
    {
      title: p("1. सेवा के बारे में", "1. About the service"),
      paras: [
        p(
          `${whoHi} राजस्थान के पंचायत राज चुनाव के प्रत्याशियों के लिए, राज्य निर्वाचन आयोग की सार्वजनिक मतदाता-सूची से, छपाई-योग्य PDF वोटर स्लिप और सूचियाँ डिजिटल रूप में उपलब्ध कराता है। हम छपाई नहीं करते और कोई भौतिक वस्तु नहीं भेजते।`,
          `${whoEn} provides print-ready PDF voter slips and lists, prepared from the State Election Commission's public electoral rolls, in digital form to candidates in Rajasthan's Panchayati Raj elections. We do not print and do not ship any physical goods.`,
        ),
      ],
    },
    {
      title: p("2. ऑर्डर और आपकी दी हुई जानकारी", "2. Orders and the information you provide"),
      paras: [
        p(
          "क्षेत्र, पद, वार्ड / भाग, डिज़ाइन, प्रत्याशी का नाम (हिंदी में), चुनाव चिन्ह, EVM क्रम संख्या, बैनर और मोबाइल नंबर की सही जानकारी देना आपकी ज़िम्मेदारी है। हम वही छापते हैं जो आप ऑर्डर में देते हैं।",
          "You are responsible for the accuracy of the area, post, ward / booths, design, candidate name (in Hindi), election symbol, EVM serial number, banner and mobile number you submit. We print exactly what you give in the order.",
        ),
        p(
          "आप पुष्टि करते हैं कि आपके दिए हर नाम, चिन्ह, नारे और तस्वीर को इस्तेमाल करने का अधिकार आपके पास है।",
          "You confirm that you have the right to use every name, symbol, slogan and image you provide.",
        ),
      ],
    },
    {
      title: p("3. रेट", "3. Pricing"),
      paras: [
        p(
          `राशि = चुने हुए क्षेत्र के मतदाता × प्रति-पर्ची रेट (P ${paise(SERIES_RATES.P)} पैसे, S / A ${paise(SERIES_RATES.S)} पैसे, Ph ${paise(SERIES_RATES.Ph)} पैसे — पूरी रेट सूची: saubhagya.net/pricing)। मतदाता-गिनती और पूरी राशि भुगतान से पहले ऑर्डर पर दिखाई जाती है।`,
          `Amount = voters in the selected area × per-slip rate (P ${paise(SERIES_RATES.P)} paise, S / A ${paise(SERIES_RATES.S)} paise, Ph ${paise(SERIES_RATES.Ph)} paise — full rate list: saubhagya.net/pricing). The voter count and full amount are shown on the order before payment.`,
        ),
        p(taxHi, taxEn),
      ],
    },
    {
      title: p("4. ऑर्डर की पुष्टि", "4. Order confirmation"),
      paras: [
        p(
          "ऑर्डर-फ़ॉर्म पर आप क्षेत्र, डिज़ाइन, प्रत्याशी की जानकारी और बैनर देखकर ऑर्डर दर्ज करते हैं। भुगतान की पुष्टि होने पर ऑर्डर पक्का माना जाता है और फ़ाइलें बनना शुरू होती हैं।",
          "You place the order after reviewing the area, design, candidate details and banner on the order form. The order is confirmed once payment is confirmed, and file preparation then begins.",
        ),
      ],
    },
    {
      title: p("5. भुगतान", "5. Payments"),
      paras: [
        p(
          "अभी भुगतान WhatsApp पर बताए गए UPI से होता है। ऑनलाइन भुगतान शुरू होने पर वह हमारे payment gateway partner के सुरक्षित पेज पर होगा। कार्ड / UPI / बैंक की जानकारी हमारे सर्वर पर कभी नहीं आती। रिफंड और रद्दीकरण: saubhagya.net/refund",
          "For now payment is made by UPI as shared on WhatsApp. Once online payment starts, it will take place on our payment gateway partner's secure page. Card / UPI / bank details never reach our servers. Refunds and cancellations: saubhagya.net/refund",
        ),
      ],
    },
    {
      title: p("6. डिलीवरी", "6. Delivery"),
      paras: [
        p(
          "फ़ाइलें WhatsApp पर (फ़ाइल या डाउनलोड लिंक के रूप में) भेजी जाती हैं — विवरण: saubhagya.net/shipping (डिलीवरी नीति)।",
          "Files are delivered on WhatsApp (as files or a download link) — details: saubhagya.net/shipping (Delivery Policy).",
        ),
      ],
    },
    {
      title: p("7. स्वीकार्य उपयोग", "7. Acceptable use"),
      paras: [
        p(
          "पर्चियों का उपयोग राज्य निर्वाचन आयोग के नियमों और आदर्श आचार संहिता के अनुसार करना ग्राहक की ज़िम्मेदारी है। अश्लील, अपमानजनक, सांप्रदायिक या चुनाव-क़ानून तोड़ने वाली सामग्री वाला ऑर्डर हम मना या रद्द कर सकते हैं। सेवा सिर्फ़ पंचायत राज चुनाव के लिए है।",
          "Using the slips in line with the State Election Commission's rules and the model code of conduct is the customer's responsibility. We may refuse or cancel any order with content that is obscene, defamatory, communal or in breach of election law. The service is for Panchayati Raj elections only.",
        ),
      ],
    },
    {
      title: p("8. दायित्व", "8. Liability"),
      paras: [
        p(
          "किसी ऑर्डर के लिए हमारा दायित्व उस ऑर्डर की चुकाई गई राशि तक सीमित है। चुनाव-परिणाम, आपकी दी हुई ग़लत जानकारी, या हमारे नियंत्रण से बाहर की देरी के लिए हम ज़िम्मेदार नहीं हैं।",
          "Our liability for any order is limited to the amount paid for that order. We are not liable for election outcomes, incorrect information you supplied, or delays beyond our control.",
        ),
      ],
    },
    {
      title: p("9. लागू क़ानून", "9. Governing law"),
      paras: [
        p(
          "ये शर्तें भारत के क़ानून के अधीन हैं; किसी भी विवाद पर राजस्थान के न्यायालयों का विशेष क्षेत्राधिकार होगा।",
          "These terms are governed by the laws of India, and the courts of Rajasthan have exclusive jurisdiction over any dispute.",
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
          "ऑर्डर के लिए: प्रत्याशी का नाम (हिंदी), मोबाइल नंबर, ज़िला / पंचायत समिति / ग्राम पंचायत / वार्ड / भाग, पद, डिज़ाइन, चुनाव चिन्ह, EVM क्रम संख्या, नारा, बैनर की तस्वीर, और फ़ोटो-पर्ची के लिए आपकी अपलोड की हुई मतदाता-सूची PDF।",
          "For an order: candidate name (Hindi), mobile number, district / panchayat samiti / gram panchayat / ward / booths, post, design, election symbol, EVM serial number, slogan, banner image, and — for photo slips — the voter-list PDF you upload.",
        ),
        p(
          "सुरक्षा और दुरुपयोग रोकने के लिए हम वेबसाइट पर आने वालों का IP पता और ब्राउज़र की जानकारी दर्ज करते हैं (IP जानने के लिए एक बाहरी सेवा ipify.org का उपयोग होता है), और फ़ॉर्म में भरा मोबाइल नंबर भी — ऑर्डर पूरा न हो तब भी — ताकि हमारी टीम आपकी मदद कर सके।",
          "For security and to prevent misuse we record visitors' IP address and browser details (an external service, ipify.org, is used to read the IP), and the mobile number typed into the form — even if the order is not completed — so our team can help you finish it.",
        ),
      ],
    },
    {
      title: p("मतदाता-सूची का स्रोत", "Source of voter data"),
      paras: [
        p(
          "पर्चियों पर छपने वाला मतदाता-विवरण राज्य निर्वाचन आयोग, राजस्थान द्वारा सार्वजनिक रूप से प्रकाशित मतदाता-सूची से लिया जाता है। हम उसमें कोई बदलाव या जोड़ नहीं करते, और उसे किसी और उद्देश्य के लिए नहीं बेचते।",
          "The voter details printed on the slips come from the electoral rolls publicly published by the State Election Commission, Rajasthan. We do not alter or add to them, and we do not sell them for any other purpose.",
        ),
      ],
    },
    {
      title: p("जानकारी का उपयोग", "How we use it"),
      paras: [
        p(
          "आपकी जानकारी सिर्फ़ आपका ऑर्डर बनाने, उसके बारे में आपसे WhatsApp / फ़ोन पर बात करने, भुगतान पूरा करने और सेवा के दुरुपयोग को रोकने के लिए इस्तेमाल होती है। हम आपकी जानकारी बेचते नहीं और असंबंधित प्रचार के लिए इस्तेमाल नहीं करते।",
          "Your information is used only to prepare your order, contact you about it on WhatsApp / phone, complete payment and prevent misuse of the service. We do not sell your data or use it for unrelated marketing.",
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
          "ऑनलाइन भुगतान हमारे payment gateway partner के पेज पर होता है; कार्ड / UPI विवरण हमारे सर्वर पर कभी नहीं आते। हम केवल भुगतान-पहचान (transaction ID), राशि और स्थिति रखते हैं।",
          "Online payments happen on our payment gateway partner's page; card / UPI details never reach our servers. We keep only the transaction ID, amount and status.",
        ),
      ],
    },
    {
      title: p("किसके साथ साझा होती है", "Who we share it with"),
      paras: [
        p(
          "सिर्फ़ सेवा चलाने के लिए ज़रूरी साझेदारों के साथ: होस्टिंग / डेटाबेस, फ़ाइल-स्टोरेज, और payment gateway partner। किसी छपाई या कूरियर कंपनी के साथ जानकारी साझा नहीं होती, क्योंकि हमारी डिलीवरी पूरी तरह डिजिटल है।",
          "Only with partners needed to run the service: hosting / database, file storage, and our payment gateway partner. Nothing is shared with printing or courier companies because our delivery is fully digital.",
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
          `ऑर्डर का रिकॉर्ड हिसाब-किताब और सहायता के लिए रखा जाता है। डिलीवरी के बाद अपनी तस्वीर और संपर्क-जानकारी हटवाने के लिए ${ORDERS_EMAIL} पर लिखिए।`,
          `Order records are kept for accounting and support. To have your images and contact details deleted after delivery, write to ${ORDERS_EMAIL}.`,
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
      title: p("1. भुगतान से पहले", "1. Before payment"),
      paras: [
        p(
          "ऑर्डर WhatsApp पर बताकर कभी भी, बिना किसी शुल्क के, रद्द किया जा सकता है।",
          "You can cancel an order at any time, free of charge, by telling us on WhatsApp.",
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
          "ऑर्डर रद्द किया जा सकता है। पूरी राशि, payment gateway का शुल्क काटकर, 5–7 कार्यदिवस में मूल भुगतान-माध्यम में लौटा दी जाती है।",
          "The order can be cancelled. The full amount, minus the payment gateway's fee, is returned to the original payment method within 5–7 working days.",
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
      title: p("4. हमारी ग़लती", "4. Our error"),
      paras: [
        p(
          "अगर फ़ाइल में हमारी ओर से त्रुटि है (ग़लत वार्ड, टूटी फ़ाइल, छूटे मतदाता, या आपके दिए नाम / चिन्ह से अलग छपाई), तो 48 घंटे में WhatsApp पर बताइए — हम बिना शुल्क दोबारा बना देंगे; दोबारा बनाना संभव न हो तो पूरा रिफंड।",
          "If a file has an error on our side (wrong ward, broken file, missing voters, or a name / symbol different from what you gave), tell us on WhatsApp within 48 hours — we will remake it free of charge, or refund in full if remaking is not possible.",
        ),
      ],
    },
    {
      title: p("5. आपकी दी हुई जानकारी", "5. Information you provided"),
      paras: [
        p(
          "प्रत्याशी का नाम, चिन्ह, EVM क्रम संख्या, बैनर और मतदान-दिनांक आप ऑर्डर देते समय देखकर देते हैं — इनमें बदलाव के लिए नया ऑर्डर लगेगा।",
          "You review and provide the candidate name, symbol, EVM serial number, banner and polling date when ordering — changing them needs a new order.",
        ),
      ],
    },
    {
      title: p("6. दोहरा / असफल भुगतान", "6. Duplicate or failed payments"),
      paras: [
        p(
          "एक ही ऑर्डर का दो बार भुगतान, या कटकर असफल हुआ भुगतान 5–7 कार्यदिवस में पूरा लौटाया जाता है; न लौटे तो ऑर्डर आईडी के साथ बताइए।",
          "A duplicate payment, or a payment that was debited but failed, is returned in full within 5–7 working days; if it does not arrive, contact us with your order ID.",
        ),
      ],
    },
    {
      title: p("7. रिफंड कैसे माँगें", "7. How to ask for a refund"),
      paras: [
        p(
          `WhatsApp ${CONTACT_DISPLAY} या ${ORDERS_EMAIL} पर ऑर्डर आईडी और कारण लिखिए। स्वीकृत रिफंड 3 कार्यदिवस में शुरू होता है और बैंक / gateway के अनुसार 5–7 कार्यदिवस में खाते में आता है।`,
          `Write to WhatsApp ${CONTACT_DISPLAY} or ${ORDERS_EMAIL} with your order ID and the reason. Approved refunds are initiated within 3 working days and reach your account within 5–7 working days, depending on the bank / gateway.`,
        ),
      ],
    },
    {
      title: p("8. नमूना", "8. Sample"),
      paras: [
        p(
          "अनुरोध पर दिया गया नमूना निःशुल्क है, इसलिए उस पर रिफंड का प्रश्न नहीं उठता।",
          "A sample given on request is free, so no refund arises for it.",
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
    "हमारे सभी उत्पाद डिजिटल हैं — छपाई-योग्य PDF फ़ाइलें। कोई भौतिक वस्तु, कूरियर या डाक से नहीं भेजी जाती, और कोई shipping शुल्क नहीं है।",
    "All our products are digital — print-ready PDF files. Nothing is sent by courier or post, and there is no shipping charge.",
  ),
  sections: [
    {
      title: p("कैसे मिलता है", "How you receive it"),
      paras: [
        p(
          "भुगतान की पुष्टि होते ही फ़ाइलें बनती हैं और ऑर्डर में दिए WhatsApp नंबर पर भेजी जाती हैं — फ़ाइल के रूप में या डाउनलोड लिंक के रूप में।",
          "Once payment is confirmed the files are prepared and sent to the WhatsApp number in the order — as files or as a download link.",
        ),
      ],
    },
    {
      title: p("समय", "Timing"),
      paras: [
        p(
          "सामान्यतः 15 मिनट + हर 10,000 मतदाता पर 10 मिनट। बड़े ऑर्डर / पूरी पंचायत समिति: 2–4 घंटे। बैनर वाले ऑर्डर में बैनर के नाप की जाँच के कारण थोड़ा अधिक समय लग सकता है। कार्य-समय के बाहर हुए भुगतान की फ़ाइलें अगले कार्य-समय में भेजी जाती हैं।",
          "Usually 15 minutes + 10 minutes per 10,000 voters. Large orders / a whole panchayat samiti: 2–4 hours. Banner orders can take slightly longer while we check the banner size. Files for payments made outside working hours are sent in the next working hours.",
        ),
      ],
    },
    {
      title: p("क्या मिलता है", "What you receive"),
      paras: [
        p(
          "आपके चुने डिज़ाइन में वोटर स्लिप PDF और चुनी हुई सूचियाँ (हिंदी वर्णमाला, English Alphabetical, परिवार वार), साथ में भुगतान का बिल।",
          "Voter-slip PDFs in your chosen design and the lists you selected (Hindi alphabetical, English alphabetical, family-wise), with the payment bill.",
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
          `कार्य-समय में 2 घंटे तक फ़ाइल न आए तो WhatsApp ${CONTACT_DISPLAY} पर ऑर्डर आईडी भेजिए। डाउनलोड लिंक 60 दिन तक चलता है — ज़रूरत हो तो दोबारा भेज देंगे।`,
          `If the files have not arrived within 2 hours during working hours, send your order ID on WhatsApp ${CONTACT_DISPLAY}. Download links stay valid for 60 days — we can resend them if needed.`,
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
          "पूरे राजस्थान में पंचायत राज चुनाव — पंच, सरपंच, पंचायत समिति सदस्य और ज़िला परिषद सदस्य के प्रत्याशी।",
          "Panchayati Raj elections across Rajasthan — candidates for Panch, Sarpanch, Panchayat Samiti member and Zila Parishad member.",
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
