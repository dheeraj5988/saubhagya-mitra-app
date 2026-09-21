import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertSession } from "./admin.server";

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
      .select("id, payment_status, processing_status, assigned_worker_id, created_at, candidate_name_english")
      .in("processing_status", ["queued", "processing", "ready", "new"])
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (oErr) throw new Error(oErr.message);

    return { workers, orders };
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
