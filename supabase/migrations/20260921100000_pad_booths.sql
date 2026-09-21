-- Saubhagya Voter Slip — पद (post) and भाग (booth) support for orders.
-- Safe to run more than once.

-- ============ Booths (भाग / मतदान केन्द्र) inside a ward ============
CREATE TABLE IF NOT EXISTS public.geo_booths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES public.geo_wards(id) ON DELETE CASCADE,
  booth_number text NOT NULL,
  booth_name text,                    -- मतदान केन्द्र का नाम (Hindi)
  voter_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ward_id, booth_number)
);
GRANT ALL ON public.geo_booths TO service_role;
ALTER TABLE public.geo_booths ENABLE ROW LEVEL SECURITY;  -- server-only, like geo_wards
CREATE INDEX IF NOT EXISTS idx_geo_booths_ward ON public.geo_booths (ward_id);

DROP TRIGGER IF EXISTS geo_booths_set_updated_at ON public.geo_booths;
CREATE TRIGGER geo_booths_set_updated_at BEFORE UPDATE ON public.geo_booths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Orders: post + booths ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pad text,
  ADD COLUMN IF NOT EXISTS booth_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS booth_snapshots jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pad_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_pad_check
  CHECK (pad IS NULL OR pad IN ('panch', 'sarpanch', 'ps_sadasya', 'zp_sadasya'));

-- English candidate names are no longer collected (Hindi only).
ALTER TABLE public.orders ALTER COLUMN candidate_name_english SET DEFAULT '';
