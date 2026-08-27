import type { Lang } from "./i18n";

export const WHATSAPP_NUMBER = "919828555751";
export const CONTACT_DISPLAY = "+91 98285 55751";

export type WhatsAppOrderPayload = {
  order_id: string;
  candidate_name_hindi: string;
  candidate_name_english: string;
  gram_panchayat: string;
  ward_number: string;
  district: string;
  election_symbol: string;
  contact_number: string;
  /** Whether the candidate has already uploaded a payment screenshot. */
  payment_screenshot_sent?: boolean;
  lang?: Lang;
};

export function buildWhatsAppUrl(payload: WhatsAppOrderPayload) {
  const en = payload.lang === "en";
  const paymentLine = payload.payment_screenshot_sent
    ? en
      ? "Payment screenshot: uploaded (awaiting verification)"
      : "भुगतान स्क्रीनशॉट: अपलोड कर दिया गया (सत्यापन प्रतीक्षारत)"
    : en
      ? "Payment screenshot: not uploaded yet"
      : "भुगतान स्क्रीनशॉट: अभी अपलोड नहीं किया";

  const message = en
    ? [
        `Hello! My request for the Saubhagya Matdata Parchi service:`,
        ``,
        `Order ID: ${payload.order_id}`,
        `Candidate: ${payload.candidate_name_english} (${payload.candidate_name_hindi})`,
        `District: ${payload.district}`,
        `Gram Panchayat: ${payload.gram_panchayat}`,
        `Ward number: ${payload.ward_number}`,
        `Election symbol: ${payload.election_symbol}`,
        `Mobile: ${payload.contact_number}`,
        paymentLine,
        ``,
        `Please share the next steps.`,
      ]
    : [
        `नमस्ते! सौभाग्य मतदाता पर्ची सेवा हेतु मेरा आवेदन:`,
        ``,
        `ऑर्डर आईडी: ${payload.order_id}`,
        `प्रत्याशी: ${payload.candidate_name_hindi} (${payload.candidate_name_english})`,
        `जिला: ${payload.district}`,
        `ग्राम पंचायत: ${payload.gram_panchayat}`,
        `वार्ड नंबर: ${payload.ward_number}`,
        `चुनाव चिन्ह: ${payload.election_symbol}`,
        `मोबाइल: ${payload.contact_number}`,
        paymentLine,
        ``,
        `कृपया आगे की प्रक्रिया की जानकारी भेजें।`,
      ];

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.join("\n"))}`;
}

export function buildEnquiryWhatsAppUrl(lang: Lang = "hi") {
  const text =
    lang === "en"
      ? "Hello! I would like information about the voter slip service."
      : "नमस्ते! मुझे मतदाता पर्ची सेवा के बारे में जानकारी चाहिए।";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
