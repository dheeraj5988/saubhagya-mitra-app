ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS body_name text,
  ADD COLUMN IF NOT EXISTS evm_serial text,
  ADD COLUMN IF NOT EXISTS poll_date text,
  ADD COLUMN IF NOT EXISTS list_options text[] NOT NULL DEFAULT '{}';