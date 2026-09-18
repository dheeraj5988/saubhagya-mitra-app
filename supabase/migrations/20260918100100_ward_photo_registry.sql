CREATE TABLE public.ward_photo_data_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL, -- references geo_wards(id) but loosely coupled since it's master data
  district text NOT NULL,
  panchayat_samiti text NOT NULL,
  gram_panchayat text NOT NULL,
  ward_number text NOT NULL,
  voter_count integer NOT NULL,
  asset_id uuid NOT NULL UNIQUE, -- tracks the storage object
  pdf_path text NOT NULL,
  extracted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ward_photo_data_registry TO service_role;
ALTER TABLE public.ward_photo_data_registry ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ward_photo_data_ward ON public.ward_photo_data_registry(ward_id);

CREATE OR REPLACE FUNCTION public.ward_photo_availability(p_ward_ids uuid[])
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*)::integer
  FROM public.ward_photo_data_registry
  WHERE ward_id = ANY(p_ward_ids);
$$;

GRANT EXECUTE ON FUNCTION public.ward_photo_availability(uuid[]) TO service_role;

-- Private bucket for raw voter rolls
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voter-raw-lists',
  'voter-raw-lists',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- RLS for the bucket: only service_role can read/write
CREATE POLICY "Service Role Full Access" ON storage.objects
FOR ALL TO service_role USING (bucket_id = 'voter-raw-lists') WITH CHECK (bucket_id = 'voter-raw-lists');
