DELETE FROM public.orders WHERE contact_number = '9876543210';
DELETE FROM public.visitor_leads WHERE phone = '9876543210' OR phone IS NULL;
DELETE FROM public.geo_districts WHERE name IN ('Ajmer','Dist1','Dist2','अजमेर');