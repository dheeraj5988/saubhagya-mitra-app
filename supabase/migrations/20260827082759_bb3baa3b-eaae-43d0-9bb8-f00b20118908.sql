-- 1. Brute-force protection for the shared admin password
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL UNIQUE,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only: no anon/authenticated grants (deny-by-default).
GRANT ALL ON public.admin_login_attempts TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_login_attempts_locked_until_idx
  ON public.admin_login_attempts (locked_until);

-- 2. Session expiry lookups / cleanup
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx
  ON public.admin_sessions (expires_at);

-- 3. Storage least privilege: replace the broad public upload policy
DROP POLICY IF EXISTS "public can upload candidate photos" ON storage.objects;

CREATE POLICY "public can upload candidate photos to orders prefix"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND (storage.foldername(name))[1] = 'orders'
  AND array_length(storage.foldername(name), 1) = 1
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png')
);

-- No SELECT / UPDATE / DELETE policies for anon or authenticated on
-- storage.objects for this bucket: reads happen only via short-lived signed
-- URLs minted by the service role after an admin session is validated.
