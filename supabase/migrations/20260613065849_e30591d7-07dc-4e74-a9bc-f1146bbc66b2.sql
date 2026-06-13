
-- 1) Move webhook_secret to admin-only sibling table
CREATE TABLE IF NOT EXISTS public.supplier_secrets (
  supplier_id uuid PRIMARY KEY REFERENCES public.suppliers(id) ON DELETE CASCADE,
  webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.supplier_secrets TO service_role;
ALTER TABLE public.supplier_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manage supplier_secrets" ON public.supplier_secrets;
CREATE POLICY "admin manage supplier_secrets" ON public.supplier_secrets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.supplier_secrets (supplier_id, webhook_secret)
SELECT id, webhook_secret FROM public.suppliers WHERE webhook_secret IS NOT NULL
ON CONFLICT (supplier_id) DO UPDATE SET webhook_secret = EXCLUDED.webhook_secret;

ALTER TABLE public.suppliers DROP COLUMN IF EXISTS webhook_secret;

-- 2) integration_configs: admin-only SELECT (contains API keys)
DROP POLICY IF EXISTS "auth read integration_configs" ON public.integration_configs;
CREATE POLICY "adm read integration_configs" ON public.integration_configs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Fix function search_path
ALTER FUNCTION public.next_az_code(text, text, text) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 4) Lock down SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_authorized(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_requisition_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_az_code(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_authorized(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_requisition_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_az_code(text, text, text) TO authenticated, service_role;

-- 5) Tighten notifications insert: only for self or admins (service_role bypasses RLS)
DROP POLICY IF EXISTS "system insert notifs" ON public.notifications;
CREATE POLICY "insert own notifs" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 6) Restrict listing of product-assets bucket (public URLs still work via CDN)
DROP POLICY IF EXISTS "public read product-assets" ON storage.objects;
CREATE POLICY "auth list product-assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-assets');
