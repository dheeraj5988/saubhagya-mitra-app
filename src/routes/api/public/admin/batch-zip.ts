import { createFileRoute } from "@tanstack/react-router";

import { batchSchema } from "@/lib/admin-batch.schema";

/**
 * Streams the candidate photo + payment screenshot for the current admin batch
 * as a ZIP. This lives on a raw HTTP route (not a server function) because the
 * response is binary; authorization is the same server-validated admin session
 * used everywhere else, so the `/api/public` prefix grants nothing on its own.
 */
export const Route = createFileRoute("/api/public/admin/batch-zip")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid body", { status: 400 });
        }

        const parsed = batchSchema.safeParse(body);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const { fetchBatchOrders, makeBatchId } = await import("@/lib/admin-batch.server");
        const { createZip, safeName } = await import("@/lib/zip.server");

        let batch;
        try {
          batch = await fetchBatchOrders(parsed.data);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("UNAUTHORIZED")) return new Response("Unauthorized", { status: 401 });
          return new Response("Batch lookup failed", { status: 500 });
        }

        const entries: { name: string; data: Uint8Array }[] = [];
        const missing: string[] = [];

        const pull = async (bucket: string, path: string, name: string) => {
          const { data, error } = await batch.db.storage.from(bucket).download(path);
          if (error || !data) {
            missing.push(name);
            return;
          }
          entries.push({ name, data: new Uint8Array(await data.arrayBuffer()) });
        };

        for (const row of batch.rows) {
          const orderId = safeName(String(row["order_id"] ?? "order"), "order");
          const photo = row["photo_path"] as string | null;
          const shot = row["payment_screenshot_path"] as string | null;
          if (photo) {
            const ext = photo.split(".").pop() ?? "jpg";
            await pull("candidate-photos", photo, `${orderId}/candidate-photo.${safeName(ext)}`);
          } else {
            missing.push(`${orderId}/candidate-photo`);
          }
          if (shot) {
            const ext = shot.split(".").pop() ?? "jpg";
            await pull("payment-assets", shot, `${orderId}/payment-screenshot.${safeName(ext)}`);
          } else {
            missing.push(`${orderId}/payment-screenshot`);
          }
        }

        const batchId = makeBatchId();
        // A missing asset never fails the whole export — it is reported in the
        // manifest that travels inside the archive.
        const manifest = {
          batch_id: batchId,
          generated_at: new Date().toISOString(),
          orders: batch.rows.length,
          files_included: entries.length,
          missing_assets: missing,
        };
        entries.push({
          name: "manifest.json",
          data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
        });

        const zip = createZip(entries);
        return new Response(zip as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${batchId}-assets.zip"`,
            "Cache-Control": "no-store",
            "X-Batch-Missing": String(missing.length),
          },
        });
      },
    },
  },
});
