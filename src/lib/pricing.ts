/**
 * Pricing and design catalogue.
 *
 * Designs and banner sizes follow the customer SOP ("इस्तेमाल की पूरी विधि",
 * section 3). Rates follow the payment-gateway audit (section 5.3):
 *
 *   P  — सादी पर्ची             15 पैसे / पर्ची
 *   S  — चुनाव-चिन्ह पट्टी       16 पैसे / पर्ची
 *   A  — विज्ञापन / बैनर          16 पैसे / पर्ची
 *   Ph — मतदाता की फ़ोटो सहित     20 पैसे / पर्ची
 *
 * Amount = voters × rate. The server always recomputes it; the browser's
 * numbers are never trusted.
 */

export type Series = "P" | "S" | "A" | "Ph";

export const SERIES_RATES: Record<Series, number> = {
  P: 0.15,
  S: 0.16,
  A: 0.16,
  Ph: 0.2,
};

export const SERIES_LABEL: Record<Series, { hi: string; en: string }> = {
  P: { hi: "P — सादी पर्ची", en: "P — plain slip" },
  S: { hi: "S — चुनाव-चिन्ह पट्टी", en: "S — symbol strip" },
  A: { hi: "A — विज्ञापन / बैनर", en: "A — advertisement / banner" },
  Ph: { hi: "Ph — मतदाता की फ़ोटो सहित", en: "Ph — with voter photo" },
};

/** Kept for payment-config fallbacks; equals the P-series rate. */
export const DEFAULT_RATE_PER_VOTER = SERIES_RATES.P;

/** Voters per ward in the free sample (sample is given on request only). */
export const DEFAULT_SAMPLE_VOTER_COUNT = 15;

export const DESIGN_CODES = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
export type DesignCode = (typeof DESIGN_CODES)[number];

export function isDesignCode(value: string): value is DesignCode {
  return (DESIGN_CODES as readonly string[]).includes(value);
}

export type BannerSize = { w_mm: number; h_mm: number };

/** Reference card metadata, shared by server and client. */
export type DesignMeta = {
  label: string;
  series: Series;
  slipsPerPage: number;
  desc: string;
  descEn: string;
  rows: number;
  cols: number;
  ad?: "top" | "left" | "right";
  symbol?: "left" | "right";
  /** Banner / picture size from the SOP. Absent = design prints no picture. */
  banner?: BannerSize;
};

const AD_8: BannerSize = { w_mm: 94.6, h_mm: 34.2 };

export const DESIGN_META: Record<DesignCode, DesignMeta> = {
  D1: {
    label: "P-16",
    series: "P",
    slipsPerPage: 16,
    desc: "16 स्लिप — सिर्फ़ मतदाता की जानकारी (सबसे किफ़ायती)",
    descEn: "16 slips — voter details only (most economical)",
    rows: 4,
    cols: 4,
  },
  D2: {
    label: "P-12",
    series: "P",
    slipsPerPage: 12,
    desc: "12 स्लिप — सिर्फ़ मतदाता की जानकारी (सबसे ज़्यादा चलने वाला)",
    descEn: "12 slips — voter details only (most popular)",
    rows: 6,
    cols: 2,
  },
  D3: {
    label: "SR-10",
    series: "S",
    slipsPerPage: 10,
    desc: "10 स्लिप — चुनाव चिन्ह दाईं ओर",
    descEn: "10 slips — symbol on the right",
    rows: 5,
    cols: 2,
    symbol: "right",
    banner: { w_mm: 33.5, h_mm: 44.1 },
  },
  D4: {
    label: "SL-10",
    series: "S",
    slipsPerPage: 10,
    desc: "10 स्लिप — चुनाव चिन्ह बाईं ओर",
    descEn: "10 slips — symbol on the left",
    rows: 5,
    cols: 2,
    symbol: "left",
    banner: { w_mm: 33.5, h_mm: 44.1 },
  },
  D5: {
    label: "AT-9",
    series: "A",
    slipsPerPage: 9,
    desc: "9 स्लिप — ऊपर बड़ा विज्ञापन",
    descEn: "9 slips — large ad on top",
    rows: 3,
    cols: 3,
    ad: "top",
    banner: { w_mm: 63.9, h_mm: 51.2 },
  },
  D6: {
    label: "AT-8",
    series: "A",
    slipsPerPage: 8,
    desc: "8 स्लिप — विज्ञापन ऊपर",
    descEn: "8 slips — ad on top",
    rows: 4,
    cols: 2,
    ad: "top",
    banner: AD_8,
  },
  D7: {
    label: "AL-8",
    series: "A",
    slipsPerPage: 8,
    desc: "8 स्लिप — विज्ञापन बाईं ओर",
    descEn: "8 slips — ad on the left",
    rows: 4,
    cols: 2,
    ad: "left",
    banner: AD_8,
  },
  D8: {
    label: "AR-8",
    series: "A",
    slipsPerPage: 8,
    desc: "8 स्लिप — विज्ञापन दाईं ओर",
    descEn: "8 slips — ad on the right",
    rows: 4,
    cols: 2,
    ad: "right",
    banner: AD_8,
  },
};

/** True when the design prints the candidate's name and symbol. */
export function designPrintsCandidate(code: DesignCode): boolean {
  return DESIGN_META[code]?.series !== "P";
}

/** True when the design carries an advertisement band (AT / AL / AR). */
export function designHasBanner(code: DesignCode): boolean {
  return DESIGN_META[code]?.ad != null;
}

/** Banner / picture size for the design, or null when it takes none. */
export function bannerSizeFor(code: DesignCode): BannerSize | null {
  return DESIGN_META[code]?.banner ?? null;
}

export const mmToInch = (mm: number) => Math.round((mm / 25.4) * 100) / 100;

export function formatBannerSize(size: BannerSize) {
  return {
    mm: `${size.w_mm} × ${size.h_mm} mm`,
    inch: `${mmToInch(size.w_mm)} × ${mmToInch(size.h_mm)}`,
  };
}

/** Series actually charged: the photo option overrides the design's series. */
export function seriesFor(code: DesignCode, photoSlip: boolean): Series {
  return photoSlip ? "Ph" : DESIGN_META[code].series;
}

export function rateFor(code: DesignCode, photoSlip: boolean): number {
  return SERIES_RATES[seriesFor(code, photoSlip)];
}

/** Rupee amount, rounded to paise. */
export function computeAmount(voterCount: number, rate: number) {
  return Math.round(voterCount * rate * 100) / 100;
}

export function formatPaise(rate: number) {
  return `${Math.round(rate * 100)}`;
}

export function formatInr(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
