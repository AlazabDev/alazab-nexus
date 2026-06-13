
-- =========================================================
-- Add 13 missing tables referenced by the app code
-- =========================================================

-- 1) product_requests
CREATE TABLE IF NOT EXISTS public.product_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  request_type TEXT NOT NULL DEFAULT 'new_product',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT,
  quantity INTEGER,
  estimated_budget NUMERIC,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_requests TO authenticated;
GRANT ALL ON public.product_requests TO service_role;
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read product_requests" ON public.product_requests;
CREATE POLICY "auth read product_requests" ON public.product_requests FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins product_requests" ON public.product_requests;
CREATE POLICY "ed ins product_requests" ON public.product_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd product_requests" ON public.product_requests;
CREATE POLICY "ed upd product_requests" ON public.product_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del product_requests" ON public.product_requests;
CREATE POLICY "adm del product_requests" ON public.product_requests FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER product_requests_set_updated_at BEFORE UPDATE ON public.product_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) pricing_rules
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  rule_type TEXT NOT NULL,
  value NUMERIC,
  conditions JSONB DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pricing_rules" ON public.pricing_rules;
CREATE POLICY "auth read pricing_rules" ON public.pricing_rules FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins pricing_rules" ON public.pricing_rules;
CREATE POLICY "ed ins pricing_rules" ON public.pricing_rules FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd pricing_rules" ON public.pricing_rules;
CREATE POLICY "ed upd pricing_rules" ON public.pricing_rules FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del pricing_rules" ON public.pricing_rules;
CREATE POLICY "adm del pricing_rules" ON public.pricing_rules FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 3) integration_configs
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_configs TO authenticated;
GRANT ALL ON public.integration_configs TO service_role;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read integration_configs" ON public.integration_configs;
CREATE POLICY "auth read integration_configs" ON public.integration_configs FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins integration_configs" ON public.integration_configs;
CREATE POLICY "ed ins integration_configs" ON public.integration_configs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd integration_configs" ON public.integration_configs;
CREATE POLICY "ed upd integration_configs" ON public.integration_configs FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del integration_configs" ON public.integration_configs;
CREATE POLICY "adm del integration_configs" ON public.integration_configs FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 4) quote_requests
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT,
  chatbot_session_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  design_file_url TEXT,
  design_file_type TEXT,
  design_data JSONB,
  design_preview_url TEXT,
  dimensions JSONB,
  materials JSONB,
  components JSONB,
  finishes JSONB,
  accessories JSONB,
  pricing_breakdown JSONB,
  materials_cost NUMERIC,
  labor_cost NUMERIC,
  overhead_cost NUMERIC,
  profit_margin NUMERIC,
  total_cost NUMERIC,
  selling_price NUMERIC,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending',
  quoted_at TIMESTAMPTZ,
  quote_valid_until TIMESTAMPTZ,
  customer_notes TEXT,
  special_requirements JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read quote_requests" ON public.quote_requests;
CREATE POLICY "auth read quote_requests" ON public.quote_requests FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins quote_requests" ON public.quote_requests;
CREATE POLICY "ed ins quote_requests" ON public.quote_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd quote_requests" ON public.quote_requests;
CREATE POLICY "ed upd quote_requests" ON public.quote_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del quote_requests" ON public.quote_requests;
CREATE POLICY "adm del quote_requests" ON public.quote_requests FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 5) manufacturing_orders
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  approval_id UUID,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  design_data JSONB,
  specifications JSONB,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC,
  discount_amount NUMERIC DEFAULT 0,
  final_price NUMERIC,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  payment_status TEXT DEFAULT 'unpaid',
  amount_paid NUMERIC DEFAULT 0,
  estimated_start_date TIMESTAMPTZ,
  estimated_completion_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manufacturing_orders TO authenticated;
GRANT ALL ON public.manufacturing_orders TO service_role;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read manufacturing_orders" ON public.manufacturing_orders;
CREATE POLICY "auth read manufacturing_orders" ON public.manufacturing_orders FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins manufacturing_orders" ON public.manufacturing_orders;
CREATE POLICY "ed ins manufacturing_orders" ON public.manufacturing_orders FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd manufacturing_orders" ON public.manufacturing_orders;
CREATE POLICY "ed upd manufacturing_orders" ON public.manufacturing_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del manufacturing_orders" ON public.manufacturing_orders;
CREATE POLICY "adm del manufacturing_orders" ON public.manufacturing_orders FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 6) material_requisitions
CREATE TABLE IF NOT EXISTS public.material_requisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_number TEXT NOT NULL,
  manufacturing_order_id UUID REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
  approval_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_requisitions TO authenticated;
GRANT ALL ON public.material_requisitions TO service_role;
ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read material_requisitions" ON public.material_requisitions;
CREATE POLICY "auth read material_requisitions" ON public.material_requisitions FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins material_requisitions" ON public.material_requisitions;
CREATE POLICY "ed ins material_requisitions" ON public.material_requisitions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd material_requisitions" ON public.material_requisitions;
CREATE POLICY "ed upd material_requisitions" ON public.material_requisitions FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del material_requisitions" ON public.material_requisitions;
CREATE POLICY "adm del material_requisitions" ON public.material_requisitions FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 7) material_requisition_items
CREATE TABLE IF NOT EXISTS public.material_requisition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID NOT NULL REFERENCES public.material_requisitions(id) ON DELETE CASCADE,
  product_id UUID,
  product_code TEXT,
  product_name TEXT,
  requested_quantity NUMERIC,
  unit TEXT,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  supplier_id UUID,
  supplier_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_requisition_items TO authenticated;
GRANT ALL ON public.material_requisition_items TO service_role;
ALTER TABLE public.material_requisition_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read material_requisition_items" ON public.material_requisition_items;
CREATE POLICY "auth read material_requisition_items" ON public.material_requisition_items FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins material_requisition_items" ON public.material_requisition_items;
CREATE POLICY "ed ins material_requisition_items" ON public.material_requisition_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd material_requisition_items" ON public.material_requisition_items;
CREATE POLICY "ed upd material_requisition_items" ON public.material_requisition_items FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del material_requisition_items" ON public.material_requisition_items;
CREATE POLICY "adm del material_requisition_items" ON public.material_requisition_items FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 8) chatbot_interactions
CREATE TABLE IF NOT EXISTS public.chatbot_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  manufacturing_order_id UUID REFERENCES public.manufacturing_orders(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL,
  direction TEXT,
  payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_interactions TO authenticated;
GRANT ALL ON public.chatbot_interactions TO service_role;
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read chatbot_interactions" ON public.chatbot_interactions;
CREATE POLICY "auth read chatbot_interactions" ON public.chatbot_interactions FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "sys ins chatbot_interactions" ON public.chatbot_interactions;
CREATE POLICY "sys ins chatbot_interactions" ON public.chatbot_interactions FOR INSERT TO authenticated WITH CHECK (true);

-- 9) ai_audit_logs
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  status TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_audit_logs TO authenticated;
GRANT ALL ON public.ai_audit_logs TO service_role;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read ai_audit_logs" ON public.ai_audit_logs;
CREATE POLICY "auth read ai_audit_logs" ON public.ai_audit_logs FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "sys ins ai_audit_logs" ON public.ai_audit_logs;
CREATE POLICY "sys ins ai_audit_logs" ON public.ai_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 10) ai_optimization_jobs
CREATE TABLE IF NOT EXISTS public.ai_optimization_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  consumer_id UUID,
  optimization_type TEXT,
  optimization_level TEXT,
  product_ids JSONB DEFAULT '[]'::jsonb,
  total_products INTEGER DEFAULT 0,
  processed_products INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  progress_percent INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_optimization_jobs TO authenticated;
GRANT ALL ON public.ai_optimization_jobs TO service_role;
ALTER TABLE public.ai_optimization_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read ai_optimization_jobs" ON public.ai_optimization_jobs;
CREATE POLICY "auth read ai_optimization_jobs" ON public.ai_optimization_jobs FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "sys ins ai_optimization_jobs" ON public.ai_optimization_jobs;
CREATE POLICY "sys ins ai_optimization_jobs" ON public.ai_optimization_jobs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ed upd ai_optimization_jobs" ON public.ai_optimization_jobs;
CREATE POLICY "ed upd ai_optimization_jobs" ON public.ai_optimization_jobs FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));

-- 11) ai_optimization_logs
CREATE TABLE IF NOT EXISTS public.ai_optimization_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  product_id UUID,
  optimization_type TEXT,
  status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_optimization_logs TO authenticated;
GRANT ALL ON public.ai_optimization_logs TO service_role;
ALTER TABLE public.ai_optimization_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read ai_optimization_logs" ON public.ai_optimization_logs;
CREATE POLICY "auth read ai_optimization_logs" ON public.ai_optimization_logs FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "sys ins ai_optimization_logs" ON public.ai_optimization_logs;
CREATE POLICY "sys ins ai_optimization_logs" ON public.ai_optimization_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 12) product_datasheets
CREATE TABLE IF NOT EXISTS public.product_datasheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  content JSONB,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  language TEXT DEFAULT 'en',
  format TEXT DEFAULT 'pdf',
  generator_model TEXT,
  generated_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_datasheets TO authenticated;
GRANT ALL ON public.product_datasheets TO service_role;
ALTER TABLE public.product_datasheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read product_datasheets" ON public.product_datasheets;
CREATE POLICY "auth read product_datasheets" ON public.product_datasheets FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "ed ins product_datasheets" ON public.product_datasheets;
CREATE POLICY "ed ins product_datasheets" ON public.product_datasheets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ed upd product_datasheets" ON public.product_datasheets;
CREATE POLICY "ed upd product_datasheets" ON public.product_datasheets FOR UPDATE TO authenticated USING (has_role(auth.uid(),'editor') OR has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "adm del product_datasheets" ON public.product_datasheets;
CREATE POLICY "adm del product_datasheets" ON public.product_datasheets FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 13) api_quotes
CREATE TABLE IF NOT EXISTS public.api_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID,
  quote_request_data JSONB,
  generated_quote JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_by TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  api_endpoint TEXT,
  quote_token TEXT,
  consumer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.api_quotes TO authenticated;
GRANT ALL ON public.api_quotes TO service_role;
ALTER TABLE public.api_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read api_quotes" ON public.api_quotes;
CREATE POLICY "auth read api_quotes" ON public.api_quotes FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
DROP POLICY IF EXISTS "sys ins api_quotes" ON public.api_quotes;
CREATE POLICY "sys ins api_quotes" ON public.api_quotes FOR INSERT TO authenticated WITH CHECK (true);

-- Add a few referenced product columns to avoid downstream type errors
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS specifications JSONB,
  ADD COLUMN IF NOT EXISTS materials JSONB,
  ADD COLUMN IF NOT EXISTS price NUMERIC,
  ADD COLUMN IF NOT EXISTS datasheet_generated BOOLEAN DEFAULT false;

-- updated_at triggers for the rest
CREATE TRIGGER pricing_rules_set_updated_at BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER integration_configs_set_updated_at BEFORE UPDATE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quote_requests_set_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER manufacturing_orders_set_updated_at BEFORE UPDATE ON public.manufacturing_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER material_requisitions_set_updated_at BEFORE UPDATE ON public.material_requisitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ai_optimization_jobs_set_updated_at BEFORE UPDATE ON public.ai_optimization_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER product_datasheets_set_updated_at BEFORE UPDATE ON public.product_datasheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
