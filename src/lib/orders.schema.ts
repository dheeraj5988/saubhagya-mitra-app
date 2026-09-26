import { z } from "zod";

import { DESIGN_CODES } from "./pricing";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Invalid mobile number");

export const visitSchema = z.object({
  ip_address: z.string().trim().max(64).optional().nullable(),
  referral_code: z.string().trim().max(32).nullable().optional(),
});

export const leadSchema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  ip_address: z.string().trim().max(64).nullable().optional(),
  phone: phoneSchema,
});

/**
 * Hindi-only text (Devanagari block + spaces). Full stop is allowed for
 * "श्री." and ZWNJ/ZWJ because some phone keyboards insert them invisibly.
 */
export const HINDI_RE = /^[\u0900-\u097F\u200C\u200D\s.]+$/;
export const isHindiText = (value: string) => HINDI_RE.test(value.trim());

const hindiOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === "" || HINDI_RE.test(v), "Only Hindi (Devanagari) text is allowed")
    .default("");

/** Post (पद) — panchayat elections only. */
export const PAD_OPTIONS = ["panch", "sarpanch", "ps_sadasya", "zp_sadasya"] as const;
export type Pad = (typeof PAD_OPTIONS)[number];
export const PAD_LABELS: Record<Pad, { hi: string; en: string }> = {
  panch: { hi: "पंच", en: "Panch" },
  sarpanch: { hi: "सरपंच", en: "Sarpanch" },
  ps_sadasya: { hi: "पंचायत समिति सदस्य", en: "Panchayat Samiti member" },
  zp_sadasya: { hi: "ज़िला परिषद सदस्य", en: "Zila Parishad member" },
};

/** Extra slip lists a candidate can ask for alongside the voter slips. */
export const LIST_OPTIONS = ["slip", "hindi_alpha", "english_alpha", "family"] as const;
export type ListOption = (typeof LIST_OPTIONS)[number];

export const orderSchema = z.object({
  // Section 2 is optional: only the area, design and mobile number are required.
  // Candidate name is taken in Hindi only (same as the Windows app).
  candidate_name_hindi: hindiOptional(120),
  /** Legacy column (NOT NULL in the database); always sent empty now. */
  candidate_name_english: z.string().trim().max(120).default(""),
  pad: z.enum(PAD_OPTIONS),
  /** Booths (भाग) chosen inside the selected wards. Empty = whole wards. */
  booth_ids: z.array(z.string().uuid()).max(500).default([]),
  contact_number: phoneSchema,
  district: z.string().trim().min(1).max(120),
  panchayat_samiti: z.string().trim().min(1).max(120),
  gram_panchayat: z.string().trim().min(1).max(120),
  ward_number: z.string().trim().min(1).max(200),
  /** Set when the ward came from the geography master data. */
  ward_id: z.string().uuid().nullable().optional(),
  /** Every ward the candidate selected; the price is summed over these. */
  ward_ids: z.array(z.string().uuid()).min(1).max(200),
  design_code: z.enum(DESIGN_CODES),
  election_symbol: z.string().trim().max(240).default(""),
  election_symbol_id: z.string().uuid().nullable().optional(),
  party_name_snapshot: z.string().trim().max(120).nullable().optional(),
  symbol_name_snapshot: z.string().trim().max(120).nullable().optional(),
  slogan: hindiOptional(200).nullable().optional(),
  body_name: z.string().trim().max(160).nullable().optional(),
  evm_serial: z.string().trim().max(20).nullable().optional(),
  poll_date: z.string().trim().max(40).nullable().optional(),
  list_options: z.array(z.enum(LIST_OPTIONS)).max(4).default([]),
  // Must match the shape the storage upload policy permits.
  photo_path: z
    .string()
    .regex(/^orders\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png)$/, "Invalid photo path")
    .nullable()
    .optional(),
  ip_address: z.string().trim().max(64).optional().nullable(),
  user_agent: z.string().trim().max(400).optional().nullable(),
  lead_id: z.string().uuid().nullable().optional(),
  /** Referral code captured from a /r/:code link; verified server-side. */
  referral_code: z.string().trim().max(32).nullable().optional(),
  referral_captured_at: z.string().trim().max(40).nullable().optional(),
  /** Honeypot anti-bot field; must be empty. */
  website: z.string().max(0).optional(),
  /** Form mount timestamp in ms for 6-second anti-bot check. */
  form_started_at: z.number().int().optional(),
  /** True when the selected design includes an ad banner (D5–D8); derived at submit time. */
  banner_option: z.boolean().default(false),
  /** True when the candidate selected a photo voter slip. */
  photo_slip: z.boolean().default(false),
  /** Storage path for the uploaded voter-roll PDF (photo-slip orders only). */
  voter_photo_pdf_path: z
    .string()
    .trim()
    .regex(/^uploads\/[0-9a-fA-F-]{36}\.pdf$/, "Invalid voter PDF path")
    .nullable()
    .optional(),
  /** ISO timestamp when the candidate consented to the photo-slip terms. */
  photo_consent_at: z.string().trim().max(40).nullable().optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;

export const sampleRequestSchema = z.object({
  candidate_name: z.string().trim().min(1).max(120),
  contact_number: phoneSchema,
  district: z.string().trim().max(120).nullable().optional(),
  panchayat_samiti: z.string().trim().max(120).nullable().optional(),
  gram_panchayat: z.string().trim().max(120).nullable().optional(),
  ward_number: z.string().trim().max(20).nullable().optional(),
  ward_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
  ip_address: z.string().trim().max(64).nullable().optional(),
});

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export function makeOrderId(_attempt = 0, prefix = "SBG") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${s}`; // e.g. SBG-K7QM2X
}

/** Processing pipeline for an order, in workflow order. */
export const ORDER_STATUSES = [
  "New",
  "Paid",
  "In Production",
  "Ready",
  "Delivered",
  "Closed",
  "On Hold",
  "Cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SAMPLE_STATUSES = ["New", "Sent", "Converted", "Closed"] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const LEAD_STATUSES = {
  visit: "New",
  abandoned: "Partial",
  submitted: "Submitted",
} as const;
