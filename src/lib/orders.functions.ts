import { createServerFn } from "@tanstack/react-start";

import { leadSchema, makeOrderId, orderSchema, visitSchema } from "./orders.schema";

export const recordVisit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => visitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("visitor_leads")
      .insert({ ip_address: data.ip_address ?? null, lead_type: "visit" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { lead_id: row.id as string };
  });

export const captureLeadPhone = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.lead_id) {
      const { error } = await supabaseAdmin
        .from("visitor_leads")
        .update({ phone: data.phone, lead_type: "abandoned", updated_at: new Date().toISOString() })
        .eq("id", data.lead_id)
        .neq("lead_type", "submitted");
      if (error) throw new Error(error.message);
      return { lead_id: data.lead_id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("visitor_leads")
      .insert({ ip_address: data.ip_address ?? null, phone: data.phone, lead_type: "abandoned" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { lead_id: row.id as string };
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let orderId = makeOrderId();
    let inserted = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const { error } = await supabaseAdmin.from("orders").insert({
        order_id: orderId,
        candidate_name_hindi: data.candidate_name_hindi,
        candidate_name_english: data.candidate_name_english,
        contact_number: data.contact_number,
        district: data.district,
        panchayat_samiti: data.panchayat_samiti,
        gram_panchayat: data.gram_panchayat,
        ward_number: data.ward_number,
        election_symbol: data.election_symbol,
        slogan: data.slogan || null,
        photo_path: data.photo_path,
        ip_address: data.ip_address ?? null,
        status: "Pending",
      });
      if (!error) {
        inserted = true;
        break;
      }
      if (error.code === "23505") {
        orderId = `${makeOrderId(attempt + 1)}${attempt > 3 ? Math.floor(Math.random() * 10) : ""}`;
        continue;
      }
      throw new Error(error.message);
    }
    if (!inserted) throw new Error("Could not generate a unique order id");

    if (data.lead_id) {
      await supabaseAdmin
        .from("visitor_leads")
        .update({
          phone: data.contact_number,
          lead_type: "submitted",
          order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.lead_id);
    } else {
      await supabaseAdmin.from("visitor_leads").insert({
        ip_address: data.ip_address ?? null,
        phone: data.contact_number,
        lead_type: "submitted",
        order_id: orderId,
      });
    }

    return { order_id: orderId };
  });
