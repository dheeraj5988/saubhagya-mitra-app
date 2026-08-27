-- Complete, exact ward list for the admin filter. Previously the UI derived
-- wards from a 2000-row order sample, which silently dropped wards once the
-- table grew beyond that. This computes DISTINCT across the whole table.
CREATE OR REPLACE FUNCTION public.admin_distinct_wards()
RETURNS TABLE (ward_number text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT o.ward_number
  FROM public.orders o
  WHERE o.ward_number IS NOT NULL
    AND btrim(o.ward_number) <> ''
  ORDER BY 1;
$$;

-- Least privilege: this is only ever called through the session-validated
-- service-role admin server functions. No browser role may execute it.
REVOKE ALL ON FUNCTION public.admin_distinct_wards() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_distinct_wards() FROM anon;
REVOKE ALL ON FUNCTION public.admin_distinct_wards() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_distinct_wards() TO service_role;

-- Supports the DISTINCT scan and the ward equality filter.
CREATE INDEX IF NOT EXISTS orders_ward_number_idx ON public.orders (ward_number);