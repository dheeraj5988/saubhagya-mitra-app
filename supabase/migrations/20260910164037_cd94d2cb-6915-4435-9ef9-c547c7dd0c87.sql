DROP TABLE IF EXISTS public.payment_settings;
DROP TABLE IF EXISTS public.payment_secrets;
ALTER TABLE public.orders DROP COLUMN IF EXISTS payment_screenshot_path;