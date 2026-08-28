ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.orders ALTER COLUMN payment_status DROP DEFAULT;

UPDATE public.orders SET payment_status = CASE
  WHEN payment_status IN ('Payment Screenshot Received','VERIFICATION_PENDING') THEN 'VERIFICATION_PENDING'
  WHEN payment_status IN ('Payment Verified','PAID_VERIFIED') THEN 'PAID_VERIFIED'
  WHEN payment_status IN ('Payment Rejected','SUSPICIOUS') THEN 'SUSPICIOUS'
  WHEN payment_status = 'MANUAL_APPROVED' THEN 'MANUAL_APPROVED'
  ELSE 'UNPAID'
END;

ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'UNPAID';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('UNPAID','VERIFICATION_PENDING','PAID_VERIFIED','SUSPICIOUS','MANUAL_APPROVED'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('MANUAL_QR','PAYPUR_GATEWAY'));