import type { Lang } from "./i18n";

export const WHATSAPP_NUMBER = "919983333119";
export const CONTACT_DISPLAY = "+91 99833 33119";
export const SUPPORT_EMAIL = "support@saubhagya.net";

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
  voter_count?: number | null;
  amount?: number | null;
  design_code?: string | null;
  payment_status?: string | null;
};

const PAYMENT_TEXT: Record<string, string> = {
  PAID: "भुगतान प्राप्त (PAID)",
  PENDING: "भुगतान शेष (PENDING)",
  FAILED: "भुगतान असफल (FAILED)",
  REFUNDED: "राशि वापस (REFUNDED)",
};

/**
 * The WhatsApp handover message is a fixed Hindi template agreed with the
 * campaign desk. It is intentionally not translated: the receiving team reads
 * it in Hindi regardless of the visitor's UI language.
 */
export function buildWhatsAppUrl(payload: WhatsAppOrderPayload) {
  const message = [
    `नमस्ते सौभाग्य टीम, मैंने मतदाता पर्ची के लिए आवेदन किया है।`,
    `📋 *ऑर्डर आईडी:* ${payload.order_id}`,
    `👤 *उम्मीदवार:* ${payload.candidate_name_hindi} (${payload.candidate_name_english})`,
    `📍 *जिला:* ${payload.district}`,
    `🏛️ *पंचायत समिति:* ${payload.panchayat_samiti}`,
    `🏡 *ग्राम पंचायत:* ${payload.gram_panchayat}`,
    `🔢 *वार्ड नंबर:* ${payload.ward_number}`,
    `🗳️ *चुनाव चिन्ह:* ${payload.election_symbol}`,
    `🎨 *डिज़ाइन:* ${payload.design_code || "—"}`,
    `👥 *मतदाता संख्या:* ${payload.voter_count ?? "—"}`,
    `💰 *राशि:* ${payload.amount == null ? "—" : `₹${payload.amount}`}`,
    `💳 *भुगतान स्थिति:* ${PAYMENT_TEXT[payload.payment_status ?? "PENDING"] ?? "भुगतान शेष (PENDING)"}`,
    `📢 *नारा / संदेश:* ${payload.slogan?.trim() || "—"}`,
    `📞 *मोबाइल:* ${payload.contact_number}`,
    ``,
    `कृपया मेरा ऑर्डर ड्राफ्ट और पुष्टिकरण भेजें।`,
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildSampleWhatsAppUrl(payload: {
  request_id: string;
  candidate_name: string;
  contact_number: string;
  district?: string | null;
  gram_panchayat?: string | null;
  ward_number?: string | null;
}) {
  const message = [
    `नमस्ते सौभाग्य टीम, मुझे 24 मतदाताओं का निःशुल्क सैंपल चाहिए।`,
    `📋 *रिक्वेस्ट आईडी:* ${payload.request_id}`,
    `👤 *नाम:* ${payload.candidate_name}`,
    `📍 *जिला:* ${payload.district || "—"}`,
    `🏡 *ग्राम पंचायत:* ${payload.gram_panchayat || "—"}`,
    `🔢 *वार्ड नंबर:* ${payload.ward_number || "—"}`,
    `📞 *मोबाइल:* ${payload.contact_number}`,
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
