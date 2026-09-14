import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { REFERRAL_CODE_RE } from "./referral";

/**
 * Public referral lookups. These are reachable by anonymous visitors, so they
 * only ever return whether the code is usable plus the partner's display name.
 * Commission terms stay server-side and never cross this boundary.
 */

const codeSchema = z.string().trim().regex(REFERRAL_CODE_RE, "Invalid referral code");

const clickSchema = z.object({
  code: codeSchema,
  ip_address: z.string().trim().max(64).nullable().optional(),
  user_agent: z.string().trim().max(400).nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
});

const resolveSchema = z.object({ code: codeSchema });

type PublicPartner = { valid: boolean; full_name?: string };

export const trackReferralClick = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => clickSchema.parse(data))
  .handler(async ({ data }): Promise<PublicPartner> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: partner } = await supabaseAdmin
      .from("referral_partners")
      .select("id, partner_code, full_name")
      .ilike("partner_code", data.code)
      .eq("active", true)
      .maybeSingle();

    if (!partner) return { valid: false };

    await supabaseAdmin.from("referral_clicks").insert({
      partner_id: partner.id,
      partner_code: partner.partner_code,
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
      lead_id: data.lead_id ?? null,
    });

    return { valid: true, full_name: partner.full_name };
  });

export const resolveReferralPartner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => resolveSchema.parse(data))
  .handler(async ({ data }): Promise<PublicPartner> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: partner } = await supabaseAdmin
      .from("referral_partners")
      .select("full_name")
      .ilike("partner_code", data.code)
      .eq("active", true)
      .maybeSingle();

    if (!partner) return { valid: false };
    return { valid: true, full_name: partner.full_name };
  });
