import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertSession } from "./admin.server";
import { adminTokenSchema } from "./admin-catalog.schema";
import { makeOrderId } from "./orders.schema";

export const getProcessingDashboard = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const db = await assertSession(data.token);

    const { data: workers, error: wErr } = await db
      .from("workers")
      .select("*")
      .order("name", { ascending: true });
      
    if (wErr) throw new Error(wErr.message);

    const { data: orders, error: oErr } = await db
      .from("orders")
      .select(
        "id, order_id, is_sample, payment_status, processing_status, assigned_worker_id, created_at, candidate_name_english",
      )
      .in("processing_status", ["queued", "processing", "ready", "new"])
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (oErr) throw new Error(oErr.message);

    return { workers, orders };
  });

const testJobSchema = adminTokenSchema.extend({
  worker_id: z.string().uuid(),
});

/**
 * Creates a throwaway PAID + queued order reserved for one PC, so "Send Test
 * Job" exercises the full pipeline (claim -> local desk EXE -> R2 upload ->
 * complete) on that specific machine without touching real business data.
 * The order has no real ward, so ward_key/ward_keys come back empty — this
 * tests PC + desk-app connectivity, not ward mapping.
 */
export const adminTriggerTestJob = createServerFn({ method: "POST" })
  .validator((d: unknown) => testJobSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await assertSession(data.token);

    const { data: worker, error: workerErr } = await db
      .from("workers")
      .select("id, name")
      .eq("id", data.worker_id)
      .maybeSingle();
    if (workerErr) throw new Error(workerErr.message);
    if (!worker) throw new Error("Worker not found.");

    const basePayload = {
      is_sample: true,
      candidate_name_hindi: "टेस्ट प्रत्याशी",
      candidate_name_english: "Test Candidate",
      contact_number: "9999999999",
      district: "TEST",
      panchayat_samiti: "TEST",
      gram_panchayat: "TEST",
      ward_number: "TEST-1",
      design_code: "D2",
      voter_count: 15,
      rate_per_voter: 0.15,
      amount: 2.25,
      election_symbol: "टेस्ट चिन्ह",
      list_options: ["slip"],
      status: "New",
      payment_status: "PAID",
      // Left unset (NULL) on purpose: the legacy orders_payment_method_check
      // constraint only allows real gateway values, and a test job has no
      // real payment method behind it.
      payment_updated_at: new Date().toISOString(),
      processing_status: "queued" as const,
      assigned_worker_id: data.worker_id,
      pad: "ps_sadasya",
    };

    let orderId = makeOrderId(0, "TEST");
    for (let attempt = 0; attempt < 10; attempt++) {
      const payload = { ...basePayload, order_id: orderId };
      let { error } = await (db as any).from("orders").insert(payload);

      // Safety net if `pad` hasn't been added on this environment yet.
      if (error && (error.code === "PGRST204" || error.code === "42703")) {
        const { pad: _pad, ...withoutPad } = payload;
        void _pad;
        ({ error } = await (db as any).from("orders").insert(withoutPad));
      }

      if (!error) {
        return { ok: true as const, order_id: orderId, worker_name: worker.name as string };
      }
      if (error.code !== "23505") throw new Error(error.message);
      orderId = makeOrderId(attempt + 1, "TEST");
    }
    throw new Error("Could not generate a unique test order id.");
  });

/** Signed 1-hour link to the customer's uploaded voter-list PDF (photo-slip orders). */
export const adminVoterPdfUrl = createServerFn({ method: "POST" })
  .validator((d: { token: string; path: string }) => d)
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    await assertSession(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.storage
      .from("voter-raw-lists")
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: res.signedUrl };
  });

export const markOrderPaidAdmin = createServerFn({ method: "POST" })
  .validator((d: { token: string; orderId: string }) => d)
  .handler(async ({ data }) => {
    const db = await assertSession(data.token);

    const { error } = await db
      .from("orders")
      .update({ payment_status: "PAID" })
      .eq("id", data.orderId)
      .eq("payment_status", "UNPAID");

    if (error) throw new Error(error.message);
    return { success: true };
  });
