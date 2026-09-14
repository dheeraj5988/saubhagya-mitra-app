import { z } from "zod";

const token = z.string().regex(/^[0-9a-f]{64}$/, "Invalid session token");

export const COMMISSION_TYPES = ["PERCENT", "FLAT_PER_ORDER", "PER_VOTER"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const CONVERSION_STATUSES = ["PENDING", "APPROVED", "PAID", "REJECTED"] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  PERCENT: "% of order",
  FLAT_PER_ORDER: "Flat per order",
  PER_VOTER: "Per voter",
};

const partnerCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,24}$/, "Code must be 3-24 letters, digits, - or _");

export const partnersQuerySchema = z.object({
  token,
  search: z.string().max(120).default(""),
});

export const partnerCreateSchema = z.object({
  token,
  partner_code: partnerCode,
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20).default(""),
  whatsapp: z.string().trim().max(20).default(""),
  district: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(500).default(""),
  commission_type: z.enum(COMMISSION_TYPES).default("PERCENT"),
  commission_value: z.number().min(0).max(1_000_000).default(10),
});

export const partnerUpdateSchema = partnerCreateSchema.extend({
  id: z.string().uuid(),
  partner_code: partnerCode.optional(),
});

export const partnerToggleSchema = z.object({
  token,
  id: z.string().uuid(),
  active: z.boolean(),
});

export const conversionsQuerySchema = z.object({
  token,
  partner_id: z.string().uuid().nullable().optional(),
  status: z.enum([...CONVERSION_STATUSES, "all"]).default("all"),
  search: z.string().max(120).default(""),
  page: z.number().int().min(1).max(10_000).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const conversionsExportSchema = conversionsQuerySchema.omit({
  page: true,
  page_size: true,
});

export const conversionStatusSchema = z.object({
  token,
  id: z.string().uuid(),
  status: z.enum(CONVERSION_STATUSES),
  payout_note: z.string().trim().max(300).nullable().optional(),
});

export const assignOrderPartnerSchema = z.object({
  token,
  order_id: z.string().trim().min(1).max(40),
  partner_id: z.string().uuid().nullable(),
});

export type AdminPartner = {
  id: string;
  partner_code: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  district: string | null;
  notes: string | null;
  commission_type: CommissionType;
  commission_value: number;
  active: boolean;
};

export type AdminPartnerStats = AdminPartner & {
  click_count: number;
  order_count: number;
  paid_order_count: number;
  total_order_amount: number;
  commission_pending: number;
  commission_approved: number;
  commission_paid: number;
  commission_payable: number;
  last_activity_at: string | null;
};

export type AdminConversion = {
  id: string;
  partner_id: string;
  partner_code: string;
  partner_name: string | null;
  order_uuid: string;
  order_id: string;
  order_amount: number | null;
  voter_count: number | null;
  commission_type: string;
  commission_value: number;
  commission_amount: number;
  status: ConversionStatus;
  source: string;
  payout_note: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  candidate_name: string | null;
  contact_number: string | null;
  payment_status: string | null;
};
