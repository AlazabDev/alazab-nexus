
-- Supplier webhook secret + sync logs
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS webhook_secret text,
  ADD COLUMN IF NOT EXISTS webhook_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.supplier_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  records_processed integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  payload jsonb,
  error_message text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.supplier_sync_logs TO authenticated;
GRANT ALL ON public.supplier_sync_logs TO service_role;

ALTER TABLE public.supplier_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read supplier_sync_logs" ON public.supplier_sync_logs
  FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));

CREATE POLICY "system insert supplier_sync_logs" ON public.supplier_sync_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_supplier_sync_logs_supplier ON public.supplier_sync_logs(supplier_id, created_at DESC);
