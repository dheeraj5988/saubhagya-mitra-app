import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "hi" | "en";

export const LANG_STORAGE_KEY = "sbg_lang";
export const DEFAULT_LANG: Lang = "hi";

type Entry = { hi: string; en: string };

/**
 * Single source of truth for every piece of public-facing UI copy.
 * Candidate-entered values are never routed through here.
 */
export const DICTIONARY = {
  "brand.name": { hi: "सौभाग्य", en: "Saubhagya" },
  "brand.tagline": { hi: "मतदाता पर्ची सेवा", en: "Matdata Parchi Service" },
  "brand.full": { hi: "सौभाग्य मतदाता पर्ची सेवा", en: "Saubhagya Matdata Parchi Service" },

  "lang.switch": { hi: "भाषा", en: "Language" },
  "lang.hi": { hi: "हिंदी", en: "हिंदी" },
  "lang.en": { hi: "English", en: "English" },

  "nav.whatsapp": { hi: "WhatsApp", en: "WhatsApp" },

  "order.heading": { hi: "मतदाता पर्ची आवेदन", en: "Voter slip request" },
  "order.subheading": {
    hi: "क्षेत्र चुनें, ज़रूरी जानकारी भरें और डिज़ाइन चुनकर आवेदन भेजें।",
    en: "Select your area, add the details you want and choose a design.",
  },

  "referral.badge": { hi: "रेफ़रल", en: "Referred by" },

  "form.section.area": { hi: "क्षेत्र चुनें", en: "Select your area" },
  "form.section.optional": { hi: "वैकल्पिक जानकारी", en: "Optional details" },
  "form.section.design": { hi: "स्लिप का प्रकार (सभी 8 डिज़ाइन)", en: "Slip type (all 8 designs)" },
  "form.section.lists": { hi: "सूची विकल्प", en: "List options" },

  "form.optional.note": {
    hi: "ये जानकारी वैकल्पिक है — बाद में WhatsApp पर भी दी जा सकती है।",
    en: "These details are optional — you can also share them later on WhatsApp.",
  },
  "form.area.summary": { hi: "चयनित क्षेत्र", en: "Selected area" },
  "form.voters.total": { hi: "कुल मतदाता", en: "Total voters" },
  "form.body_name": { hi: "निकाय / ग्राम पंचायत का नाम (पर्ची पर)", en: "Body / Gram Panchayat name (on slip)" },
  "form.body_name.ph": { hi: "पर्ची पर छपने वाला नाम", en: "Name printed on the slip" },
  "form.ward.auto": { hi: "वार्ड नं. (क्षेत्र से)", en: "Ward no. (from area)" },
  "form.evm": { hi: "EVM पर क्रम संख्या", en: "Serial number on EVM" },
  "form.evm.ph": { hi: "जैसे: 3", en: "e.g. 3" },
  "form.polldate": { hi: "मतदान दिनांक / दिन", en: "Polling date / day" },
  "form.lists.hint": {
    hi: "जो सूचियाँ चाहिए उन्हें चुनें।",
    en: "Choose the lists you need.",
  },
  "list.slip": { hi: "वोटर स्लिप (चुने हुए टेम्पलेट में)", en: "Voter slip (in the chosen template)" },
  "list.slip.short": { hi: "वोटर स्लिप", en: "Voter slip" },
  "list.hindi_alpha": { hi: "हिंदी वर्णमाला क्रम सूची", en: "Hindi alphabetical list" },
  "list.hindi_alpha.short": { hi: "हिंदी वर्णमाला", en: "Hindi alpha" },
  "list.english_alpha": { hi: "English Alphabetical सूची", en: "English alphabetical list" },
  "list.english_alpha.short": { hi: "English Alpha", en: "English alpha" },
  "list.family": { hi: "परिवार वार (Family wise) सूची", en: "Family wise list" },
  "list.family.short": { hi: "परिवार वार", en: "Family wise" },

  "photo_slip.title": { hi: "फोटो वाली वोटर स्लिप", en: "Photo Voter Slip" },
  "photo_slip.desc": { hi: "सभी मतदाताओं की फोटो सहित स्लिप", en: "Slip with photo of all voters" },
  "photo_slip.badge": { hi: "डेटा उपलब्ध", en: "Data available" },
  "photo_slip.consent.title": { hi: "वोटर लिस्ट PDF आवश्यक है", en: "Voter list PDF is required" },
  "photo_slip.consent.desc": { hi: "फोटो वाली स्लिप के लिए आपको निर्वाचन विभाग द्वारा जारी मतदाता सूची (PDF) अपलोड करनी होगी।", en: "For photo slips, you must upload the official voter list PDF issued by the election department." },
  "photo_slip.pdf": { hi: "वोटर लिस्ट PDF अपलोड करें", en: "Upload Voter List PDF" },
  "photo_slip.agree": { hi: "मैं सहमत हूँ", en: "I agree" },

  "design.D1.title": { hi: "क्लासिक", en: "Classic" },
  "design.D1.desc": { hi: "फोटो बाएँ, चुनाव चिन्ह दाएँ", en: "Photo left, symbol right" },
  "design.D2.title": { hi: "सेंटर फोटो", en: "Centre photo" },
  "design.D2.desc": { hi: "बीच में फोटो, नीचे नाम", en: "Photo centred, name below" },
  "design.D3.title": { hi: "नाम पट्टी", en: "Name band" },
  "design.D3.desc": { hi: "ऊपर बोल्ड नाम पट्टी", en: "Bold name band on top" },
  "design.D4.title": { hi: "दो रंग", en: "Two tone" },
  "design.D4.desc": { hi: "दो रंग की बैनर पट्टी", en: "Two-colour banner strip" },
  "design.D5.title": { hi: "बड़ा चिन्ह", en: "Large symbol" },
  "design.D5.desc": { hi: "चुनाव चिन्ह प्रमुखता से", en: "Election symbol highlighted" },
  "design.D6.title": { hi: "कॉम्पैक्ट", en: "Compact" },
  "design.D6.desc": { hi: "अधिक मतदाता विवरण", en: "More voter details" },
  "design.D7.title": { hi: "नारा हाइलाइट", en: "Slogan highlight" },
  "design.D7.desc": { hi: "नीचे नारे की पट्टी", en: "Slogan strip at the bottom" },
  "design.D8.title": { hi: "मिनिमल", en: "Minimal" },
  "design.D8.desc": { hi: "सादा एवं स्पष्ट लेआउट", en: "Plain, clear layout" },

  "form.name_hi": { hi: "प्रत्याशी का नाम (हिंदी)", en: "Candidate name (Hindi)" },
  "form.name_hi.ph": { hi: "जैसे: रामलाल मीणा", en: "e.g. रामलाल मीणा" },
  "form.name_en": { hi: "Candidate Name (English)", en: "Candidate name (English)" },
  "form.name_en.ph": { hi: "e.g. Ramlal Meena", en: "e.g. Ramlal Meena" },
  "form.phone": { hi: "मोबाइल नंबर", en: "Mobile number" },
  "form.phone.hint": { hi: "10 अंक", en: "10 digits" },
  "form.symbol": { hi: "पार्टी एवं चुनाव चिन्ह", en: "Party & election symbol" },
  "form.symbol.hint": { hi: "सूची से चुनें", en: "Select from list" },
  "form.symbol.placeholder": { hi: "चुनाव चिन्ह चुनें", en: "Choose an election symbol" },
  "form.symbol.search": { hi: "पार्टी या चिन्ह खोजें…", en: "Search party or symbol…" },
  "form.symbol.empty": { hi: "कोई चिन्ह नहीं मिला", en: "No symbol found" },
  "form.symbol.loading": { hi: "चिन्ह सूची लोड हो रही है…", en: "Loading symbols…" },
  "form.district": { hi: "जिला", en: "District" },
  "form.district.ph": { hi: "जैसे: जयपुर", en: "e.g. Jaipur" },
  "form.samiti": { hi: "पंचायत समिति", en: "Panchayat Samiti" },
  "form.samiti.ph": { hi: "जैसे: सांगानेर", en: "e.g. Sanganer" },
  "form.gp": { hi: "ग्राम पंचायत", en: "Gram Panchayat" },
  "form.gp.ph": { hi: "जैसे: बगरू", en: "e.g. Bagru" },
  "form.ward": { hi: "वार्ड नंबर", en: "Ward number" },
  "form.ward.ph": { hi: "जैसे: 07", en: "e.g. 07" },
  "form.ward.multi": { hi: "वार्ड चुनें (एक या अधिक)", en: "Select wards (one or more)" },
  "form.ward.search": { hi: "वार्ड खोजें…", en: "Search wards…" },
  "form.ward.empty": { hi: "कोई वार्ड नहीं मिला", en: "No ward found" },
  "form.ward.selectall": { hi: "सभी चुनें", en: "Select all" },
  "form.ward.clear": { hi: "साफ़ करें", en: "Clear" },
  "form.ward.selected": { hi: "चयनित वार्ड", en: "Selected wards" },
  "form.data.empty": {
    hi: "क्षेत्र की जानकारी अभी अपलोड नहीं हुई है। कृपया WhatsApp पर संपर्क करें।",
    en: "Area data has not been loaded yet. Please contact us on WhatsApp.",
  },
  "form.slogan": { hi: "नारा (वैकल्पिक)", en: "Slogan (optional)" },
  "form.slogan.hint": { hi: "उदाहरण: आपका विश्वास, हमारी पहचान", en: "Example: your trust, our identity" },
  "form.photo": { hi: "प्रत्याशी की फोटो", en: "Candidate photo" },
  "form.photo.hint": { hi: "JPG / PNG, अधिकतम 5MB", en: "JPG / PNG, max 5MB" },
  "form.photo.pick": { hi: "फोटो चुनें / अपलोड करें", en: "Choose / upload photo" },
  "form.photo.change": { hi: "फोटो बदलें", en: "Change photo" },
  "form.photo.remove": { hi: "फोटो हटाएं", en: "Remove photo" },
  "form.submit": { hi: "आवेदन भेजें एवं WhatsApp पर जुड़ें", en: "Submit and connect on WhatsApp" },
  "form.submitting": { hi: "प्रोसेस हो रहा है…", en: "Processing…" },
  "form.footnote": {
    hi: "सबमिट करते ही आपका ऑर्डर आईडी बनेगा और भुगतान विवरण दिखेगा।",
    en: "On submit your order ID is created and the payment details appear.",
  },

  "err.required.name_hi": { hi: "प्रत्याशी का नाम (हिंदी) आवश्यक है।", en: "Candidate name (Hindi) is required." },
  "err.required.name_en": { hi: "अंग्रेज़ी में नाम आवश्यक है।", en: "Name in English is required." },
  "err.phone": { hi: "10 अंकों का सही मोबाइल नंबर दर्ज करें।", en: "Enter a valid 10-digit mobile number." },
  "err.required.district": { hi: "जिला आवश्यक है।", en: "District is required." },
  "err.required.samiti": { hi: "पंचायत समिति आवश्यक है।", en: "Panchayat Samiti is required." },
  "err.required.gp": { hi: "ग्राम पंचायत आवश्यक है।", en: "Gram Panchayat is required." },
  "err.required.ward": { hi: "वार्ड नंबर आवश्यक है।", en: "Ward number is required." },
  "err.required.symbol": { hi: "चुनाव चिन्ह चुनना आवश्यक है।", en: "Please select an election symbol." },
  "err.required.photo": { hi: "प्रत्याशी की फोटो (JPG/PNG) आवश्यक है।", en: "Candidate photo (JPG/PNG) is required." },
  "err.photo.type": { hi: "केवल JPG या PNG फोटो अपलोड करें।", en: "Upload a JPG or PNG photo only." },
  "err.photo.size": { hi: "फोटो का आकार 5MB से कम होना चाहिए।", en: "Photo must be smaller than 5MB." },
  "err.form": { hi: "कृपया सभी आवश्यक जानकारी सही भरें।", en: "Please complete all required fields correctly." },
  "err.submit": { hi: "ऑर्डर सबमिट नहीं हो सका। कृपया दोबारा प्रयास करें।", en: "Could not submit the order. Please try again." },

  "block.title": { hi: "ऑर्डर सबमिट नहीं किया जा सकता", en: "Order cannot be submitted" },
  "block.desc": { hi: "आपके नेटवर्क या नंबर से कई अधूरे ऑर्डर प्राप्त हुए हैं। कृपया ऑर्डर पूरा करने के लिए WhatsApp पर हमसे संपर्क करें।", en: "We have received multiple incomplete orders from your network or number. Please contact us on WhatsApp to complete your order." },
  "block.btn": { hi: "WhatsApp पर संपर्क करें", en: "Contact on WhatsApp" },

  "success.title": { hi: "आवेदन सफलतापूर्वक दर्ज हुआ!", en: "Your request has been recorded!" },
  "success.orderid": { hi: "आपका ऑर्डर आईडी", en: "Your order ID" },
  "success.toast": { hi: "ऑर्डर दर्ज हुआ", en: "Order recorded" },

  "form.design": { hi: "पर्ची डिज़ाइन", en: "Slip design" },
  "form.design.hint": { hi: "8 डिज़ाइन में से चुनें", en: "Choose from 8 designs" },
  "form.voters": { hi: "वार्ड में मतदाता", en: "Voters in ward" },
  "form.amount": { hi: "अनुमानित राशि", en: "Estimated amount" },
  "form.rate": { hi: "प्रति मतदाता दर", en: "Rate per voter" },
  "form.amount.pending": {
    hi: "मतदाता संख्या उपलब्ध होने पर राशि WhatsApp पर बताई जाएगी।",
    en: "We will confirm the amount on WhatsApp once the voter count is available.",
  },
  "err.required.design": { hi: "डिज़ाइन चुनना आवश्यक है।", en: "Please choose a design." },

  "sample.heading": { hi: "24 मतदाताओं का निःशुल्क सैंपल", en: "Free 24-voter sample" },
  "sample.body": {
    hi: "ऑर्डर से पहले अपनी पर्ची का नमूना देखें — पूरी तरह निःशुल्क।",
    en: "See a sample of your slip before ordering — completely free.",
  },
  "sample.cta": { hi: "निःशुल्क सैंपल मंगाएँ", en: "Request free sample" },
  "sample.name": { hi: "आपका नाम", en: "Your name" },
  "sample.submit": { hi: "सैंपल रिक्वेस्ट भेजें", en: "Send sample request" },
  "sample.success": { hi: "सैंपल रिक्वेस्ट दर्ज हुई", en: "Sample request recorded" },
  "sample.error": { hi: "रिक्वेस्ट दर्ज नहीं हो सकी।", en: "Could not record the request." },

  "form.rate.formula": { hi: "मतदाता ×", en: "voters ×" },
  "form.rate.banner_note": { hi: "विज्ञापन सहित", en: "with ad banner" },
  "form.rate.photo_note": { hi: "फोटो सहित", en: "with photo" },

  "pay.heading": { hi: "अगला कदम", en: "Next step" },
  "pay.amount": { hi: "राशि", en: "Amount" },
  "pay.status": { hi: "भुगतान स्थिति", en: "Payment status" },
  "pay.pending": { hi: "भुगतान शेष", en: "Payment pending" },
  "pay.soon": {
    hi: "सुरक्षित ऑनलाइन भुगतान शीघ्र उपलब्ध होगा। तब तक हमारी टीम WhatsApp पर भुगतान लिंक भेजेगी।",
    en: "Secure online payment is coming soon. Until then our team shares a payment link on WhatsApp.",
  },
  "pay.whatsapp": { hi: "WhatsApp पर विवरण भेजें", en: "Send details on WhatsApp" },
  "pay.call": { hi: "कॉल करें", en: "Call us" },

  "footer.tagline": {
    hi: "राजस्थान पंचायत चुनाव हेतु विश्वसनीय प्रिंटिंग एवं डिज़ाइन सेवा",
    en: "Reliable printing and design service for Rajasthan panchayat elections",
  },
  "footer.contact": { hi: "संपर्क", en: "Contact" },
  "footer.legal": { hi: "नीतियाँ", en: "Policies" },
  "footer.whatsapp": { hi: "WhatsApp पर संपर्क करें", en: "Contact on WhatsApp" },
  "footer.rights": { hi: "सर्वाधिकार सुरक्षित.", en: "All rights reserved." },
  "legal.terms": { hi: "नियम एवं शर्तें", en: "Terms & Conditions" },
  "legal.privacy": { hi: "गोपनीयता नीति", en: "Privacy Policy" },
  "legal.refund": { hi: "रिफंड नीति", en: "Refund Policy" },
  "legal.shipping": { hi: "शिपिंग एवं डिलीवरी", en: "Shipping & Delivery" },
  "legal.contact": { hi: "संपर्क करें", en: "Contact Us" },
} satisfies Record<string, Entry>;

export type TKey = keyof typeof DICTIONARY;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: TKey) => string };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Read the stored preference after hydration so SSR markup stays stable.
  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* storage may be unavailable in private mode */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key: TKey) => DICTIONARY[key][lang],
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
