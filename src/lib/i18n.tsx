import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  "form.body_name": {
    hi: "निकाय / ग्राम पंचायत का नाम (पर्ची पर)",
    en: "Body / Gram Panchayat name (on slip)",
  },
  "form.body_name.ph": { hi: "पर्ची पर छपने वाला नाम", en: "Name printed on the slip" },
  "form.ward.auto": { hi: "वार्ड नं. (क्षेत्र से)", en: "Ward no. (from area)" },
  "form.evm": { hi: "EVM पर क्रम संख्या", en: "Serial number on EVM" },
  "form.evm.ph": { hi: "जैसे: 3", en: "e.g. 3" },
  "form.polldate": { hi: "मतदान दिनांक / दिन", en: "Polling date / day" },
  "form.lists.hint": {
    hi: "जो सूचियाँ चाहिए उन्हें चुनें।",
    en: "Choose the lists you need.",
  },
  "list.slip": {
    hi: "वोटर स्लिप (चुने हुए टेम्पलेट में)",
    en: "Voter slip (in the chosen template)",
  },
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
  "photo_slip.consent.desc": {
    hi: "फोटो वाली स्लिप के लिए आपको निर्वाचन विभाग द्वारा जारी मतदाता सूची (PDF) अपलोड करनी होगी।",
    en: "For photo slips, you must upload the official voter list PDF issued by the election department.",
  },
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
  "form.slogan.hint": {
    hi: "उदाहरण: आपका विश्वास, हमारी पहचान",
    en: "Example: your trust, our identity",
  },
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

  "err.required.name_hi": {
    hi: "प्रत्याशी का नाम (हिंदी) आवश्यक है।",
    en: "Candidate name (Hindi) is required.",
  },
  "err.required.name_en": {
    hi: "अंग्रेज़ी में नाम आवश्यक है।",
    en: "Name in English is required.",
  },
  "err.phone": {
    hi: "10 अंकों का सही मोबाइल नंबर दर्ज करें।",
    en: "Enter a valid 10-digit mobile number.",
  },
  "err.required.district": { hi: "जिला आवश्यक है।", en: "District is required." },
  "err.required.samiti": { hi: "पंचायत समिति आवश्यक है।", en: "Panchayat Samiti is required." },
  "err.required.gp": { hi: "ग्राम पंचायत आवश्यक है।", en: "Gram Panchayat is required." },
  "err.required.ward": { hi: "वार्ड नंबर आवश्यक है।", en: "Ward number is required." },
  "err.required.symbol": {
    hi: "चुनाव चिन्ह चुनना आवश्यक है।",
    en: "Please select an election symbol.",
  },
  "err.required.photo": {
    hi: "प्रत्याशी की फोटो (JPG/PNG) आवश्यक है।",
    en: "Candidate photo (JPG/PNG) is required.",
  },
  "err.photo.type": {
    hi: "केवल JPG या PNG फोटो अपलोड करें।",
    en: "Upload a JPG or PNG photo only.",
  },
  "err.photo.size": {
    hi: "फोटो का आकार 5MB से कम होना चाहिए।",
    en: "Photo must be smaller than 5MB.",
  },
  "err.form": {
    hi: "कृपया सभी आवश्यक जानकारी सही भरें।",
    en: "Please complete all required fields correctly.",
  },
  "err.submit": {
    hi: "ऑर्डर सबमिट नहीं हो सका। कृपया दोबारा प्रयास करें।",
    en: "Could not submit the order. Please try again.",
  },

  "block.title": { hi: "ऑर्डर सबमिट नहीं किया जा सकता", en: "Order cannot be submitted" },
  "block.desc": {
    hi: "आपके नेटवर्क या नंबर से कई अधूरे ऑर्डर प्राप्त हुए हैं। कृपया ऑर्डर पूरा करने के लिए WhatsApp पर हमसे संपर्क करें।",
    en: "We have received multiple incomplete orders from your network or number. Please contact us on WhatsApp to complete your order.",
  },
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

  "root.404.title": { hi: "पेज नहीं मिला", en: "Page not found" },
  "root.404.desc": {
    hi: "आप जो पेज खोज रहे हैं वह मौजूद नहीं है या हटा दिया गया है।",
    en: "The page you're looking for doesn't exist or has been moved.",
  },
  "root.404.home": { hi: "होम पर जाएं", en: "Go home" },

  "root.err.title": { hi: "यह पेज लोड नहीं हो सका", en: "This page didn't load" },
  "root.err.desc": {
    hi: "हमारी तरफ से कुछ खराबी आ गई है। आप पेज को रिफ्रेश करने की कोशिश कर सकते हैं या होम पर जा सकते हैं।",
    en: "Something went wrong on our end. You can try refreshing or head back home.",
  },
  "root.err.retry": { hi: "पुनः प्रयास करें", en: "Try again" },
  "root.err.home": { hi: "होम पर जाएं", en: "Go home" },
  "legal.page.home": { hi: "होम", en: "Home" },
  "legal.page.last_updated": { hi: "अंतिम अपडेट:", en: "Last updated:" },
  "legal.page.reach_us": { hi: "संपर्क करें", en: "Reach us" },
  "legal.terms.page_title": { hi: "Terms & Conditions", en: "Terms & Conditions" },
  "legal.terms.sec1.title": { hi: "1. About the service", en: "1. About the service" },
  "legal.terms.sec1.p1": { hi: "Saubhagya Matdata Parchi (\"we\", \"us\") prepares and supplies printed voter slips (matdata parchi) for Sarpanch and Ward Panch candidates contesting panchayat elections in Rajasthan. By placing an order on this website you accept these terms.", en: "Saubhagya Matdata Parchi (\"we\", \"us\") prepares and supplies printed voter slips (matdata parchi) for Sarpanch and Ward Panch candidates contesting panchayat elections in Rajasthan. By placing an order on this website you accept these terms." },
  "legal.terms.sec2.title": { hi: "2. Orders and information you provide", en: "2. Orders and information you provide" },
  "legal.terms.sec2.p1": { hi: "You are responsible for the accuracy of every detail you submit: candidate names, ward, gram panchayat, panchayat samiti, district, election symbol, slogan, photograph and mobile number. We print exactly what is approved in the draft you confirm on WhatsApp.", en: "You are responsible for the accuracy of every detail you submit: candidate names, ward, gram panchayat, panchayat samiti, district, election symbol, slogan, photograph and mobile number. We print exactly what is approved in the draft you confirm on WhatsApp." },
  "legal.terms.sec2.p2": { hi: "You confirm that you have the right to use every photograph, name, symbol and slogan you upload, and that the content does not violate any law or the directions of the State Election Commission.", en: "You confirm that you have the right to use every photograph, name, symbol and slogan you upload, and that the content does not violate any law or the directions of the State Election Commission." },
  "legal.terms.sec3.title": { hi: "3. Pricing", en: "3. Pricing" },
  "legal.terms.sec3.p1": { hi: "The order amount is calculated as the voter count of the selected ward multiplied by the current per-voter rate shown on the order form. The amount displayed before payment is the amount payable. Taxes, where applicable, are included in the displayed amount.", en: "The order amount is calculated as the voter count of the selected ward multiplied by the current per-voter rate shown on the order form. The amount displayed before payment is the amount payable. Taxes, where applicable, are included in the displayed amount." },
  "legal.terms.sec3.p2": { hi: "A free sample of up to 24 voter slips is available on request so you can verify quality and layout before paying.", en: "A free sample of up to 24 voter slips is available on request so you can verify quality and layout before paying." },
  "legal.terms.sec4.title": { hi: "4. Draft approval and production", en: "4. Draft approval and production" },
  "legal.terms.sec4.p1": { hi: "After an order is placed we share a draft on WhatsApp. Production begins only after you approve the draft. Once printing has begun, changes to names, symbol, photograph or layout may not be possible.", en: "After an order is placed we share a draft on WhatsApp. Production begins only after you approve the draft. Once printing has begun, changes to names, symbol, photograph or layout may not be possible." },
  "legal.terms.sec5.title": { hi: "5. Payments", en: "5. Payments" },
  "legal.terms.sec5.p1": { hi: "Online payments are processed by our payment gateway partner. We do not store your card, UPI or banking credentials on our servers.", en: "Online payments are processed by our payment gateway partner. We do not store your card, UPI or banking credentials on our servers." },
  "legal.terms.sec6.title": { hi: "6. Acceptable use", en: "6. Acceptable use" },
  "legal.terms.sec6.p1": { hi: "You may not use this service for content that is obscene, defamatory, communal, or that breaches the model code of conduct or any election law. We may refuse or cancel any order that, in our judgement, breaches these rules.", en: "You may not use this service for content that is obscene, defamatory, communal, or that breaches the model code of conduct or any election law. We may refuse or cancel any order that, in our judgement, breaches these rules." },
  "legal.terms.sec7.title": { hi: "7. Liability", en: "7. Liability" },
  "legal.terms.sec7.p1": { hi: "Our liability for any order is limited to the amount you paid for that order. We are not liable for election outcomes, printing errors present in an approved draft, or delays caused by events beyond our control.", en: "Our liability for any order is limited to the amount you paid for that order. We are not liable for election outcomes, printing errors present in an approved draft, or delays caused by events beyond our control." },
  "legal.terms.sec8.title": { hi: "8. Governing law", en: "8. Governing law" },
  "legal.terms.sec8.p1": { hi: "These terms are governed by the laws of India, and the courts of Rajasthan have exclusive jurisdiction over any dispute.", en: "These terms are governed by the laws of India, and the courts of Rajasthan have exclusive jurisdiction over any dispute." },
  "legal.terms.sec9.title": { hi: "9. Contact", en: "9. Contact" },
  "legal.terms.sec9.p1": { hi: "Questions about these terms:", en: "Questions about these terms:" },
  "legal.privacy.page_title": { hi: "Privacy Policy", en: "Privacy Policy" },
  "legal.privacy.sec1.title": { hi: "What we collect", en: "What we collect" },
  "legal.privacy.sec1.p1": { hi: "To prepare your voter slips we collect the candidate name (Hindi and English), mobile number, district, panchayat samiti, gram panchayat, ward number, election symbol, an optional slogan and the candidate photograph you upload.", en: "To prepare your voter slips we collect the candidate name (Hindi and English), mobile number, district, panchayat samiti, gram panchayat, ward number, election symbol, an optional slogan and the candidate photograph you upload." },
  "legal.privacy.sec1.p2": { hi: "For security and analytics we also record the IP address and browser details of visits to this site, and the mobile number you enter on the order form even if the order is not completed, so our team can help you finish it.", en: "For security and analytics we also record the IP address and browser details of visits to this site, and the mobile number you enter on the order form even if the order is not completed, so our team can help you finish it." },
  "legal.privacy.sec2.title": { hi: "How we use it", en: "How we use it" },
  "legal.privacy.sec2.p1": { hi: "Your information is used only to design, print and deliver your order, to contact you on WhatsApp or phone about that order, to process payment, and to prevent misuse of the service.", en: "Your information is used only to design, print and deliver your order, to contact you on WhatsApp or phone about that order, to process payment, and to prevent misuse of the service." },
  "legal.privacy.sec2.p2": { hi: "We do not sell your data and we do not use it for unrelated marketing.", en: "We do not sell your data and we do not use it for unrelated marketing." },
  "legal.privacy.sec3.title": { hi: "Storage and security", en: "Storage and security" },
  "legal.privacy.sec3.p1": { hi: "Candidate photographs are stored in private storage and are never publicly accessible. Access is limited to our operations team through an authenticated internal console, using short-lived links. Payment credentials are handled by our payment gateway partner and are never stored on our servers.", en: "Candidate photographs are stored in private storage and are never publicly accessible. Access is limited to our operations team through an authenticated internal console, using short-lived links. Payment credentials are handled by our payment gateway partner and are never stored on our servers." },
  "legal.privacy.sec4.title": { hi: "Sharing", en: "Sharing" },
  "legal.privacy.sec4.p1": { hi: "We share information only with the service providers needed to fulfil your order — hosting, payment processing and printing/delivery partners — and where the law requires it.", en: "We share information only with the service providers needed to fulfil your order — hosting, payment processing and printing/delivery partners — and where the law requires it." },
  "legal.privacy.sec5.title": { hi: "Retention and your choices", en: "Retention and your choices" },
  "legal.privacy.sec5.p1": { hi: "Order records are retained for our accounting and support obligations. You may ask us to delete your photograph and contact details after delivery by writing to", en: "Order records are retained for our accounting and support obligations. You may ask us to delete your photograph and contact details after delivery by writing to" },
  "legal.privacy.sec5.p2": { hi: "or messaging", en: "or messaging" },
  "legal.privacy.sec5.p3": { hi: ". We will act on the request unless we are required to keep the record.", en: ". We will act on the request unless we are required to keep the record." },
  "legal.privacy.sec6.title": { hi: "Children", en: "Children" },
  "legal.privacy.sec6.p1": { hi: "This service is intended for election candidates and is not directed at children.", en: "This service is intended for election candidates and is not directed at children." },
  "legal.privacy.sec7.title": { hi: "Changes", en: "Changes" },
  "legal.privacy.sec7.p1": { hi: "We may update this policy; the revised date at the top of this page shows when it last changed.", en: "We may update this policy; the revised date at the top of this page shows when it last changed." },
  "legal.refund.page_title": { hi: "Refund & Cancellation Policy", en: "Refund & Cancellation Policy" },
  "legal.refund.sec1.title": { hi: "Before draft approval", en: "Before draft approval" },
  "legal.refund.sec1.p1": { hi: "You may cancel an order any time before you approve the printing draft. The full amount paid is refunded to the original payment method.", en: "You may cancel an order any time before you approve the printing draft. The full amount paid is refunded to the original payment method." },
  "legal.refund.sec2.title": { hi: "After draft approval", en: "After draft approval" },
  "legal.refund.sec2.p1": { hi: "Voter slips are printed to order and carry your name, photograph and ward, so they cannot be resold. Once you approve the draft and production begins, the order cannot be cancelled and the amount is non-refundable.", en: "Voter slips are printed to order and carry your name, photograph and ward, so they cannot be resold. Once you approve the draft and production begins, the order cannot be cancelled and the amount is non-refundable." },
  "legal.refund.sec3.title": { hi: "Defective or incorrect work", en: "Defective or incorrect work" },
  "legal.refund.sec3.p1": { hi: "If the delivered slips differ from the approved draft, or arrive damaged, report it within 48 hours of delivery with photographs. We will reprint the affected quantity free of charge, or refund it if a reprint is no longer useful before your election date.", en: "If the delivered slips differ from the approved draft, or arrive damaged, report it within 48 hours of delivery with photographs. We will reprint the affected quantity free of charge, or refund it if a reprint is no longer useful before your election date." },
  "legal.refund.sec3.p2": { hi: "Errors already present in the draft you approved are not covered, because printing follows the approved draft exactly.", en: "Errors already present in the draft you approved are not covered, because printing follows the approved draft exactly." },
  "legal.refund.sec4.title": { hi: "Failed or duplicate payments", en: "Failed or duplicate payments" },
  "legal.refund.sec4.p1": { hi: "If money is debited but the order is not created, or you are charged twice, the amount is refunded in full. Bank settlement usually takes 5-7 working days.", en: "If money is debited but the order is not created, or you are charged twice, the amount is refunded in full. Bank settlement usually takes 5-7 working days." },
  "legal.refund.sec5.title": { hi: "How to request a refund", en: "How to request a refund" },
  "legal.refund.sec5.p1": { hi: "Message", en: "Message" },
  "legal.refund.sec5.p2": { hi: "on WhatsApp or email", en: "on WhatsApp or email" },
  "legal.refund.sec5.p3": { hi: "with your Order ID and the reason. Approved refunds are initiated within 3 working days and credited to the original payment method.", en: "with your Order ID and the reason. Approved refunds are initiated within 3 working days and credited to the original payment method." },
  "legal.refund.sec6.title": { hi: "Free sample", en: "Free sample" },
  "legal.refund.sec6.p1": { hi: "The free 24-voter sample carries no charge, so no refund arises for it.", en: "The free 24-voter sample carries no charge, so no refund arises for it." },
  "legal.shipping.page_title": { hi: "Shipping & Delivery Policy", en: "Shipping & Delivery Policy" },
  "legal.shipping.sec1.title": { hi: "Order processing", en: "Order processing" },
  "legal.shipping.sec1.p1": { hi: "Every order begins with a design draft shared on WhatsApp for your approval. Printing starts after the draft is approved and payment is confirmed.", en: "Every order begins with a design draft shared on WhatsApp for your approval. Printing starts after the draft is approved and payment is confirmed." },
  "legal.shipping.sec2.title": { hi: "Digital delivery", en: "Digital delivery" },
  "legal.shipping.sec2.p1": { hi: "Print-ready files are shared on the WhatsApp number submitted with the order. Digital files are normally shared within 1-2 working days of draft approval.", en: "Print-ready files are shared on the WhatsApp number submitted with the order. Digital files are normally shared within 1-2 working days of draft approval." },
  "legal.shipping.sec3.title": { hi: "Printed delivery", en: "Printed delivery" },
  "legal.shipping.sec3.p1": { hi: "Printed voter slips are dispatched to the address confirmed with our team over WhatsApp. Delivery within Rajasthan typically takes 2-5 working days after printing, depending on the quantity and your location.", en: "Printed voter slips are dispatched to the address confirmed with our team over WhatsApp. Delivery within Rajasthan typically takes 2-5 working days after printing, depending on the quantity and your location." },
  "legal.shipping.sec3.p2": { hi: "During peak election periods timelines can extend. If your polling date is close, tell us before ordering so we can confirm whether we can meet it.", en: "During peak election periods timelines can extend. If your polling date is close, tell us before ordering so we can confirm whether we can meet it." },
  "legal.shipping.sec4.title": { hi: "Delivery charges", en: "Delivery charges" },
  "legal.shipping.sec4.p1": { hi: "Standard delivery within Rajasthan is included in the order amount. Any express or out-of-state courier requirement is quoted separately and confirmed with you before dispatch.", en: "Standard delivery within Rajasthan is included in the order amount. Any express or out-of-state courier requirement is quoted separately and confirmed with you before dispatch." },
  "legal.shipping.sec5.title": { hi: "Tracking and support", en: "Tracking and support" },
  "legal.shipping.sec5.p1": { hi: "Dispatch details and tracking, where available, are shared on WhatsApp. For any delivery question, message", en: "Dispatch details and tracking, where available, are shared on WhatsApp. For any delivery question, message" },
  "legal.shipping.sec5.p2": { hi: "with your Order ID.", en: "with your Order ID." },
  "legal.contact.page_title": { hi: "Contact Us", en: "Contact Us" },
  "legal.contact.sec1.title": { hi: "Talk to our team", en: "Talk to our team" },
  "legal.contact.sec1.whatsapp": { hi: "WhatsApp and calls:", en: "WhatsApp and calls:" },
  "legal.contact.sec1.email": { hi: "Email:", en: "Email:" },
  "legal.contact.sec2.title": { hi: "Business address", en: "Business address" },
  "legal.contact.sec3.title": { hi: "Service area", en: "Service area" },
  "legal.contact.sec3.p1": { hi: "We serve Sarpanch and Ward Panch candidates across Rajasthan — district, panchayat samiti, gram panchayat and ward wise.", en: "We serve Sarpanch and Ward Panch candidates across Rajasthan — district, panchayat samiti, gram panchayat and ward wise." },
  "legal.contact.sec4.title": { hi: "Order support", en: "Order support" },
  "legal.contact.sec4.p1": { hi: "Keep your Order ID (for example SBG-1234) handy when you write to us; it lets us pull up your draft, payment and delivery status immediately.", en: "Keep your Order ID (for example SBG-1234) handy when you write to us; it lets us pull up your draft, payment and delivery status immediately." },
  "legal.dom.1": { hi: "We do not sell your data and we do not use it for unrelated marketing.", en: "We do not sell your data and we do not use it for unrelated marketing." },
  "legal.dom.2": { hi: "This service is intended for election candidates and is not directed at children.", en: "This service is intended for election candidates and is not directed at children." },
  "legal.dom.3": { hi: "Saubhagya Matdata Parchi (\"we\", \"us\") prepares and supplies printed voter slips (matdata parchi) for Sarpanch and Ward Panch candidates contesting panchayat elections in Rajasthan. By placing an order on this website you accept these terms.", en: "Saubhagya Matdata Parchi (\"we\", \"us\") prepares and supplies printed voter slips (matdata parchi) for Sarpanch and Ward Panch candidates contesting panchayat elections in Rajasthan. By placing an order on this website you accept these terms." },
  "legal.dom.4": { hi: "You are responsible for the accuracy of every detail you submit: candidate names, ward, gram panchayat, panchayat samiti, district, election symbol, slogan, photograph and mobile number. We print exactly what is approved in the draft you confirm on WhatsApp.", en: "You are responsible for the accuracy of every detail you submit: candidate names, ward, gram panchayat, panchayat samiti, district, election symbol, slogan, photograph and mobile number. We print exactly what is approved in the draft you confirm on WhatsApp." },
  "legal.dom.5": { hi: "You confirm that you have the right to use every photograph, name, symbol and slogan you upload, and that the content does not violate any law or the directions of the State Election Commission.", en: "You confirm that you have the right to use every photograph, name, symbol and slogan you upload, and that the content does not violate any law or the directions of the State Election Commission." },
  "legal.dom.6": { hi: "The order amount is calculated as the voter count of the selected ward multiplied by the current per-voter rate shown on the order form. The amount displayed before payment is the amount payable. Taxes, where applicable, are included in the displayed amount.", en: "The order amount is calculated as the voter count of the selected ward multiplied by the current per-voter rate shown on the order form. The amount displayed before payment is the amount payable. Taxes, where applicable, are included in the displayed amount." },
  "legal.dom.7": { hi: "A free sample of up to 24 voter slips is available on request so you can verify quality and layout before paying.", en: "A free sample of up to 24 voter slips is available on request so you can verify quality and layout before paying." },
  "legal.dom.8": { hi: "After an order is placed we share a draft on WhatsApp. Production begins only after you approve the draft. Once printing has begun, changes to names, symbol, photograph or layout may not be possible.", en: "After an order is placed we share a draft on WhatsApp. Production begins only after you approve the draft. Once printing has begun, changes to names, symbol, photograph or layout may not be possible." },
  "legal.dom.9": { hi: "Online payments are processed by our payment gateway partner. We do not store your card, UPI or banking credentials on our servers.", en: "Online payments are processed by our payment gateway partner. We do not store your card, UPI or banking credentials on our servers." },
  "legal.dom.10": { hi: "You may not use this service for content that is obscene, defamatory, communal, or that breaches the model code of conduct or any election law. We may refuse or cancel any order that, in our judgement, breaches these rules.", en: "You may not use this service for content that is obscene, defamatory, communal, or that breaches the model code of conduct or any election law. We may refuse or cancel any order that, in our judgement, breaches these rules." },
  "legal.dom.11": { hi: "Our liability for any order is limited to the amount you paid for that order. We are not liable for election outcomes, printing errors present in an approved draft, or delays caused by events beyond our control.", en: "Our liability for any order is limited to the amount you paid for that order. We are not liable for election outcomes, printing errors present in an approved draft, or delays caused by events beyond our control." },
  "legal.dom.12": { hi: "These terms are governed by the laws of India, and the courts of Rajasthan have exclusive jurisdiction over any dispute.", en: "These terms are governed by the laws of India, and the courts of Rajasthan have exclusive jurisdiction over any dispute." },

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
