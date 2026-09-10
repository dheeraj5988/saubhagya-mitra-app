import { createServerFn } from "@tanstack/react-start";

import {
  districtSaveSchema,
  geoDeleteSchema,
  geoImportSchema,
  geoListSchema,
  geoStatsSchema,
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
 * Bulk CSV import for one chunk of rows. Every level is upserted on its unique
 * key, so re-importing a corrected sheet updates voter counts instead of
 * duplicating the hierarchy. The admin UI feeds large sheets in chunks.
 */
export const adminImportGeography = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => geoImportSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const uniq = <T,>(items: T[]) => Array.from(new Set(items));

    // 1. Districts
    const districtNames = uniq(data.rows.map((r) => r.district));
    const districtRes = await db
      .from("geo_districts")
      .upsert(
        districtNames.map((name) => ({ name, active: true })),
        { onConflict: "name" },
      )
      .select("id, name");
    if (districtRes.error) throw new Error(districtRes.error.message);
    const districtId = new Map((districtRes.data ?? []).map((d) => [d.name as string, d.id as string]));

    // 2. Panchayat samitis
    const samitiKeys = uniq(data.rows.map((r) => `${r.district}\u0000${r.panchayat_samiti}`));
    const samitiRes = await db
      .from("geo_panchayat_samitis")
      .upsert(
        samitiKeys.map((key) => {
          const [district, name] = key.split("\u0000") as [string, string];
          return { district_id: districtId.get(district)!, name, active: true };
        }),
        { onConflict: "district_id,name" },
      )
      .select("id, district_id, name");
    if (samitiRes.error) throw new Error(samitiRes.error.message);
    const samitiId = new Map(
      (samitiRes.data ?? []).map((s) => [`${s.district_id as string}\u0000${s.name as string}`, s.id as string]),
    );

    // 3. Gram panchayats
    const gpKeys = uniq(
      data.rows.map(
        (r) => `${samitiId.get(`${districtId.get(r.district)}\u0000${r.panchayat_samiti}`)}\u0000${r.gram_panchayat}`,
      ),
    );
    const gpRes = await db
      .from("geo_gram_panchayats")
      .upsert(
        gpKeys.map((key) => {
          const [samiti, name] = key.split("\u0000") as [string, string];
          return { samiti_id: samiti, name, active: true };
        }),
        { onConflict: "samiti_id,name" },
      )
      .select("id, samiti_id, name");
    if (gpRes.error) throw new Error(gpRes.error.message);
    const gpId = new Map(
      (gpRes.data ?? []).map((g) => [`${g.samiti_id as string}\u0000${g.name as string}`, g.id as string]),
    );

    // 4. Wards — count inserts vs updates before writing.
    const wardRows = uniq(
      data.rows.map((r) => {
        const sId = samitiId.get(`${districtId.get(r.district)}\u0000${r.panchayat_samiti}`)!;
        const gId = gpId.get(`${sId}\u0000${r.gram_panchayat}`)!;
        return JSON.stringify([gId, r.ward_number, r.voter_count]);
      }),
    ).map((json) => {
      const [gram_panchayat_id, ward_number, voter_count] = JSON.parse(json) as [string, string, number];
      return { gram_panchayat_id, ward_number, voter_count, active: true };
    });

    const gpIdsTouched = uniq(wardRows.map((w) => w.gram_panchayat_id));
    const existing = await db
      .from("geo_wards")
      .select("gram_panchayat_id, ward_number")
      .in("gram_panchayat_id", gpIdsTouched)
      .limit(50_000);
    if (existing.error) throw new Error(existing.error.message);
    const existingKeys = new Set(
      (existing.data ?? []).map((w) => `${w.gram_panchayat_id as string}\u0000${w.ward_number as string}`),
    );
    let updated = 0;
    for (const w of wardRows) {
      if (existingKeys.has(`${w.gram_panchayat_id}\u0000${w.ward_number}`)) updated++;
    }

    const wardRes = await db
      .from("geo_wards")
      .upsert(wardRows, { onConflict: "gram_panchayat_id,ward_number" })
      .select("id");
    if (wardRes.error) throw new Error(wardRes.error.message);

    return {
      ok: true as const,
      districts: districtNames.length,
      samitis: samitiKeys.length,
      gram_panchayats: gpKeys.length,
      wards: wardRows.length,
      inserted: wardRows.length - updated,
      updated,
    };
  });

/** Data-integrity panel: how much master data exists and when it last changed. */
export const adminGeoStats = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => geoStatsSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const [districts, samitis, gps, wards, latest, voters] = await Promise.all([
      db.from("geo_districts").select("id", { count: "exact", head: true }),
      db.from("geo_panchayat_samitis").select("id", { count: "exact", head: true }),
      db.from("geo_gram_panchayats").select("id", { count: "exact", head: true }),
      db.from("geo_wards").select("id", { count: "exact", head: true }),
      db.from("geo_wards").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      db.rpc("admin_total_voters"),
    ]);

    return {
      districts: districts.count ?? 0,
      samitis: samitis.count ?? 0,
      gram_panchayats: gps.count ?? 0,
      wards: wards.count ?? 0,
      total_voters: typeof voters.data === "number" ? voters.data : 0,
      last_import: (latest.data?.updated_at as string | undefined) ?? null,
    };
  });
