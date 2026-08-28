import { createServerFn } from "@tanstack/react-start";

import { batchSchema, type BatchExport, type BatchOrder } from "./admin-batch.schema";

/** Asset links inside an export are deliberately short-lived. */
const SIGNED_TTL = 900;

/**
 * Claude-ready batch export. Storage paths never leave the server when a
 * signed URL can be issued instead.
 */
export const adminBatchExport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => batchSchema.parse(data))
  .handler(async ({ data }): Promise<BatchExport> => {
    const { fetchBatchOrders, makeBatchId } = await import("./admin-batch.server");
    const { db, rows, matched, limit } = await fetchBatchOrders(data);

    const sign = async (bucket: string, paths: string[]) => {
      const map = new Map<string, string>();
      if (!paths.length) return map;
      const { data: urls } = await db.storage.from(bucket).createSignedUrls(paths, SIGNED_TTL);
      for (const item of urls ?? []) {
        if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
      }
      return map;
    };

    const photoPaths = rows.map((r) => r["photo_path"]).filter(Boolean) as string[];
    const shotPaths = rows.map((r) => r["payment_screenshot_path"]).filter(Boolean) as string[];
    const [photos, shots] = await Promise.all([
      sign("candidate-photos", photoPaths),
      sign("payment-assets", shotPaths),
    ]);

    const orders: BatchOrder[] = rows.map((r) => {
      const photoPath = (r["photo_path"] as string | null) ?? null;
      const shotPath = (r["payment_screenshot_path"] as string | null) ?? null;
      return {
        order_id: r["order_id"] as string,
        timestamp: r["created_at"] as string,
        candidate: {
          name_hindi: r["candidate_name_hindi"] as string,
          name_english: r["candidate_name_english"] as string,
          contact_number: r["contact_number"] as string,
          election_symbol: r["election_symbol"] as string,
          party_name: (r["party_name_snapshot"] as string | null) ?? null,
          symbol_name: (r["symbol_name_snapshot"] as string | null) ?? null,
          slogan: (r["slogan"] as string | null) ?? null,
          photo_url: photoPath ? (photos.get(photoPath) ?? null) : null,
        },
        location: {
          district: r["district"] as string,
          panchayat_samiti: r["panchayat_samiti"] as string,
          gram_panchayat: r["gram_panchayat"] as string,
          ward_number: r["ward_number"] as string,
        },
        payment: {
          amount: r["payment_amount"] == null ? null : Number(r["payment_amount"]),
          method: (r["payment_method"] as string | null) ?? null,
          status: r["payment_status"] as string,
          transaction_id: (r["payment_txn_id"] as string | null) ?? null,
          screenshot_url: shotPath ? (shots.get(shotPath) ?? null) : null,
        },
        metadata: {
          ip_address: (r["ip_address"] as string | null) ?? null,
          user_agent: (r["user_agent"] as string | null) ?? null,
          status: r["status"] as string,
        },
      };
    });

    return {
      batch_id: makeBatchId(),
      export_timestamp: new Date().toISOString(),
      total_orders: orders.length,
      matched,
      limit,
      capped: matched > limit,
      orders,
    };
  });

/** Optional PayPur reconciliation lookup — key and HMAC stay server-side. */
export const adminPaypurStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = batchSchema
      .pick({ token: true })
      .extend(
        (
          batchSchema.shape as unknown as Record<string, never>
        ) as Record<string, never>,
      )
      .safeParse(data);
    void parsed;
    return data as { token: string; txn_id: string };
  })
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    await assertSession(data.token);
    const { loadPaypurConfig, isPaypurReady } = await import("./payments.server");
    const cfg = await loadPaypurConfig();
    if (!isPaypurReady(cfg)) return { ok: false as const, status: null };
    try {
      const res = await fetch(
        `${cfg.base_url}/api/merchant/status?txn_id=${encodeURIComponent(data.txn_id)}`,
        { headers: { "X-PAYPUR-KEY": cfg.api_key! } },
      );
      if (!res.ok) return { ok: false as const, status: null };
      const json = (await res.json()) as { status?: string };
      return { ok: true as const, status: json.status ?? null };
    } catch (error) {
      console.error("PayPur status lookup failed", error);
      return { ok: false as const, status: null };
    }
  });
