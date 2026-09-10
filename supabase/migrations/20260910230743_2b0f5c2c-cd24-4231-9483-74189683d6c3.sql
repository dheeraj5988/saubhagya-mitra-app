-- De-duplicate any existing rows before adding uniqueness
DELETE FROM public.geo_wards a USING public.geo_wards b
  WHERE a.ctid > b.ctid AND a.gram_panchayat_id = b.gram_panchayat_id AND a.ward_number = b.ward_number;
DELETE FROM public.geo_gram_panchayats a USING public.geo_gram_panchayats b
  WHERE a.ctid > b.ctid AND a.samiti_id = b.samiti_id AND a.name = b.name;
DELETE FROM public.geo_panchayat_samitis a USING public.geo_panchayat_samitis b
  WHERE a.ctid > b.ctid AND a.district_id = b.district_id AND a.name = b.name;
DELETE FROM public.geo_districts a USING public.geo_districts b
  WHERE a.ctid > b.ctid AND a.name = b.name;

CREATE UNIQUE INDEX IF NOT EXISTS geo_districts_name_key ON public.geo_districts (name);
CREATE UNIQUE INDEX IF NOT EXISTS geo_samitis_district_name_key ON public.geo_panchayat_samitis (district_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS geo_gps_samiti_name_key ON public.geo_gram_panchayats (samiti_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS geo_wards_gp_ward_key ON public.geo_wards (gram_panchayat_id, ward_number);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ward_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS ward_snapshots jsonb NOT NULL DEFAULT '[]'::jsonb;