CREATE TABLE public.blocked_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('IP', 'PHONE')),
  value text NOT NULL UNIQUE,
  reason text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.blocked_entities TO service_role;
ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
