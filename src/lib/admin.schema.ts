import { z } from "zod";

import { PAYMENT_STATUSES } from "./catalog.schema";
import { ORDER_STATUSES } from "./orders.schema";

const token = z.string().regex(/^[0-9a-f]{64}$/, "Invalid session token");

export const loginSchema = z.object({ password: z.string().min(1).max(200) });
export const tokenSchema = z.object({ token });

export const statusSchema = z.object({
  token,
  order_id: z.string().min(1).max(40),
  status: z.enum(ORDER_STATUSES),
});

export const deleteSchema = z.object({
  token,
  order_id: z.string().min(1).max(40),
});

export const photoSchema = z.object({
  token,
  // Constrained to the exact shape the public upload policy allows.
  path: z.string().regex(/^orders\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png)$/, "Invalid photo path"),
});

export const ordersQuerySchema = z.object({
  token,
  search: z.string().max(120).default(""),
  ward: z.string().max(40).default("all"),
  status: z.enum([...ORDER_STATUSES, "all"]).default("all"),
  payment_status: z.enum([...PAYMENT_STATUSES, "all"]).default("all"),
  pc_synced: z.enum(["all", "unsynced", "synced"]).default("all"),
  page: z.number().int().min(1).max(10_000).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const leadsQuerySchema = z.object({
  token,
  search: z.string().max(120).default(""),
  date: z.string().max(20).default(""),
  /**
   * Minutes returned by `Date.prototype.getTimezoneOffset()` on the operator's
   * machine. The day filter is resolved against their local midnight rather
   * than silently assuming UTC, which otherwise shifts IST evening leads onto
   * the following day.
   */
  tz_offset: z.number().int().min(-840).max(840).default(0),
  page: z.number().int().min(1).max(10_000).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const ordersExportSchema = ordersQuerySchema.omit({ page: true, page_size: true });
export const leadsExportSchema = leadsQuerySchema.omit({ page: true, page_size: true });

export type AdminOrder = {
  id: string;
  order_id: string;
  candidate_name_hindi: string;
  candidate_name_english: string;
  contact_number: string;
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  ward_id: string | null;
  design_code: string | null;
  voter_count: number | null;
  rate_per_voter: number | null;
  amount: number | null;
  is_sample: boolean | null;
  election_symbol: string;
  slogan: string | null;
  photo_path: string | null;
  photo_url: string | null;
  ip_address: string | null;
  status: string;
  created_at: string;
  election_symbol_id: string | null;
  party_name_snapshot: string | null;
  symbol_name_snapshot: string | null;
  payment_status: string;
  payment_method: string | null;
  payment_txn_id: string | null;
  payment_amount: number | null;
  payment_updated_at: string | null;
  user_agent: string | null;
  referral_code: string | null;
  referral_partner_id?: string | null;
  referral_partner_name: string | null;
  pad: string | null;
  booth_snapshots: { booth_number: string; booth_name: string | null }[] | null;
  photo_slip: boolean;
  voter_photo_pdf_path: string | null;
  source: string | null;
  synced_to_pc_at: string | null;
  pc_order_no: string | null;
  hold_reason: string | null;
};

export type AdminLead = {
  id: string;
  ip_address: string | null;
  phone: string | null;
  lead_type: string;
  status: string;
  order_id: string | null;
  visited_at: string;
  updated_at: string;
};

export type AdminSampleRequest = {
  id: string;
  request_id: string;
  candidate_name: string;
  contact_number: string;
  district: string | null;
  panchayat_samiti: string | null;
  gram_panchayat: string | null;
  ward_number: string | null;
  voter_count: number | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export type AdminKpis = {
  total: number;
  paid: number;
  pending: number;
  revenue: number;
  samples: number;
  leads: number;
  referral_orders: number;
  commission_payable: number;
};
