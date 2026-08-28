import type { Lang } from "./i18n";

export const WHATSAPP_NUMBER = "919828555751";
export const CONTACT_DISPLAY = "+91 98285 55751";

export type WhatsAppOrderPayload = {
  order_id: string;
  candidate_name_hindi: string;
  candidate_name_english: string;
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  election_symbol: string;
  slogan?: string | null;
  contact_number: string;
  /** Whether the candidate has already uploaded a payment screenshot. */
  payment_screenshot_sent?: boolean;
  /** Chosen payment route, used verbatim in the message. */
  payment_method?: "MANUAL_QR" | "PAYPUR_GATEWAY";
};

/** Exact wording required by the campaign team for uploaded screenshots. */
export const SCREENSHOT_UPLOADED_TEXT = "अपलोड कर दिया गया (Verification Pending)";
const SCREENSHOT_PENDING_TEXT = "अभी अपलोड नहीं किया";

/**
 * The WhatsApp handover message is a fixed Hindi template agreed with the
 * campaign desk. It is intentionally not translated: the receiving team reads
 * it in Hindi regardless of the visitor's UI language.
 */
export function buildWhatsAppUrl(payload: WhatsAppOrderPayload) {
  const paymentMethod =
    payload.payment_method === "PAYPUR_GATEWAY" ? "PayPur (ऑनलाइन UPI)" : "QR / UPI (मैनुअल)";
  const screenshotStatus = payload.payment_screenshot_sent
    ? SCREENSHOT_UPLOADED_TEXT
    : SCREENSHOT_PENDING_TEXT;

  const message = [
    `नमस्ते सौभाग्य टीम, मैंने मतदाता पर्ची के लिए आवेदन किया है।`,
    `📋 *ऑर्डर आईडी:* ${payload.order_id}`,
    `👤 *उम्मीदवार:* ${payload.candidate_name_hindi} (${payload.candidate_name_english})`,
    `📍 *जिला:* ${payload.district}`,
    `🏛️ *पंचायत समिति:* ${payload.panchayat_samiti}`,
    `🏡 *ग्राम पंचायत:* ${payload.gram_panchayat}`,
    `🔢 *वार्ड नंबर:* ${payload.ward_number}`,
    `🗳️ *चुनाव चिन्ह:* ${payload.election_symbol}`,
    `📢 *नारा / संदेश:* ${payload.slogan?.trim() || "—"}`,
    `📞 *मोबाइल:* ${payload.contact_number}`,
    `💳 *भुगतान प्रकार:* ${paymentMethod}`,
    `📸 *भुगतान स्क्रीनशॉट:* ${screenshotStatus}`,
    ``,
    `कृपया मेरा ऑर्डर ड्राफ्ट और पुष्टिकरण भेजें।`,
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildEnquiryWhatsAppUrl(lang: Lang = "hi") {
  const text =
    lang === "en"
      ? "Hello! I would like information about the voter slip service."
      : "नमस्ते! मुझे मतदाता पर्ची सेवा के बारे में जानकारी चाहिए।";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
