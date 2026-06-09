
-- 1. api_consumers: drop overly broad SELECT; admins already covered by ALL policy
DROP POLICY IF EXISTS "auth read api_consumers" ON public.api_consumers;

-- 2. quote_requests: restrict reads to editor/admin to hide cost breakdown from viewers
DROP POLICY IF EXISTS "auth read quote_requests" ON public.quote_requests;
CREATE POLICY "ed read quote_requests" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. suppliers: revoke webhook_secret column access from regular roles
REVOKE SELECT (webhook_secret) ON public.suppliers FROM authenticated;
REVOKE SELECT (webhook_secret) ON public.suppliers FROM anon;

-- 4. image-prod storage bucket: admin-only policies
DROP POLICY IF EXISTS "admin manage image-prod" ON storage.objects;
CREATE POLICY "admin manage image-prod" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'image-prod' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'image-prod' AND has_role(auth.uid(), 'admin'::app_role));
