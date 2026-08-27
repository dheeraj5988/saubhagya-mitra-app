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
  election_symbol: z.string().trim().min(1).max(120),
  slogan: z.string().trim().max(200).optional().nullable(),
  photo_path: z.string().trim().min(1).max(300),
  ip_address: z.string().trim().max(64).optional().nullable(),
  lead_id: z.string().uuid().nullable().optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;

export function makeOrderId(offset = 0) {
  return `SBG-${(Date.now() + offset).toString().slice(-4)}`;
}

export const ORDER_STATUSES = ["Pending", "In-Process", "Completed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
