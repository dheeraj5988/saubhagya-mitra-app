-- Create workers table
CREATE TABLE public.workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    token_hash text NOT NULL,
    active boolean DEFAULT true,
    paused boolean DEFAULT false,
    last_seen_at timestamptz DEFAULT now(),
    current_order_id uuid, -- Foreign key will be added later if needed, or left open to prevent strict locks
    jobs_done integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Alter orders table
ALTER TABLE public.orders 
ADD COLUMN processing_status text DEFAULT 'new' CHECK (processing_status IN ('new', 'queued', 'processing', 'ready', 'delivered', 'failed')),
ADD COLUMN assigned_worker_id uuid REFERENCES public.workers(id),
ADD COLUMN output_files jsonb;

-- Create RPC function to claim next order using SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_next_order(p_worker uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
BEGIN
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE processing_status = 'queued'
    AND payment_status = 'PAID'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
        UPDATE public.orders
        SET processing_status = 'processing',
            assigned_worker_id = p_worker
        WHERE id = v_order_id;
        
        UPDATE public.workers
        SET current_order_id = v_order_id
        WHERE id = p_worker;
    END IF;

    RETURN v_order_id;
END;
$$;

-- Create Trigger to auto-queue PAID orders
CREATE OR REPLACE FUNCTION public.auto_queue_paid_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.payment_status = 'PAID' AND OLD.payment_status != 'PAID' AND NEW.processing_status = 'new' THEN
        NEW.processing_status := 'queued';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_queue_paid_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_queue_paid_orders();

-- Set RLS policies
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
-- For now, service role handles workers table, no public access
CREATE POLICY "Service Role Full Access Workers" ON public.workers USING (true) WITH CHECK (true);
