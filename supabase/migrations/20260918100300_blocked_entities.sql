CREATE TABLE public.blocked_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE,
  phone text UNIQUE,
  reason text,
  unpaid_orders_count integer DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.blocked_entities TO service_role;
ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
