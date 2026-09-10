import { createServerFn } from "@tanstack/react-start";

import {
  districtIdSchema,
  gramPanchayatIdSchema,
  samitiIdSchema,
  type GeoOption,
  type GeoWardOption,
  type PublicPricing,
} from "./geo.schema";

/**
 * Public geography lookups. Only active rows and display fields are exposed;
 * the order form walks District → Panchayat Samiti → Gram Panchayat → Ward.
 */
export const listDistricts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("geo_districts")
    .select("id, name, name_hindi")
    .eq("active", true)
    .order("name")
    .limit(500);
  if (error) throw new Error(error.message);
  return { options: (data ?? []) as GeoOption[] };
});

export const listSamitis = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => districtIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("geo_panchayat_samitis")
      .select("id, name, name_hindi")
      .eq("district_id", data.district_id)
      .eq("active", true)
      .order("name")
      .limit(1000);
    if (error) throw new Error(error.message);
    return { options: (rows ?? []) as GeoOption[] };
  });

export const listGramPanchayats = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => samitiIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("geo_gram_panchayats")
      .select("id, name, name_hindi")
      .eq("samiti_id", data.samiti_id)
      .eq("active", true)
      .order("name")
      .limit(2000);
    if (error) throw new Error(error.message);
    return { options: (rows ?? []) as GeoOption[] };
  });

export const listWards = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => gramPanchayatIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("geo_wards")
      .select("id, ward_number, voter_count")
      .eq("gram_panchayat_id", data.gram_panchayat_id)
      .eq("active", true)
      .order("ward_number")
      .limit(500);
    if (error) throw new Error(error.message);
    return { options: (rows ?? []) as GeoWardOption[] };
  });

/**
 * Only the pricing inputs a visitor is allowed to see. Gateway credentials and
 * merchant identifiers never travel through this function.
 */
export const getPublicPricing = createServerFn({ method: "GET" }).handler(async () => {
  const { loadPaymentConfig } = await import("./payment-config.server");
  const cfg = await loadPaymentConfig();
  const pricing: PublicPricing = {
    rate_per_voter: cfg.rate_per_voter,
    free_sample_voter_count: cfg.free_sample_voter_count,
    min_order_amount: cfg.min_order_amount,
  };
  return pricing;
});
