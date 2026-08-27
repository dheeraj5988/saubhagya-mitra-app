CREATE TABLE public.election_symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name text NOT NULL,
  symbol_name text NOT NULL,
  symbol_image_path text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.election_symbols TO service_role;
ALTER TABLE public.election_symbols ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  qr_image_path text,
  display_name text,
  upi_id text,
  instructions text,
  amount numeric(10,2),
  paypur_enabled boolean NOT NULL DEFAULT false,
  paypur_base_url text NOT NULL DEFAULT 'https://upi.paypur.in',
  paypur_amount numeric(10,2),
  paypur_success_url text,
  paypur_failure_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  paypur_api_key text,
  paypur_signing_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_secrets TO service_role;
ALTER TABLE public.payment_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.payment_settings (singleton) VALUES (true);
INSERT INTO public.payment_secrets (singleton) VALUES (true);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS election_symbol_id uuid REFERENCES public.election_symbols(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_name_snapshot text,
  ADD COLUMN IF NOT EXISTS symbol_name_snapshot text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Unpaid',
  ADD COLUMN IF NOT EXISTS payment_screenshot_path text,
  ADD COLUMN IF NOT EXISTS payment_txn_id text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_party_snapshot_idx ON public.orders (party_name_snapshot);
CREATE INDEX IF NOT EXISTS orders_symbol_snapshot_idx ON public.orders (symbol_name_snapshot);
CREATE INDEX IF NOT EXISTS election_symbols_active_sort_idx ON public.election_symbols (active, sort_order, party_name);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER election_symbols_set_updated_at BEFORE UPDATE ON public.election_symbols
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payment_settings_set_updated_at BEFORE UPDATE ON public.payment_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payment_secrets_set_updated_at BEFORE UPDATE ON public.payment_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anon may upload payment screenshots only"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-assets'
  AND name ~ '^screenshots/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$'
);