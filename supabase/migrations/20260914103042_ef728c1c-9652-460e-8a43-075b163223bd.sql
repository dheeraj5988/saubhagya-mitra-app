CREATE TABLE public.referral_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  district text,
  notes text,
  commission_type text NOT NULL DEFAULT 'PERCENT' CHECK (commission_type IN ('PERCENT','FLAT_PER_ORDER','PER_VOTER')),
  commission_value numeric NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_partners TO service_role;
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  partner_code text NOT NULL,
  ip_address text,
  user_agent text,
  lead_id uuid,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  partner_code text NOT NULL,
  order_uuid uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  order_amount numeric,
  voter_count integer,
  commission_type text NOT NULL,
  commission_value numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','PAID','REJECTED')),
  source text NOT NULL DEFAULT 'LINK' CHECK (source IN ('LINK','MANUAL')),
  approved_at timestamptz,
  paid_at timestamptz,
  payout_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_uuid)
);
GRANT ALL ON public.referral_conversions TO service_role;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referral_partner_id uuid REFERENCES public.referral_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referral_attributed_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_source text;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_referral_source_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_referral_source_check
  CHECK (referral_source IS NULL OR referral_source IN ('LINK','MANUAL'));

ALTER TABLE public.visitor_leads ADD COLUMN IF NOT EXISTS referral_code text;

CREATE INDEX IF NOT EXISTS idx_referral_conversions_partner_status ON public.referral_conversions (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_status ON public.referral_conversions (status);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_partner_time ON public.referral_clicks (partner_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_referral_partner ON public.orders (referral_partner_id);
CREATE INDEX IF NOT EXISTS idx_visitor_leads_referral_code ON public.visitor_leads (referral_code);

CREATE TRIGGER referral_partners_set_updated_at BEFORE UPDATE ON public.referral_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER referral_conversions_set_updated_at BEFORE UPDATE ON public.referral_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.calc_commission(p_type text, p_value numeric, p_amount numeric, p_voters integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_type IS NULL OR p_value IS NULL THEN 0::numeric
    WHEN p_type = 'PERCENT' THEN round(COALESCE(p_amount, 0) * p_value / 100.0, 2)
    WHEN p_type = 'FLAT_PER_ORDER' THEN round(p_value, 2)
    WHEN p_type = 'PER_VOTER' THEN round(COALESCE(p_voters, 0) * p_value, 2)
    ELSE 0::numeric
  END;
$$;
REVOKE ALL ON FUNCTION public.calc_commission(text, numeric, numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calc_commission(text, numeric, numeric, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_referral_conversion_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'PAID' AND COALESCE(OLD.payment_status, '') <> 'PAID' THEN
    UPDATE public.referral_conversions
       SET status = 'APPROVED', approved_at = now(), updated_at = now()
     WHERE order_uuid = NEW.id AND status = 'PENDING';
  ELSIF COALESCE(OLD.payment_status, '') = 'PAID' AND NEW.payment_status <> 'PAID' THEN
    UPDATE public.referral_conversions
       SET status = 'PENDING', approved_at = NULL, updated_at = now()
     WHERE order_uuid = NEW.id AND status = 'APPROVED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_referral_payment_sync ON public.orders;
CREATE TRIGGER orders_referral_payment_sync
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_referral_conversion_on_payment();

CREATE OR REPLACE FUNCTION public.admin_referral_summary()
RETURNS TABLE(
  partner_id uuid,
  partner_code text,
  full_name text,
  phone text,
  active boolean,
  commission_type text,
  commission_value numeric,
  click_count bigint,
  order_count bigint,
  paid_order_count bigint,
  total_order_amount numeric,
  commission_pending numeric,
  commission_approved numeric,
  commission_paid numeric,
  last_activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.partner_code,
    p.full_name,
    p.phone,
    p.active,
    p.commission_type,
    p.commission_value,
    COALESCE(c.click_count, 0),
    COALESCE(v.order_count, 0),
    COALESCE(v.paid_order_count, 0),
    COALESCE(v.total_order_amount, 0)::numeric,
    COALESCE(v.commission_pending, 0)::numeric,
    COALESCE(v.commission_approved, 0)::numeric,
    COALESCE(v.commission_paid, 0)::numeric,
    GREATEST(COALESCE(c.last_click, p.created_at), COALESCE(v.last_conv, p.created_at))
  FROM public.referral_partners p
  LEFT JOIN (
    SELECT partner_id, count(*) AS click_count, max(clicked_at) AS last_click
    FROM public.referral_clicks GROUP BY partner_id
  ) c ON c.partner_id = p.id
  LEFT JOIN (
    SELECT partner_id,
      count(*) AS order_count,
      count(*) FILTER (WHERE status = 'PAID') AS paid_order_count,
      sum(COALESCE(order_amount, 0)) AS total_order_amount,
      sum(CASE WHEN status = 'PENDING' THEN commission_amount ELSE 0 END) AS commission_pending,
      sum(CASE WHEN status = 'APPROVED' THEN commission_amount ELSE 0 END) AS commission_approved,
      sum(CASE WHEN status = 'PAID' THEN commission_amount ELSE 0 END) AS commission_paid,
      max(created_at) AS last_conv
    FROM public.referral_conversions GROUP BY partner_id
  ) v ON v.partner_id = p.id
  ORDER BY p.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_referral_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_referral_summary() TO service_role;