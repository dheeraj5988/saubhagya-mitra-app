-- ============================================================================
-- 20260926100000_repair_orders_pipeline.sql
-- Idempotent repair migration for Saubhagya Orders Pipeline, Workers, and Gateways
-- ============================================================================

-- 1. Workers table & security
CREATE TABLE IF NOT EXISTS public.workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    token_hash text NOT NULL,
    active boolean DEFAULT true,
    paused boolean DEFAULT false,
    last_seen_at timestamptz DEFAULT now(),
    current_order_id uuid,
    jobs_done integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service Role Full Access Workers" ON public.workers;
REVOKE ALL ON public.workers FROM anon, authenticated;
GRANT ALL ON public.workers TO service_role;

-- 2. Orders missing columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'new';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_worker_id uuid REFERENCES public.workers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS output_files jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS processing_error text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_gateway_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'web_fallback';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS synced_to_pc_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pc_order_no text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hold_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pad text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS booth_ids jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS booth_snapshots jsonb;

-- 3. Relax and update order constraints
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('New','Paid','In Production','Ready','Delivered','Closed','On Hold','Cancelled'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('PHONEPE','CASHFREE','UPI_QR','MANUAL'));

-- Mark existing sample / test orders
UPDATE public.orders
SET source = 'test'
WHERE (is_sample = true OR order_id LIKE '%TEST%' OR candidate_name_hindi LIKE '%परीक्षण%')
  AND (source IS NULL OR source = 'web_fallback');

-- 4. Payment Config & Credentials
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS cashfree_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS cashfree_env text NOT NULL DEFAULT 'TEST';
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS cashfree_app_id text;
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS phonepe_client_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS web_worker_queue_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.payment_credentials ADD COLUMN IF NOT EXISTS cashfree_secret_key text;

-- 5. Payment Events Table
CREATE TABLE IF NOT EXISTS public.payment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    event_type text,
    order_id text,
    payment_gateway_order_id text,
    amount numeric,
    payload jsonb,
    raw_body text,
    verified boolean DEFAULT false,
    consumed_by_pc_at timestamptz,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM anon, authenticated;
GRANT ALL ON public.payment_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_payment_events_pc_pending ON public.payment_events (verified, consumed_by_pc_at);

-- 6. RPC functions: claim_next_order, increment_jobs_done, schema_health
CREATE OR REPLACE FUNCTION public.claim_next_order(p_worker uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order_id uuid;
BEGIN
    -- Stale-job requeue: reset orders processing > 10 min
    UPDATE public.orders
    SET processing_status = 'queued',
        assigned_worker_id = NULL
    WHERE processing_status = 'processing'
      AND processing_started_at < now() - interval '10 minutes'
      AND attempts < 3;

    SELECT id INTO v_order_id
    FROM public.orders
    WHERE processing_status = 'queued'
      AND payment_status = 'PAID'
      AND attempts < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
        UPDATE public.orders
        SET processing_status = 'processing',
            assigned_worker_id = p_worker,
            processing_started_at = now(),
            attempts = COALESCE(attempts, 0) + 1
        WHERE id = v_order_id;
        
        UPDATE public.workers
        SET current_order_id = v_order_id,
            last_seen_at = now()
        WHERE id = p_worker;
    END IF;

    RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_jobs_done(p_worker uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.workers
    SET jobs_done = COALESCE(jobs_done, 0) + 1,
        current_order_id = NULL,
        last_seen_at = now(),
        updated_at = now()
    WHERE id = p_worker;
END;
$$;

-- Rewrite auto_queue_paid_orders to check web_worker_queue_enabled
CREATE OR REPLACE FUNCTION public.auto_queue_paid_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_queue_enabled boolean;
BEGIN
    SELECT COALESCE(web_worker_queue_enabled, false) INTO v_queue_enabled
    FROM public.payment_config
    LIMIT 1;

    IF v_queue_enabled IS TRUE AND NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'PAID') AND NEW.processing_status = 'new' THEN
        NEW.processing_status := 'queued';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_queue_paid_orders ON public.orders;
CREATE TRIGGER trigger_auto_queue_paid_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_queue_paid_orders();

-- Diagnostic RPC: schema_health
CREATE OR REPLACE FUNCTION public.schema_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cols text[];
    v_districts int;
    v_wards int;
    v_orders_total int;
    v_orders_last_24h int;
    v_orders_not_in_pc int;
BEGIN
    SELECT array_agg(column_name::text) INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders';

    SELECT count(*) INTO v_districts FROM public.geo_districts WHERE active = true;
    SELECT count(*) INTO v_wards FROM public.geo_wards WHERE active = true;
    SELECT count(*) INTO v_orders_total FROM public.orders;
    SELECT count(*) INTO v_orders_last_24h FROM public.orders WHERE created_at >= now() - interval '24 hours';
    SELECT count(*) INTO v_orders_not_in_pc FROM public.orders WHERE synced_to_pc_at IS NULL AND (is_sample IS NULL OR is_sample = false);

    RETURN jsonb_build_object(
        'orders_columns', to_jsonb(v_cols),
        'districts', v_districts,
        'wards', v_wards,
        'orders_total', v_orders_total,
        'orders_last_24h', v_orders_last_24h,
        'orders_not_in_pc', v_orders_not_in_pc
    );
END;
$$;

-- 7. Private storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voter-raw-lists', 'voter-raw-lists', false)
ON CONFLICT (id) DO UPDATE SET public = false;
