ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS banner_option boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_slip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voter_photo_pdf_path text,
  ADD COLUMN IF NOT EXISTS ward_photo_asset_id uuid;
