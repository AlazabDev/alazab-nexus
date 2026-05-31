-- ============================================================
-- AI-Powered Product Optimization System
-- Creates tables for AI content optimization, datasheets, images, and quotes
-- ============================================================

-- ----------------------------------------------------------------
-- 1. ai_settings - Optimization preferences per product
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  optimization_level    TEXT NOT NULL DEFAULT 'standard',  -- basic|standard|premium
  content_sources       JSONB DEFAULT '{"enabled": ["ai", "user"], "languages": ["ar", "en"]}',
  image_fetch_enabled   BOOLEAN DEFAULT true,
  datasheet_enabled     BOOLEAN DEFAULT true,
  quote_auto_generation BOOLEAN DEFAULT false,
  last_optimization_at  TIMESTAMPTZ,
  optimization_count    INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read ai_settings" ON public.ai_settings
  FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "ed ins ai_settings" ON public.ai_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ed upd ai_settings" ON public.ai_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "adm del ai_settings" ON public.ai_settings
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_settings_updated
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ai_settings_product ON public.ai_settings(product_id);

-- ----------------------------------------------------------------
-- 2. product_datasheets - Generated datasheets for products
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_datasheets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content               JSONB NOT NULL,  -- { technical_specs, dimensions, materials, certifications, performance_data, usage_guidelines, safety_info }
  file_url              TEXT,  -- PDF storage URL
  file_storage_path     TEXT,  -- Supabase Storage path
  generated_at          TIMESTAMPTZ,
  generator_model       TEXT DEFAULT 'google/gemini-2.5-flash',
  status                TEXT NOT NULL DEFAULT 'draft',  -- draft|generated|exported|archived
  version               INTEGER DEFAULT 1,
  language              TEXT DEFAULT 'en',  -- en|ar|multilingual
  format                TEXT DEFAULT 'json',  -- json|pdf|html
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_datasheets TO authenticated;
GRANT ALL ON public.product_datasheets TO service_role;
ALTER TABLE public.product_datasheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read product_datasheets" ON public.product_datasheets
  FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "ed ins product_datasheets" ON public.product_datasheets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ed upd product_datasheets" ON public.product_datasheets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "adm del product_datasheets" ON public.product_datasheets
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_datasheets_updated
  BEFORE UPDATE ON public.product_datasheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_product_datasheets_product ON public.product_datasheets(product_id);
CREATE INDEX idx_product_datasheets_status ON public.product_datasheets(status);
CREATE INDEX idx_product_datasheets_created ON public.product_datasheets(created_at);

-- ----------------------------------------------------------------
-- 3. product_images_ai - Enhanced image management with AI metadata
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images_ai (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url             TEXT NOT NULL,
  image_storage_path    TEXT,  -- Supabase Storage path
  image_source          TEXT NOT NULL DEFAULT 'user_uploaded',  -- ai_generated|api_fetched|user_uploaded|supplier|generated
  image_type            TEXT DEFAULT 'product_photo',  -- product_photo|lifestyle|technical|3d_render|specification|packaging
  processing_status     TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|processed|approved|rejected
  ai_analysis           JSONB,  -- { objects_detected, color_analysis, quality_score, background_info, composition }
  ai_confidence_score   NUMERIC DEFAULT 0,  -- 0-100
  match_notes           TEXT,
  metadata              JSONB DEFAULT '{}',
  source_api            TEXT,  -- unsplash|pexels|custom|user
  external_id           TEXT,  -- ID from external source
  is_primary            BOOLEAN DEFAULT false,
  sort_order            INTEGER,
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images_ai TO authenticated;
GRANT ALL ON public.product_images_ai TO service_role;
ALTER TABLE public.product_images_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read product_images_ai" ON public.product_images_ai
  FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "ed ins product_images_ai" ON public.product_images_ai
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ed upd product_images_ai" ON public.product_images_ai
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "adm del product_images_ai" ON public.product_images_ai
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_product_images_ai_updated
  BEFORE UPDATE ON public.product_images_ai
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_product_images_ai_product ON public.product_images_ai(product_id);
CREATE INDEX idx_product_images_ai_status ON public.product_images_ai(processing_status);
CREATE INDEX idx_product_images_ai_primary ON public.product_images_ai(product_id, is_primary);

-- ----------------------------------------------------------------
-- 4. api_quotes - Auto-generated quotes from API requests
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_quotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_id           UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quote_request_data    JSONB NOT NULL,  -- { products: [], quantities: {}, customer_info: {}, metadata: {} }
  generated_quote       JSONB NOT NULL,  -- { items: [], quantities: {}, unit_price, total_price, currency, validity_period, terms_conditions }
  status                TEXT NOT NULL DEFAULT 'draft',  -- draft|pending_review|approved|sent|rejected|expired
  generated_by          TEXT DEFAULT 'google/gemini-2.5-flash',
  generated_at          TIMESTAMPTZ,
  api_endpoint          TEXT,  -- source API endpoint
  api_key_id            UUID,  -- reference to API key used
  quote_token           TEXT UNIQUE,  -- secure token for external access
  validity_days         INTEGER DEFAULT 30,
  quote_notes           TEXT,
  internal_notes        TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_quotes TO authenticated;
GRANT ALL ON public.api_quotes TO service_role;
ALTER TABLE public.api_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read api_quotes" ON public.api_quotes
  FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "ed ins api_quotes" ON public.api_quotes
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ed upd api_quotes" ON public.api_quotes
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "public read api_quotes_by_token" ON public.api_quotes
  FOR SELECT USING (quote_token IS NOT NULL);

CREATE TRIGGER trg_api_quotes_updated
  BEFORE UPDATE ON public.api_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_api_quotes_product ON public.api_quotes(product_id);
CREATE INDEX idx_api_quotes_supplier ON public.api_quotes(supplier_id);
CREATE INDEX idx_api_quotes_token ON public.api_quotes(quote_token);
CREATE INDEX idx_api_quotes_status ON public.api_quotes(status);
CREATE INDEX idx_api_quotes_created ON public.api_quotes(created_at);

-- ----------------------------------------------------------------
-- 5. ai_optimization_jobs - Track batch optimization tasks
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_optimization_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                TEXT UNIQUE NOT NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  optimization_type     TEXT NOT NULL,  -- content|datasheet|images|all
  optimization_level    TEXT DEFAULT 'standard',  -- basic|standard|premium
  product_ids           UUID[] NOT NULL,
  total_products        INTEGER NOT NULL,
  processed_count       INTEGER DEFAULT 0,
  success_count         INTEGER DEFAULT 0,
  failed_count          INTEGER DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'queued',  -- queued|processing|completed|failed|cancelled
  progress_percent      INTEGER DEFAULT 0,
  errors                JSONB DEFAULT '[]',
  results               JSONB DEFAULT '{}',
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  estimated_completion  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_optimization_jobs TO authenticated;
GRANT ALL ON public.ai_optimization_jobs TO service_role;
ALTER TABLE public.ai_optimization_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read own ai_optimization_jobs" ON public.ai_optimization_jobs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "auth ins ai_optimization_jobs" ON public.ai_optimization_jobs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth upd own ai_optimization_jobs" ON public.ai_optimization_jobs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_optimization_jobs_updated
  BEFORE UPDATE ON public.ai_optimization_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ai_optimization_jobs_user ON public.ai_optimization_jobs(user_id);
CREATE INDEX idx_ai_optimization_jobs_status ON public.ai_optimization_jobs(status);
CREATE INDEX idx_ai_optimization_jobs_created ON public.ai_optimization_jobs(created_at);

-- ----------------------------------------------------------------
-- 6. Extend products table with AI optimization columns
-- ----------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS content_optimization_score NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_match_score NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS datasheet_generated BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ai_optimization_applied_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS optimization_notes TEXT;

-- ----------------------------------------------------------------
-- 7. Audit logging for AI operations
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID,
  action                TEXT NOT NULL,  -- optimize_content|generate_datasheet|fetch_images|generate_quote
  entity_type           TEXT NOT NULL,  -- product|datasheet|image|quote
  entity_id             UUID,
  details               JSONB DEFAULT '{}',
  status                TEXT DEFAULT 'success',  -- success|error|warning
  error_message         TEXT,
  duration_ms           INTEGER,
  api_calls_count       INTEGER,
  cost_estimate         NUMERIC,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_audit_logs TO authenticated;
GRANT ALL ON public.ai_audit_logs TO service_role;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read ai_audit_logs" ON public.ai_audit_logs
  FOR SELECT TO authenticated USING (is_authorized(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ins ai_audit_logs" ON public.ai_audit_logs
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

CREATE INDEX idx_ai_audit_logs_user ON public.ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_logs_entity ON public.ai_audit_logs(entity_type, entity_id);
CREATE INDEX idx_ai_audit_logs_action ON public.ai_audit_logs(action);
CREATE INDEX idx_ai_audit_logs_created ON public.ai_audit_logs(created_at);
