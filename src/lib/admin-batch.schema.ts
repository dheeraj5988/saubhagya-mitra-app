import { z } from "zod";

import { PAYMENT_STATUSES } from "./catalog.schema";
import { ORDER_STATUSES } from "./orders.schema";

const token = z.string().regex(/^[0-9a-f]{64}$/, "Invalid session token");

/** Hard ceiling for a single Claude batch or asset ZIP. */
export const BATCH_MAX = 200;

export const batchSchema = z.object({
  token,
  /** Explicitly ticked order ids take precedence over the filter set. */
  order_ids: z.array(z.string().trim().min(1).max(40)).max(BATCH_MAX).default([]),
  search: z.string().max(120).default(""),
  ward: z.string().max(40).default("all"),
  status: z.enum([...ORDER_STATUSES, "all"]).default("all"),
  payment_status: z.enum([...PAYMENT_STATUSES, "all"]).default("all"),
  limit: z.number().int().min(1).max(BATCH_MAX).default(BATCH_MAX),
});

export type BatchInput = z.infer<typeof batchSchema>;

export type BatchOrder = {
  order_id: string;
  timestamp: string;
  candidate: {
    name_hindi: string;
    name_english: string;
    contact_number: string;
    election_symbol: string;
    party_name: string | null;
    symbol_name: string | null;
    slogan: string | null;
    photo_url: string | null;
  };
  location: {
    district: string;
    panchayat_samiti: string;
    gram_panchayat: string;
    ward_number: string;
  };
  payment: {
    amount: number | null;
    method: string | null;
    status: string;
    transaction_id: string | null;
    screenshot_url: string | null;
  };
  metadata: {
    ip_address: string | null;
    user_agent: string | null;
    status: string;
  };
};

export type BatchExport = {
  batch_id: string;
  export_timestamp: string;
  total_orders: number;
  /** Total rows matching the filters, so the UI can flag a truncated batch. */
  matched: number;
  limit: number;
  capped: boolean;
  orders: BatchOrder[];
};
