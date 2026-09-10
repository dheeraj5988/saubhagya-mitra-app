REVOKE EXECUTE ON FUNCTION public.admin_revenue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue() TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_distinct_wards() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_distinct_wards() TO service_role;