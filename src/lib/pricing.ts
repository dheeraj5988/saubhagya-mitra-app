/**
 * Dynamic pricing model: an order costs voter_count × rate_per_voter.
 * The rate is configurable from the admin console; this is only the fallback
 * used before an operator has saved a value.
 */
export const DEFAULT_RATE_PER_VOTER = 0.15;

/** Voters included in the free sample slip sheet. */
export const DEFAULT_SAMPLE_VOTER_COUNT = 24;

/** Printed banner size agreed with the press, in millimetres. */
export const BANNER_SIZE_MM = { width: 94.6, height: 34.2 } as const;

/** Extra per-voter charge when the slip carries an advertisement banner. */
export const BANNER_SURCHARGE_PER_VOTER = 0.01;

/**
 * Flat per-voter rate for the photo voter slip; overrides the base + banner rate.
 * TODO(pricing): make admin-configurable — if the admin changes the base rate to
 * e.g. 0.18, should this stay a hard 0.20 or become base + 0.05? Currently it is
 * a fixed constant independent of the base rate.
 */
export const PHOTO_SLIP_RATE_PER_VOTER = 0.2;

export const DESIGN_CODES = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
export type DesignCode = (typeof DESIGN_CODES)[number];

export function isDesignCode(value: string): value is DesignCode {
  return (DESIGN_CODES as readonly string[]).includes(value);
}

/** Reference card metadata, shared by server and client. */
export type DesignMeta = {
  label: string;
  desc: string;
  spec: string;
  rows: number;
  cols: number;
  ad?: "top" | "left" | "right";
  symbol?: "left" | "right";
};

export const DESIGN_META: Record<DesignCode, DesignMeta> = {
  D1: {
    label: "P-16",
    desc: "16 स्लिप, बिना विज्ञापन (चौड़ा पेपर)",
    spec: "16 स्लिप/पेज · 4×4 · चौड़ा पेपर · सादा",
    rows: 4,
    cols: 4,
  },
  D2: {
    label: "P-12",
    desc: "12 स्लिप, बिना विज्ञापन",
    spec: "12 स्लिप/पेज · 2×6 · सादा",
    rows: 6,
    cols: 2,
  },
  D3: {
    label: "SR-10",
    desc: "10 स्लिप, चुनाव चिन्ह दाईं ओर",
    spec: "10 स्लिप/पेज · 2×5 · चुनाव चिन्ह",
    rows: 5,
    cols: 2,
    symbol: "right",
  },
  D4: {
    label: "SL-10",
    desc: "10 स्लिप, चुनाव चिन्ह बाईं ओर",
    spec: "10 स्लिप/पेज · 2×5 · चुनाव चिन्ह",
    rows: 5,
    cols: 2,
    symbol: "left",
  },
  D5: {
    label: "AT-9",
    desc: "9 स्लिप, विज्ञापन ऊपर",
    spec: "9 स्लिप/पेज · 3×3 · विज्ञापन",
    rows: 3,
    cols: 3,
    ad: "top",
  },
  D6: {
    label: "AT-8",
    desc: "8 स्लिप, विज्ञापन ऊपर",
    spec: "8 स्लिप/पेज · 2×4 · विज्ञापन",
    rows: 4,
    cols: 2,
    ad: "top",
  },
  D7: {
    label: "AL-8",
    desc: "8 स्लिप, विज्ञापन बाईं ओर",
    spec: "8 स्लिप/पेज · 1×8 · विज्ञापन",
    rows: 8,
    cols: 1,
    ad: "left",
  },
  D8: {
    label: "AR-8",
    desc: "8 स्लिप, विज्ञापन दाईं ओर",
    spec: "8 स्लिप/पेज · 1×8 · विज्ञापन",
    rows: 8,
    cols: 1,
    ad: "right",
  },
};

/** True when the design includes an advertisement band (D5–D8). */
export function designHasBanner(code: DesignCode): boolean {
  return DESIGN_META[code]?.ad != null;
}

export type RateOptions = { banner?: boolean; photoSlip?: boolean };

/** Resolves the effective per-voter rate from the admin base rate + selected add-ons. */
export function resolveRatePerVoter(baseRate: number, options: RateOptions = {}): number {
  if (options.photoSlip) return PHOTO_SLIP_RATE_PER_VOTER;
  const rate = baseRate + (options.banner ? BANNER_SURCHARGE_PER_VOTER : 0);
  return Math.round(rate * 100) / 100;
}

/** Rupee amount, rounded to paise. */
export function computeAmount(voterCount: number, rate: number) {
  return Math.round(voterCount * rate * 100) / 100;
}

export function formatInr(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
