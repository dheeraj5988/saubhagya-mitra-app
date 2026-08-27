ALTER TABLE public.visitor_leads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'New';

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_key ON public.orders (order_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_ward_number_idx ON public.orders (ward_number);
CREATE INDEX IF NOT EXISTS orders_contact_number_idx ON public.orders (contact_number);
CREATE INDEX IF NOT EXISTS orders_ip_address_idx ON public.orders (ip_address);

CREATE INDEX IF NOT EXISTS visitor_leads_visited_at_idx ON public.visitor_leads (visited_at DESC);
CREATE INDEX IF NOT EXISTS visitor_leads_status_idx ON public.visitor_leads (status);
CREATE INDEX IF NOT EXISTS visitor_leads_phone_idx ON public.visitor_leads (phone);
CREATE INDEX IF NOT EXISTS visitor_leads_ip_address_idx ON public.visitor_leads (ip_address);

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.visitor_leads REPLICA IDENTITY FULL;