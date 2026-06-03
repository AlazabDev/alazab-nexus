
-- Add missing columns referenced by app code

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS customer_response TEXT,
  ADD COLUMN IF NOT EXISTS customer_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE public.chatbot_interactions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE public.manufacturing_orders
  ADD COLUMN IF NOT EXISTS production_notes TEXT,
  ADD COLUMN IF NOT EXISTS quality_notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ;

ALTER TABLE public.ai_optimization_jobs
  ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ;

ALTER TABLE public.ai_optimization_logs
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS content_optimization_score NUMERIC;

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Extend approval_stage enum with 'internal_review'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'approval_stage' AND e.enumlabel = 'internal_review'
  ) THEN
    ALTER TYPE public.approval_stage ADD VALUE 'internal_review';
  END IF;
END $$;

-- Sequence-based number generators
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '.*-', ''), '')::INTEGER), 0) + 1
    INTO n
    FROM public.manufacturing_orders
    WHERE order_number LIKE 'MO-' || to_char(now(), 'YYYYMM') || '-%';
  RETURN 'MO-' || to_char(now(), 'YYYYMM') || '-' || lpad(n::TEXT, 4, '0');
END $$;

CREATE OR REPLACE FUNCTION public.generate_requisition_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(requisition_number, '.*-', ''), '')::INTEGER), 0) + 1
    INTO n
    FROM public.material_requisitions
    WHERE requisition_number LIKE 'MR-' || to_char(now(), 'YYYYMM') || '-%';
  RETURN 'MR-' || to_char(now(), 'YYYYMM') || '-' || lpad(n::TEXT, 4, '0');
END $$;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_requisition_number() TO authenticated, service_role;
