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
