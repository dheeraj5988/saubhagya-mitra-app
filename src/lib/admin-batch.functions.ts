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

    const photoPaths = rows.map((r) => r["photo_path"]).filter(Boolean) as string[];
    const photos = new Map<string, string>();
    if (photoPaths.length) {
      const { data: urls } = await db.storage
        .from("candidate-photos")
        .createSignedUrls(photoPaths, SIGNED_TTL);
      for (const item of urls ?? []) {
        if (item.path && item.signedUrl) photos.set(item.path, item.signedUrl);
      }
    }

    const orders: BatchOrder[] = rows.map((r) => {
      const photoPath = (r["photo_path"] as string | null) ?? null;
      const voterCount = r["voter_count"] == null ? null : Number(r["voter_count"]);
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
          voter_count: voterCount,
        },
        product: {
          design_code: (r["design_code"] as string | null) ?? null,
          voter_count: voterCount,
          rate_per_voter: r["rate_per_voter"] == null ? null : Number(r["rate_per_voter"]),
          amount: r["amount"] == null ? null : Number(r["amount"]),
        },
        payment: {
          amount: r["payment_amount"] == null ? null : Number(r["payment_amount"]),
          method: (r["payment_method"] as string | null) ?? null,
          status: r["payment_status"] as string,
          transaction_id: (r["payment_txn_id"] as string | null) ?? null,
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
