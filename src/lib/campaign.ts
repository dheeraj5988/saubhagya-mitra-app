import type { Lang } from "./i18n";
import {
  ADDRESS_EN,
  CONTACT_DISPLAY as BIZ_CONTACT_DISPLAY,
  ORDERS_EMAIL,
  TRADE_NAME,
  WHATSAPP_NUMBER as BIZ_WHATSAPP_NUMBER,
} from "./business";

// Re-exported so older imports keep working; the values live in business.ts.
export const WHATSAPP_NUMBER = BIZ_WHATSAPP_NUMBER;
export const CONTACT_DISPLAY = BIZ_CONTACT_DISPLAY;
export const SUPPORT_EMAIL = ORDERS_EMAIL;
export const BUSINESS_NAME = TRADE_NAME;
export const BUSINESS_ADDRESS = ADDRESS_EN;

export type WhatsAppOrderPayload = {
  order_id: string;
  candidate_name_hindi: string;
  pad_label?: string | null;
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  booth_label?: string | null;
  election_symbol: string;
  evm_serial?: string | null;
  slogan?: string | null;
  contact_number: string;
  voter_count?: number | null;
  amount?: number | null;
  design_label?: string | null;
  banner_attached?: boolean;
  banner_needed?: boolean;
  payment_status?: string | null;
};

const PAYMENT_TEXT: Record<string, string> = {
  PAID: "भुगतान प्राप्त (PAID)",
  PENDING: "भुगतान शेष (PENDING)",
  FAILED: "भुगतान असफल (FAILED)",
  REFUNDED: "राशि वापस (REFUNDED)",
};

/**
 * The WhatsApp handover message is a fixed Hindi template read by the order
 * desk. It is intentionally not translated.
 */
export function buildWhatsAppUrl(payload: WhatsAppOrderPayload) {
  const bannerLine = payload.banner_needed
    ? `🖼️ *बैनर:* ${payload.banner_attached ? "वेबसाइट पर लगा दिया है" : "अभी नहीं लगाया — यहीं भेजूँगा"}`
    : null;
  const message = [
    `नमस्ते सौभाग्य टीम, मैंने अभियान पर्ची का ऑर्डर दिया है।`,
    `📋 *ऑर्डर आईडी:* ${payload.order_id}`,
    `👤 *प्रत्याशी:* ${payload.candidate_name_hindi || "—"}`,
    `🎖️ *पद:* ${payload.pad_label || "—"}`,
    `📍 *ज़िला:* ${payload.district}`,
    `🏛️ *पंचायत समिति:* ${payload.panchayat_samiti}`,
    `🏡 *ग्राम पंचायत:* ${payload.gram_panchayat}`,
    `🔢 *वार्ड:* ${payload.ward_number}`,
    `🗳️ *भाग:* ${payload.booth_label || "सभी भाग"}`,
    `🎨 *डिज़ाइन:* ${payload.design_label || "—"}`,
    `🔣 *चुनाव चिन्ह:* ${payload.election_symbol || "—"}`,
    `🔢 *EVM क्रम संख्या:* ${payload.evm_serial || "—"}`,
    bannerLine,
    `👥 *संख्या:* ${payload.voter_count ?? "—"}`,
    `💰 *राशि:* ${payload.amount == null ? "—" : `₹${payload.amount}`}`,
    `💳 *भुगतान:* ${PAYMENT_TEXT[payload.payment_status ?? "PENDING"] ?? PAYMENT_TEXT["PENDING"]}`,
    `📢 *नारा:* ${payload.slogan?.trim() || "—"}`,
    `📞 *मोबाइल:* ${payload.contact_number}`,
    ``,
    `कृपया भुगतान का तरीका बताइए।`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildSampleWhatsAppUrl(
  payload: {
    request_id?: string;
    candidate_name?: string;
    contact_number?: string;
    district?: string | null;
    gram_panchayat?: string | null;
    ward_number?: string | null;
  } = {},
) {
  const message = [
    `नमस्ते सौभाग्य टीम, मुझे अभियान पर्ची का नमूना चाहिए।`,
    payload.request_id ? `📋 *रिक्वेस्ट आईडी:* ${payload.request_id}` : null,
    `👤 *नाम:* ${payload.candidate_name || ""}`,
    `📍 *ज़िला:* ${payload.district || ""}`,
    `🏡 *ग्राम पंचायत:* ${payload.gram_panchayat || ""}`,
    `🔢 *वार्ड:* ${payload.ward_number || ""}`,
    payload.contact_number ? `📞 *मोबाइल:* ${payload.contact_number}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildEnquiryWhatsAppUrl(lang: Lang = "hi") {
  const text =
    lang === "en"
      ? "Hello! I would like information about Saubhagya."
      : "नमस्ते! मुझे सौभाग्य के बारे में जानकारी चाहिए।";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Short Hindi invite a partner can forward as-is. The link is passed in by the
 * caller so it always matches the site the admin is working on.
 */
export function buildPartnerInviteMessage(payload: { full_name: string; link: string }) {
  return [
    `नमस्ते ${payload.full_name} जी,`,
    `आपका सौभाग्य रेफ़रल लिंक तैयार है:`,
    payload.link,
    ``,
    `इस लिंक से आने वाले हर ऑर्डर पर आपका कमीशन अपने आप जुड़ जाएगा।`,
  ].join("\n");
}
