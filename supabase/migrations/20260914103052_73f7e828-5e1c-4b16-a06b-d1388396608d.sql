REVOKE ALL ON FUNCTION public.sync_referral_conversion_on_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_referral_conversion_on_payment() TO service_role;