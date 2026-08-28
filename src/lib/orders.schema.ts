import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Invalid mobile number");

export const visitSchema = z.object({
  ip_address: z.string().trim().max(64).optional().nullable(),
});

export const leadSchema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  ip_address: z.string().trim().max(64).nullable().optional(),
  phone: phoneSchema,
});

export const orderSchema = z.object({
  candidate_name_hindi: z.string().trim().min(1).max(120),
  candidate_name_english: z.string().trim().min(1).max(120),
  contact_number: phoneSchema,
  district: z.string().trim().min(1).max(120),
  panchayat_samiti: z.string().trim().min(1).max(120),
  gram_panchayat: z.string().trim().min(1).max(120),
  ward_number: z.string().trim().min(1).max(20),
  election_symbol: z.string().trim().min(1).max(240),
  election_symbol_id: z.string().uuid().nullable().optional(),
  party_name_snapshot: z.string().trim().max(120).nullable().optional(),
  symbol_name_snapshot: z.string().trim().max(120).nullable().optional(),
  slogan: z.string().trim().max(200).optional().nullable(),
  // Must match the shape the storage upload policy permits.
  photo_path: z.string().regex(/^orders\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png)$/, "Invalid photo path"),
  ip_address: z.string().trim().max(64).optional().nullable(),
  user_agent: z.string().trim().max(400).optional().nullable(),
  lead_id: z.string().uuid().nullable().optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;

/**
 * Order IDs stay in the requested `SBG-####` shape (always exactly four
 * digits). The first attempt is time-derived so IDs trend upward; retries draw
 * a cryptographically random suffix so a collision resolves immediately
 * instead of colliding again on the same millisecond.
 */
export function makeOrderId(attempt = 0) {
  if (attempt === 0) {
    return `SBG-${Date.now().toString().slice(-4)}`;
  }
  const random = crypto.getRandomValues(new Uint32Array(1))[0]! % 10_000;
  return `SBG-${random.toString().padStart(4, "0")}`;
}

export const ORDER_STATUSES = ["Pending", "In-Process", "Completed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const LEAD_STATUSES = {
  visit: "New",
  abandoned: "Partial",
  submitted: "Submitted",
} as const;
