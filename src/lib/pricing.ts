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

export const DESIGN_CODES = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
export type DesignCode = (typeof DESIGN_CODES)[number];

export function isDesignCode(value: string): value is DesignCode {
  return (DESIGN_CODES as readonly string[]).includes(value);
}

/** Rupee amount, rounded to paise. */
export function computeAmount(voterCount: number, rate: number) {
  return Math.round(voterCount * rate * 100) / 100;
}

export function formatInr(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
