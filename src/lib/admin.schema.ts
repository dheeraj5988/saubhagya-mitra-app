import { z } from "zod";

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
  page: z.number().int().min(1).max(10_000).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const leadsQuerySchema = z.object({
  token,
  search: z.string().max(120).default(""),
  date: z.string().max(20).default(""),
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
  election_symbol: string;
  slogan: string | null;
  photo_path: string | null;
  photo_url: string | null;
  ip_address: string | null;
  status: string;
  created_at: string;
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

export type AdminKpis = {
  total: number;
  pending: number;
  process: number;
  completed: number;
  leads: number;
};
