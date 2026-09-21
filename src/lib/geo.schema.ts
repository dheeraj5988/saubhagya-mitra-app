import { z } from "zod";

export const districtIdSchema = z.object({ district_id: z.string().uuid() });
export const samitiIdSchema = z.object({ samiti_id: z.string().uuid() });
export const gramPanchayatIdSchema = z.object({ gram_panchayat_id: z.string().uuid() });
export const wardIdsSchema = z.object({ ward_ids: z.array(z.string().uuid()).min(1).max(200) });

export type GeoOption = { id: string; name: string; name_hindi: string | null };
export type GeoWardOption = { id: string; ward_number: string; voter_count: number };

/** A booth (भाग / मतदान केन्द्र) inside a ward. */
export type GeoBoothOption = {
  id: string;
  ward_id: string;
  booth_number: string;
  booth_name: string | null;
  voter_count: number;
};

export type PublicPricing = {
  /** Per-series rates (P / S / A / Ph) in rupees per slip. */
  series_rates: { P: number; S: number; A: number; Ph: number };
  rate_per_voter: number;
  free_sample_voter_count: number;
  min_order_amount: number | null;
};
