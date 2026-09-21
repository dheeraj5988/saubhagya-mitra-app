import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminTokenSchema } from "./admin-catalog.schema";
import type { WardMappingCsvRow } from "./csv";

const wardMappingRowSchema = z.object({
  district: z.string().trim().min(1).max(120),
  panchayat_samiti: z.string().trim().min(1).max(120),
  gram_panchayat: z.string().trim().min(1).max(120),
  ward_number: z.string().trim().min(1).max(40),
  app_key: z.string().trim().min(1).max(200),
});

const wardMappingImportSchema = adminTokenSchema.extend({
  rows: z.array(wardMappingRowSchema).min(1).max(20_000),
});

/** Loose match: trims, lowercases, collapses separators/whitespace. */
function norm(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Ward numbers compare as integers so "03" / "3" / " 3 " all match. */
function normWard(value: string): string | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? String(n) : null;
}

export type WardMappingUnmatchedRow = {
  line: number;
  reason: string;
  row: WardMappingCsvRow;
};

export type WardMappingImportResult = {
  ok: true;
  matched: number;
  unmatched_in_csv: number;
  unmatched_rows: WardMappingUnmatchedRow[];
  unmatched_truncated: boolean;
  total_active_wards: number;
  wards_with_app_key: number;
  wards_missing_app_key: number;
};

/**
 * Matches each CSV row to a geo_wards row by walking district -> panchayat
 * samiti -> gram panchayat -> ward number (scoped within that gram panchayat,
 * so ward 3 of one GP is never confused with ward 3 of another), then writes
 * app_key in one round trip via bulk_set_ward_app_keys. Re-uploading a
 * corrected sheet is safe — it only ever overwrites the rows it matches.
 */
export const adminImportWardMapping = createServerFn({ method: "POST" })
  .validator((d: unknown) => wardMappingImportSchema.parse(d))
  .handler(async ({ data }): Promise<WardMappingImportResult> => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const [districts, samitis, gps, wards] = await Promise.all([
      db.from("geo_districts").select("id, name, name_hindi"),
      db.from("geo_panchayat_samitis").select("id, district_id, name, name_hindi"),
      db.from("geo_gram_panchayats").select("id, samiti_id, name, name_hindi"),
      (db as any).from("geo_wards").select("id, gram_panchayat_id, ward_number, app_key"),
    ]);
    for (const r of [districts, samitis, gps, wards]) if (r.error) throw new Error(r.error.message);

    const districtByName = new Map<string, string>();
    for (const d of districts.data ?? []) {
      districtByName.set(norm(d.name as string), d.id as string);
      if (d.name_hindi) districtByName.set(norm(d.name_hindi as string), d.id as string);
    }

    const samitiByKey = new Map<string, string>();
    for (const s of samitis.data ?? []) {
      samitiByKey.set(`${s.district_id}\u0000${norm(s.name as string)}`, s.id as string);
      if (s.name_hindi) samitiByKey.set(`${s.district_id}\u0000${norm(s.name_hindi as string)}`, s.id as string);
    }

    const gpByKey = new Map<string, string>();
    for (const g of gps.data ?? []) {
      gpByKey.set(`${g.samiti_id}\u0000${norm(g.name as string)}`, g.id as string);
      if (g.name_hindi) gpByKey.set(`${g.samiti_id}\u0000${norm(g.name_hindi as string)}`, g.id as string);
    }

    const wardByKey = new Map<string, string>(); // `${gpId}\0${wardNumberInt}` -> ward id
    for (const w of (wards.data ?? []) as any[]) {
      const wn = normWard(String(w.ward_number));
      if (wn) wardByKey.set(`${w.gram_panchayat_id}\u0000${wn}`, w.id as string);
    }

    const updates: { id: string; app_key: string }[] = [];
    const unmatched: WardMappingUnmatchedRow[] = [];
    const seenAppKeys = new Map<string, number>();
    const seenWardIds = new Map<string, number>();

    data.rows.forEach((row, idx) => {
      const line = idx + 2; // header is line 1
      const districtId = districtByName.get(norm(row.district));
      if (!districtId) {
        unmatched.push({ line, reason: "District not found", row });
        return;
      }
      const samitiId = samitiByKey.get(`${districtId}\u0000${norm(row.panchayat_samiti)}`);
      if (!samitiId) {
        unmatched.push({ line, reason: "Panchayat Samiti not found under this district", row });
        return;
      }
      const gpId = gpByKey.get(`${samitiId}\u0000${norm(row.gram_panchayat)}`);
      if (!gpId) {
        unmatched.push({ line, reason: "Gram Panchayat not found under this Panchayat Samiti", row });
        return;
      }
      const wn = normWard(row.ward_number);
      if (!wn) {
        unmatched.push({ line, reason: "Ward number is not a valid number", row });
        return;
      }
      const wardId = wardByKey.get(`${gpId}\u0000${wn}`);
      if (!wardId) {
        unmatched.push({ line, reason: "Ward not found in this Gram Panchayat", row });
        return;
      }
      if (seenAppKeys.has(row.app_key)) {
        unmatched.push({
          line,
          reason: `Duplicate app_key — also used on line ${seenAppKeys.get(row.app_key)}`,
          row,
        });
        return;
      }
      if (seenWardIds.has(wardId)) {
        unmatched.push({
          line,
          reason: `This ward already mapped on line ${seenWardIds.get(wardId)} in this file`,
          row,
        });
        return;
      }
      seenAppKeys.set(row.app_key, line);
      seenWardIds.set(wardId, line);
      updates.push({ id: wardId, app_key: row.app_key });
    });

    let matched = 0;
    if (updates.length) {
      const { data: count, error } = await (db as any).rpc("bulk_set_ward_app_keys", {
        pairs: updates,
      });
      if (error) throw new Error(error.message);
      matched = Number(count ?? updates.length);
    }

    const UNMATCHED_CAP = 500;
    const [{ count: totalWards }, { count: mappedWards }] = await Promise.all([
      db.from("geo_wards").select("id", { count: "exact", head: true }).eq("active", true),
      (db as any)
        .from("geo_wards")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .not("app_key", "is", null),
    ]);

    return {
      ok: true,
      matched,
      unmatched_in_csv: unmatched.length,
      unmatched_rows: unmatched.slice(0, UNMATCHED_CAP),
      unmatched_truncated: unmatched.length > UNMATCHED_CAP,
      total_active_wards: totalWards ?? 0,
      wards_with_app_key: mappedWards ?? 0,
      wards_missing_app_key: (totalWards ?? 0) - (mappedWards ?? 0),
    };
  });

/** Quick coverage check for the admin panel (no file needed). */
export const adminWardMappingStats = createServerFn({ method: "POST" })
  .validator((d: unknown) => adminTokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const [{ count: totalWards }, { count: mappedWards }] = await Promise.all([
      db.from("geo_wards").select("id", { count: "exact", head: true }).eq("active", true),
      (db as any)
        .from("geo_wards")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .not("app_key", "is", null),
    ]);

    return {
      total_active_wards: totalWards ?? 0,
      wards_with_app_key: mappedWards ?? 0,
      wards_missing_app_key: (totalWards ?? 0) - (mappedWards ?? 0),
    };
  });
