import { z } from "zod";

const token = z.string().regex(/^[0-9a-f]{64}$/, "Invalid session token");

export const geoListSchema = z.object({
  token,
  district_id: z.string().uuid().nullable().optional(),
  samiti_id: z.string().uuid().nullable().optional(),
  gram_panchayat_id: z.string().uuid().nullable().optional(),
});

export const districtSaveSchema = z.object({
  token,
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  name_hindi: z.string().trim().max(120).nullable().optional(),
  active: z.boolean().default(true),
});

export const samitiSaveSchema = districtSaveSchema.extend({
  district_id: z.string().uuid(),
});

export const gramPanchayatSaveSchema = districtSaveSchema.extend({
  samiti_id: z.string().uuid(),
});

export const wardSaveSchema = z.object({
  token,
  id: z.string().uuid().nullable().optional(),
  gram_panchayat_id: z.string().uuid(),
  ward_number: z.string().trim().min(1).max(20),
  voter_count: z.number().int().min(0).max(1_000_000),
  active: z.boolean().default(true),
});

export const geoDeleteSchema = z.object({
  token,
  level: z.enum(["district", "samiti", "gram_panchayat", "ward"]),
  id: z.string().uuid(),
});

/**
 * CSV import payload. Rows are flat: one line per ward, carrying its whole
 * ancestry so an operator can paste a spreadsheet export straight in.
 */
export const geoImportSchema = z.object({
  token,
  rows: z
    .array(
      z.object({
        district: z.string().trim().min(1).max(120),
        panchayat_samiti: z.string().trim().min(1).max(120),
        gram_panchayat: z.string().trim().min(1).max(120),
        ward_number: z.string().trim().min(1).max(20),
        voter_count: z.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1)
    // The admin UI streams a large sheet in chunks; one call stays bounded.
    .max(1000),
});

export const geoStatsSchema = z.object({ token });

export type GeoRow = { id: string; name: string; name_hindi: string | null; active: boolean };
export type GeoWardRow = {
  id: string;
  ward_number: string;
  voter_count: number;
  active: boolean;
};
