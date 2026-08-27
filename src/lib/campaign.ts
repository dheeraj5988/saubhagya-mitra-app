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
};

export function buildWhatsAppUrl(payload: WhatsAppOrderPayload) {
  const message = [
    `नमस्ते! सौभाग्य मतदाता पर्ची सेवा हेतु मेरा आवेदन:`,
    ``,
    `ऑर्डर आईडी: ${payload.order_id}`,
    `प्रत्याशी: ${payload.candidate_name_hindi} (${payload.candidate_name_english})`,
    `जिला: ${payload.district}`,
    `ग्राम पंचायत: ${payload.gram_panchayat}`,
    `वार्ड नंबर: ${payload.ward_number}`,
    `चुनाव चिन्ह: ${payload.election_symbol}`,
    `मोबाइल: ${payload.contact_number}`,
    ``,
    `कृपया आगे की प्रक्रिया एवं भुगतान विवरण भेजें।`,
  ].join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildEnquiryWhatsAppUrl(text = "नमस्ते! मुझे मतदाता पर्ची सेवा के बारे में जानकारी चाहिए।") {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
