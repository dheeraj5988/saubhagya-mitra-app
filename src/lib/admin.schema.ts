import { z } from "zod";

import { ORDER_STATUSES } from "./orders.schema";

export const loginSchema = z.object({ password: z.string().min(1).max(200) });
export const tokenSchema = z.object({ token: z.string().min(10).max(200) });
export const statusSchema = z.object({
  token: z.string().min(10).max(200),
  order_id: z.string().min(1).max(40),
  status: z.enum(ORDER_STATUSES),
});
export const deleteSchema = z.object({
  token: z.string().min(10).max(200),
  order_id: z.string().min(1).max(40),
});
export const photoSchema = z.object({
  token: z.string().min(10).max(200),
  path: z.string().min(1).max(300),
});

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
  order_id: string | null;
  visited_at: string;
  updated_at: string;
};
