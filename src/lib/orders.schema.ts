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

/** Extra slip lists a candidate can ask for alongside the voter slips. */
export const LIST_OPTIONS = ["slip", "hindi_alpha", "english_alpha", "family"] as const;
export type ListOption = (typeof LIST_OPTIONS)[number];

export const orderSchema = z.object({
  // Section 2 is optional: only the area, design and mobile number are required.
  candidate_name_hindi: z.string().trim().max(120).default(""),
  candidate_name_english: z.string().trim().max(120).default(""),
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
  slogan: z.string().trim().max(200).optional().nullable(),
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
  /** True when the selected design includes an ad banner (D5–D8); derived at submit time. */
  banner_option: z.boolean().default(false),
  /** True when the candidate selected a photo voter slip. */
  photo_slip: z.boolean().default(false),
  /** Storage path for the uploaded voter-roll PDF (photo-slip orders only). */
  voter_photo_pdf_path: z.string().trim().max(512).nullable().optional(),
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

/**
 * Order IDs stay in the requested `SBG-####` shape (always exactly four
 * digits). The first attempt is time-derived so IDs trend upward; retries draw
 * a cryptographically random suffix so a collision resolves immediately
 * instead of colliding again on the same millisecond.
 */
export function makeOrderId(attempt = 0, prefix = "SBG") {
  if (attempt === 0) {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
  const random = crypto.getRandomValues(new Uint32Array(1))[0]! % 10_000;
  return `${prefix}-${random.toString().padStart(4, "0")}`;
}

/** Processing pipeline for an order, in workflow order. */
export const ORDER_STATUSES = [
  "New",
  "Paid",
  "In Production",
  "Ready",
  "Delivered",
  "Closed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SAMPLE_STATUSES = ["New", "Sent", "Converted", "Closed"] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const LEAD_STATUSES = {
  visit: "New",
  abandoned: "Partial",
  submitted: "Submitted",
} as const;
