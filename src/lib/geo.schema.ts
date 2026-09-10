import { z } from "zod";

export const districtIdSchema = z.object({ district_id: z.string().uuid() });
export const samitiIdSchema = z.object({ samiti_id: z.string().uuid() });
export const gramPanchayatIdSchema = z.object({ gram_panchayat_id: z.string().uuid() });

export type GeoOption = { id: string; name: string; name_hindi: string | null };
export type GeoWardOption = { id: string; ward_number: string; voter_count: number };

export type PublicPricing = {
  rate_per_voter: number;
  free_sample_voter_count: number;
  min_order_amount: number | null;
};
