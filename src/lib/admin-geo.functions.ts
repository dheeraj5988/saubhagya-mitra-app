import { createServerFn } from "@tanstack/react-start";

import {
  districtSaveSchema,
  geoDeleteSchema,
  geoImportSchema,
  geoListSchema,
  gramPanchayatSaveSchema,
  samitiSaveSchema,
  wardSaveSchema,
  type GeoRow,
  type GeoWardRow,
} from "./admin-geo.schema";

const TABLES = {
  district: "geo_districts",
  samiti: "geo_panchayat_samitis",
  gram_panchayat: "geo_gram_panchayats",
  ward: "geo_wards",
} as const;

/** One call returns the whole cascade for the operator's current selection. */
export const adminGeography = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => geoListSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const districts = await db
      .from("geo_districts")
      .select("id, name, name_hindi, active")
      .order("name")
      .limit(500);
    if (districts.error) throw new Error(districts.error.message);

    let samitis: GeoRow[] = [];
    if (data.district_id) {
      const res = await db
        .from("geo_panchayat_samitis")
        .select("id, name, name_hindi, active")
        .eq("district_id", data.district_id)
        .order("name")
        .limit(1000);
      if (res.error) throw new Error(res.error.message);
      samitis = (res.data ?? []) as GeoRow[];
    }

    let gramPanchayats: GeoRow[] = [];
    if (data.samiti_id) {
      const res = await db
        .from("geo_gram_panchayats")
        .select("id, name, name_hindi, active")
        .eq("samiti_id", data.samiti_id)
        .order("name")
        .limit(2000);
      if (res.error) throw new Error(res.error.message);
      gramPanchayats = (res.data ?? []) as GeoRow[];
    }

    let wards: GeoWardRow[] = [];
    if (data.gram_panchayat_id) {
      const res = await db
        .from("geo_wards")
        .select("id, ward_number, voter_count, active")
        .eq("gram_panchayat_id", data.gram_panchayat_id)
        .order("ward_number")
        .limit(500);
      if (res.error) throw new Error(res.error.message);
      wards = (res.data ?? []) as GeoWardRow[];
    }

    return {
      districts: (districts.data ?? []) as GeoRow[],
      samitis,
      gramPanchayats,
      wards,
    };
  });

export const adminSaveDistrict = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => districtSaveSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const payload = {
      name: data.name,
      name_hindi: data.name_hindi ?? null,
      active: data.active,
    };
    const res = data.id
      ? await db.from("geo_districts").update(payload).eq("id", data.id).select("id").single()
      : await db.from("geo_districts").insert(payload).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const, id: res.data.id as string };
  });

export const adminSaveSamiti = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => samitiSaveSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const payload = {
      district_id: data.district_id,
      name: data.name,
      name_hindi: data.name_hindi ?? null,
      active: data.active,
    };
    const res = data.id
      ? await db
          .from("geo_panchayat_samitis")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await db.from("geo_panchayat_samitis").insert(payload).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const, id: res.data.id as string };
  });

export const adminSaveGramPanchayat = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => gramPanchayatSaveSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const payload = {
      samiti_id: data.samiti_id,
      name: data.name,
      name_hindi: data.name_hindi ?? null,
      active: data.active,
    };
    const res = data.id
      ? await db.from("geo_gram_panchayats").update(payload).eq("id", data.id).select("id").single()
      : await db.from("geo_gram_panchayats").insert(payload).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const, id: res.data.id as string };
  });

export const adminSaveWard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => wardSaveSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const payload = {
      gram_panchayat_id: data.gram_panchayat_id,
      ward_number: data.ward_number,
      voter_count: data.voter_count,
      active: data.active,
    };
    const res = data.id
      ? await db.from("geo_wards").update(payload).eq("id", data.id).select("id").single()
      : await db.from("geo_wards").insert(payload).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const, id: res.data.id as string };
  });

export const adminDeleteGeo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => geoDeleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db.from(TABLES[data.level]).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Bulk CSV import. Existing rows are reused by name so re-importing a corrected
 * sheet updates voter counts instead of duplicating the hierarchy.
 */
export const adminImportGeography = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => geoImportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const districtIds = new Map<string, string>();
    const samitiIds = new Map<string, string>();
    const gpIds = new Map<string, string>();
    let wards = 0;

    async function ensureDistrict(name: string) {
      const existing = await db
        .from("geo_districts")
        .select("id")
        .eq("name", name)
        .maybeSingle();
      if (existing.data?.id) return existing.data.id;
      const inserted = await db
        .from("geo_districts")
        .insert({ name, active: true })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      return inserted.data.id;
    }

    async function ensureSamiti(districtId: string, name: string) {
      const existing = await db
        .from("geo_panchayat_samitis")
        .select("id")
        .eq("district_id", districtId)
        .eq("name", name)
        .maybeSingle();
      if (existing.data?.id) return existing.data.id;
      const inserted = await db
        .from("geo_panchayat_samitis")
        .insert({ district_id: districtId, name, active: true })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      return inserted.data.id;
    }

    async function ensureGramPanchayat(samitiId: string, name: string) {
      const existing = await db
        .from("geo_gram_panchayats")
        .select("id")
        .eq("samiti_id", samitiId)
        .eq("name", name)
        .maybeSingle();
      if (existing.data?.id) return existing.data.id;
      const inserted = await db
        .from("geo_gram_panchayats")
        .insert({ samiti_id: samitiId, name, active: true })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      return inserted.data.id;
    }

    for (const row of data.rows) {
      const dKey = row.district;
      if (!districtIds.has(dKey)) {
        districtIds.set(dKey, await ensureDistrict(row.district));
      }
      const districtId = districtIds.get(dKey)!;

      const sKey = `${districtId}|${row.panchayat_samiti}`;
      if (!samitiIds.has(sKey)) {
        samitiIds.set(
          sKey,
          await ensureSamiti(districtId, row.panchayat_samiti),
        );
      }
      const samitiId = samitiIds.get(sKey)!;

      const gKey = `${samitiId}|${row.gram_panchayat}`;
      if (!gpIds.has(gKey)) {
        gpIds.set(
          gKey,
          await ensureGramPanchayat(samitiId, row.gram_panchayat),
        );
      }
      const gpId = gpIds.get(gKey)!;

      const existingWard = await db
        .from("geo_wards")
        .select("id")
        .eq("gram_panchayat_id", gpId)
        .eq("ward_number", row.ward_number)
        .maybeSingle();

      if (existingWard.data?.id) {
        const { error } = await db
          .from("geo_wards")
          .update({ voter_count: row.voter_count, active: true })
          .eq("id", existingWard.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("geo_wards").insert({
          gram_panchayat_id: gpId,
          ward_number: row.ward_number,
          voter_count: row.voter_count,
          active: true,
        });
        if (error) throw new Error(error.message);
      }
      wards++;
    }

    return {
      ok: true as const,
      districts: districtIds.size,
      samitis: samitiIds.size,
      gram_panchayats: gpIds.size,
      wards,
    };
  });
