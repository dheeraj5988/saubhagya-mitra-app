-- ============ Geography master data ============
CREATE TABLE public.geo_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_hindi text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
GRANT ALL ON public.geo_districts TO service_role;
ALTER TABLE public.geo_districts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.geo_panchayat_samitis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES public.geo_districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_hindi text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (district_id, name)
);
GRANT ALL ON public.geo_panchayat_samitis TO service_role;
ALTER TABLE public.geo_panchayat_samitis ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.geo_gram_panchayats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id uuid NOT NULL REFERENCES public.geo_panchayat_samitis(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_hindi text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (samiti_id, name)
);
GRANT ALL ON public.geo_gram_panchayats TO service_role;
ALTER TABLE public.geo_gram_panchayats ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.geo_wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gram_panchayat_id uuid NOT NULL REFERENCES public.geo_gram_panchayats(id) ON DELETE CASCADE,
  ward_number text NOT NULL,
  voter_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gram_panchayat_id, ward_number)
);
GRANT ALL ON public.geo_wards TO service_role;
ALTER TABLE public.geo_wards ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_geo_samitis_district ON public.geo_panchayat_samitis (district_id);
CREATE INDEX idx_geo_gps_samiti ON public.geo_gram_panchayats (samiti_id);
CREATE INDEX idx_geo_wards_gp ON public.geo_wards (gram_panchayat_id);

CREATE TRIGGER geo_districts_set_updated_at BEFORE UPDATE ON public.geo_districts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER geo_samitis_set_updated_at BEFORE UPDATE ON public.geo_panchayat_samitis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER geo_gps_set_updated_at BEFORE UPDATE ON public.geo_gram_panchayats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER geo_wards_set_updated_at BEFORE UPDATE ON public.geo_wards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Free sample requests ============
CREATE TABLE public.sample_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  candidate_name text NOT NULL,
  contact_number text NOT NULL,
  district text,
  panchayat_samiti text,
  gram_panchayat text,
  ward_number text,
  ward_id uuid REFERENCES public.geo_wards(id) ON DELETE SET NULL,
  voter_count integer,
  status text NOT NULL DEFAULT 'New',
  notes text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sample_requests TO service_role;
ALTER TABLE public.sample_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER sample_requests_set_updated_at BEFORE UPDATE ON public.sample_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Pricing + PhonePe configuration ============
CREATE TABLE public.payment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  rate_per_voter numeric NOT NULL DEFAULT 0.15,
  min_order_amount numeric,
  free_sample_voter_count integer NOT NULL DEFAULT 24,
  phonepe_enabled boolean NOT NULL DEFAULT false,
  phonepe_environment text NOT NULL DEFAULT 'SANDBOX' CHECK (phonepe_environment IN ('SANDBOX','PRODUCTION')),
  phonepe_merchant_id text,
  phonepe_client_id text,
  phonepe_redirect_url text,
  phonepe_callback_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_config TO service_role;
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER payment_config_set_updated_at BEFORE UPDATE ON public.payment_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.payment_config (singleton) VALUES (true);

CREATE TABLE public.payment_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  phonepe_client_secret text,
  phonepe_salt_key text,
  phonepe_salt_index text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_credentials TO service_role;
ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER payment_credentials_set_updated_at BEFORE UPDATE ON public.payment_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.payment_credentials (singleton) VALUES (true);

-- ============ Orders: new commerce model ============
ALTER TABLE public.orders
  ADD COLUMN voter_count integer,
  ADD COLUMN rate_per_voter numeric,
  ADD COLUMN amount numeric,
  ADD COLUMN design_code text,
  ADD COLUMN is_sample boolean NOT NULL DEFAULT false,
  ADD COLUMN ward_id uuid REFERENCES public.geo_wards(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

UPDATE public.orders SET status = 'New' WHERE status = 'Pending';
UPDATE public.orders SET status = 'In Production' WHERE status = 'In-Process';
UPDATE public.orders SET status = 'Delivered' WHERE status = 'Completed';
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'New';

UPDATE public.orders SET payment_status = 'PAID'
  WHERE payment_status IN ('PAID_VERIFIED','MANUAL_APPROVED');
UPDATE public.orders SET payment_status = 'PENDING'
  WHERE payment_status NOT IN ('PAID','FAILED','REFUNDED');
ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'PENDING';

UPDATE public.orders SET payment_method = NULL
  WHERE payment_method IN ('MANUAL_QR','PAYPUR_GATEWAY');

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('New','Paid','In Production','Ready','Delivered','Closed'));
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('PENDING','PAID','FAILED','REFUNDED'));
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('PHONEPE'));

-- ============ Dashboard revenue helper ============
CREATE OR REPLACE FUNCTION public.admin_revenue()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(o.amount), 0)::numeric
  FROM public.orders o
  WHERE o.payment_status = 'PAID';
$$;