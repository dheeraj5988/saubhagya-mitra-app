import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  txn_id: z.string().trim().min(1).max(120),
  order_id: z.string().trim().min(1).max(40),
  status: z.string().trim().min(1).max(40),
  amount: z.union([z.string(), z.number()]),
  signature: z.string().trim().min(16).max(200),
});

/**
 * PayPur payment callback. Only a payload whose HMAC matches the signing
 * secret on file may change an order's payment status.
 */
export const Route = createFileRoute("/api/public/paypur/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { loadPaypurConfig, hmacHex, timingSafeHexEqual } = await import(
          "@/lib/payments.server"
        );

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid body", { status: 400 });
        }

        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });
        const data = parsed.data;

        const cfg = await loadPaypurConfig();
        if (!cfg.enabled || !cfg.signing_secret) {
          return new Response("Not enabled", { status: 404 });
        }

        const expected = await hmacHex(
          `${data.txn_id}|${data.order_id}|${data.status}|${data.amount}`,
          cfg.signing_secret,
        );
        if (!timingSafeHexEqual(expected, data.signature.toLowerCase())) {
          return new Response("Invalid signature", { status: 401 });
        }

        const normalized = data.status.toLowerCase();
        const paymentStatus =
          normalized === "success" || normalized === "paid" || normalized === "completed"
            ? "Payment Verified"
            : "Payment Rejected";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: paymentStatus,
            payment_txn_id: data.txn_id,
            payment_amount: Number(data.amount),
            payment_updated_at: new Date().toISOString(),
          })
          .eq("order_id", data.order_id);
        if (error) return new Response("Update failed", { status: 500 });

        return Response.json({ ok: true, payment_status: paymentStatus });
      },
    },
  },
});
