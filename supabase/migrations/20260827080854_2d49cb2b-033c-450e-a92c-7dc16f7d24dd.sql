
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  candidate_name_hindi text NOT NULL,
  candidate_name_english text NOT NULL,
  contact_number text NOT NULL,
  district text NOT NULL,
  panchayat_samiti text NOT NULL,
  gram_panchayat text NOT NULL,
  ward_number text NOT NULL,
  election_symbol text NOT NULL,
  slogan text,
  photo_path text,
  ip_address text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In-Process','Completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.visitor_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  phone text,
  lead_type text NOT NULL DEFAULT 'visit' CHECK (lead_type IN ('visit','abandoned','submitted')),
  order_id text,
  visited_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visitor_leads_ip_idx ON public.visitor_leads (ip_address);
CREATE INDEX visitor_leads_phone_idx ON public.visitor_leads (phone);

CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.visitor_leads TO service_role;
GRANT ALL ON public.admin_sessions TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can upload candidate photos"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'candidate-photos');
