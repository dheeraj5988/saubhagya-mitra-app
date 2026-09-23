/**
 * ONE place for the business identity shown across the site (header, footer,
 * contact, policies, WhatsApp messages).
 *
 * ⚠️ BEFORE PUSHING LIVE fill the four LEGAL_* values below exactly as they
 * appear on your PAN / GST certificate. Payment gateways (Cashfree, Razorpay,
 * PhonePe) check that the legal name on the website matches your KYC.
 * Empty values are simply hidden — nothing like "[fill me]" is ever shown.
 */

/** Trading name — the only brand name used anywhere on the site. */
export const TRADE_NAME_HI = "सौभाग्य वोटर स्लिप";
export const TRADE_NAME_EN = "Saubhagya Voter Slip";
export const TRADE_NAME = `${TRADE_NAME_HI} / ${TRADE_NAME_EN}`;

/** Legal name exactly as on PAN / GST (e.g. "Dheeraj Sharma"). */
export const LEGAL_NAME = "SAUBHAGYA";
/** Proprietor name (sole proprietorship). */
export const PROPRIETOR_NAME = "PREETI SHARMA";
/** 15-character GSTIN. Leave empty if not registered. */
export const GSTIN = "";
/** "composition" | "regular" — only used when GSTIN is filled. */
export const GST_SCHEME: "composition" | "regular" = "composition";
/** Udyam (MSME) registration number. Leave empty to hide. */
export const UDYAM_NUMBER = "UDYAM-RJ-30-0145497";

export const WHATSAPP_NUMBER = "919983333119";
export const CONTACT_DISPLAY = "+91 99833 33119";

/** Orders, payments and refunds. Forwards to the team Gmail (Cloudflare). */
export const ORDERS_EMAIL = "orders@saubhagya.net";
/** General enquiries. Forwards to the team Gmail (Cloudflare). */
export const CONTACT_EMAIL = "contact@saubhagya.net";

export const ADDRESS_HI = "1, मिश्रा मार्केट, बैंक स्ट्रीट, लक्ष्मणगढ़, ज़िला सीकर, राजस्थान – 332311";
export const ADDRESS_EN =
  "1, Mishra Market, Bank Street, Laxmangarh, Sikar, Rajasthan – 332311, India";

export const HOURS_HI = "सुबह 9 से रात 9 बजे तक, सातों दिन · ऑनलाइन ऑर्डर 24×7";
export const HOURS_EN = "9 am – 9 pm IST, all days · online orders 24×7";

/** Effective date printed on every policy page. */
export const POLICY_DATE_HI = "23 सितम्बर 2026";
export const POLICY_DATE_EN = "23 September 2026";

export const SITE_URL = "https://saubhagya.net";

export const hasLegalName = () => LEGAL_NAME.trim().length > 0;
export const hasGstin = () => GSTIN.trim().length === 15;
export const isComposition = () => hasGstin() && GST_SCHEME === "composition";

/** Name used in "© 2026 …" — legal name when filled, otherwise the trade name. */
export const copyrightName = (lang: "hi" | "en") =>
  hasLegalName() ? LEGAL_NAME : lang === "en" ? TRADE_NAME_EN : TRADE_NAME_HI;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
