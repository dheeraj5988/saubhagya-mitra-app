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

  "hero.badge": { hi: "राजस्थान पंचायत चुनाव 2026", en: "Rajasthan Panchayat Elections 2026" },
  "hero.title": { hi: "सौभाग्य — मतदाता पर्ची सेवा", en: "Saubhagya — Voter Slip Service" },
  "hero.body": {
    hi: "सरपंच एवं वार्ड पंच प्रत्याशियों के लिए फोटो, चुनाव चिन्ह और नारे सहित प्रोफेशनल मतदाता पर्ची — बूथवार व्यवस्था के साथ, ड्राफ्ट अप्रूवल के बाद शीघ्र डिलीवरी।",
    en: "Professional voter slips for Sarpanch and Ward Panch candidates — with photo, election symbol and slogan, arranged booth-wise and delivered promptly after draft approval.",
  },
  "hero.cta": { hi: "अभी ऑर्डर करें", en: "Order now" },
  "hero.trust1": { hi: "प्रत्याशियों का भरोसा", en: "Trusted by candidates" },
  "hero.trust2": { hi: "पूरे राजस्थान में डिलीवरी", en: "Delivery across Rajasthan" },

  "features.heading": { hi: "हमारी सेवा क्यों चुनें?", en: "Why choose our service?" },
  "features.1.title": { hi: "प्रोफेशनल डिज़ाइन", en: "Professional design" },
  "features.1.body": {
    hi: "प्रत्याशी की फोटो, चुनाव चिन्ह और नारे के साथ स्पष्ट व आकर्षक मतदाता पर्ची।",
    en: "Clear, attractive voter slips featuring the candidate photo, election symbol and slogan.",
  },
  "features.2.title": { hi: "शीघ्र तैयार", en: "Quickly prepared" },
  "features.2.body": {
    hi: "ऑर्डर मिलते ही डिज़ाइन शुरू — अप्रूवल के बाद तुरंत प्रिंट एवं डिलीवरी।",
    en: "Design starts as soon as the order arrives — printing and delivery follow approval.",
  },
  "features.3.title": { hi: "बूथवार व्यवस्था", en: "Booth-wise arrangement" },
  "features.3.body": {
    hi: "वार्ड और बूथ के अनुसार क्रमबद्ध पर्चियाँ, कार्यकर्ताओं के लिए आसान वितरण।",
    en: "Slips sorted by ward and booth so workers can distribute them easily.",
  },
  "features.4.title": { hi: "डेटा सुरक्षित", en: "Data kept safe" },
  "features.4.body": {
    hi: "आपकी मतदाता सूची व जानकारी पूर्णतः गोपनीय एवं सुरक्षित रखी जाती है।",
    en: "Your voter list and details stay fully confidential and secure.",
  },

  "steps.heading": { hi: "कैसे काम करता है?", en: "How it works" },
  "steps.1.title": { hi: "फॉर्म भरें", en: "Fill the form" },
  "steps.1.body": {
    hi: "प्रत्याशी, क्षेत्र और चुनाव चिन्ह की जानकारी दर्ज करें।",
    en: "Enter candidate, area and election symbol details.",
  },
  "steps.2.title": { hi: "डिज़ाइन अप्रूवल", en: "Design approval" },
  "steps.2.body": {
    hi: "WhatsApp पर पर्ची का ड्राफ्ट देखें और मंज़ूरी दें।",
    en: "Review the slip draft on WhatsApp and approve it.",
  },
  "steps.3.title": { hi: "प्रिंट एवं डिलीवरी", en: "Print and delivery" },
  "steps.3.body": {
    hi: "भुगतान के बाद पर्चियाँ प्रिंट होकर आपके पते पर पहुँचती हैं।",
    en: "After payment the slips are printed and delivered to your address.",
  },

  "trust.heading": { hi: "क्यों चुनें सौभाग्य मतदाता पर्ची सेवा?", en: "Why choose Saubhagya Matdata Parchi?" },
  "trust.1": {
    hi: "उम्मीदवार के नाम व फोटो सहित प्रोफेशनल डिज़ाइन",
    en: "Professional design with the candidate's name and photo",
  },
  "trust.2": { hi: "चुनाव चिन्ह के साथ कस्टम ब्रांडिंग", en: "Custom branding with the election symbol" },
  "trust.3": { hi: "WhatsApp आधारित त्वरित सपोर्ट", en: "Fast WhatsApp-based support" },
  "trust.4": {
    hi: "राजस्थान पंचायत चुनावों के लिए विशेष सेवा",
    en: "A service built for Rajasthan panchayat elections",
  },
  "trust.5": { hi: "ड्राफ्ट अप्रूवल के बाद अंतिम डिलीवरी", en: "Final delivery after draft approval" },

  "order.heading": { hi: "ऑर्डर फॉर्म भरें", en: "Fill the order form" },
  "order.subheading": {
    hi: "सभी जानकारी सही भरें — सबमिट करते ही ऑर्डर आईडी मिलेगी और WhatsApp चैट खुलेगी।",
    en: "Fill in every detail correctly — you get an order ID on submit and a WhatsApp chat opens.",
  },

  "form.section.candidate": { hi: "प्रत्याशी की जानकारी", en: "Candidate details" },
  "form.section.area": { hi: "क्षेत्र की जानकारी", en: "Area details" },
  "form.section.slogan": { hi: "नारा एवं फोटो", en: "Slogan and photo" },

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

  "success.title": { hi: "आवेदन सफलतापूर्वक दर्ज हुआ!", en: "Your request has been recorded!" },
  "success.orderid": { hi: "आपका ऑर्डर आईडी", en: "Your order ID" },
  "success.toast": { hi: "ऑर्डर दर्ज हुआ", en: "Order recorded" },

  "pay.heading": { hi: "भुगतान करें", en: "Make the payment" },
  "pay.qr.hint": { hi: "किसी भी UPI ऐप से QR स्कैन करें", en: "Scan the QR with any UPI app" },
  "pay.amount": { hi: "राशि", en: "Amount" },
  "pay.upi": { hi: "UPI आईडी", en: "UPI ID" },
  "pay.account": { hi: "खाता / नाम", en: "Account / name" },
  "pay.instructions": { hi: "निर्देश", en: "Instructions" },
  "pay.upload": { hi: "भुगतान स्क्रीनशॉट अपलोड करें", en: "Upload payment screenshot" },
  "pay.uploading": { hi: "अपलोड हो रहा है…", en: "Uploading…" },
  "pay.uploaded": { hi: "स्क्रीनशॉट प्राप्त हुआ — सत्यापन प्रतीक्षारत", en: "Screenshot received — awaiting verification" },
  "pay.upload.error": { hi: "स्क्रीनशॉट अपलोड नहीं हो सका।", en: "Could not upload the screenshot." },
  "pay.upload.type": { hi: "केवल JPG, PNG या WebP फाइल अपलोड करें (अधिकतम 5MB)।", en: "Upload a JPG, PNG or WebP file (max 5MB)." },
  "pay.whatsapp": { hi: "WhatsApp पर विवरण भेजें", en: "Send details on WhatsApp" },
  "pay.call": { hi: "कॉल करें", en: "Call us" },
  "pay.none": {
    hi: "भुगतान विवरण WhatsApp पर भेजा जाएगा।",
    en: "Payment details will be shared on WhatsApp.",
  },
  "pay.paypur": { hi: "PayPur UPI से सुरक्षित भुगतान करें", en: "Pay securely with PayPur UPI" },
  "pay.paypur.error": { hi: "ऑनलाइन भुगतान अभी उपलब्ध नहीं है — कृपया QR से भुगतान करें।", en: "Online payment is unavailable right now — please pay via QR." },

  "footer.tagline": {
    hi: "राजस्थान पंचायत चुनाव हेतु विश्वसनीय प्रिंटिंग एवं डिज़ाइन सेवा",
    en: "Reliable printing and design service for Rajasthan panchayat elections",
  },
  "footer.whatsapp": { hi: "WhatsApp पर संपर्क करें", en: "Contact on WhatsApp" },
  "footer.rights": { hi: "सर्वाधिकार सुरक्षित.", en: "All rights reserved." },
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
