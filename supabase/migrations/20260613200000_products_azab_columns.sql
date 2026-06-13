-- ============================================================
-- Migration: إضافة أعمدة الكتالوج الكاملة لجدول products
-- يُضاف فوق الـ migrations الموجودة بدون كسرها
-- ============================================================

-- أعمدة GPC المفقودة
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gpc_segment       TEXT,
  ADD COLUMN IF NOT EXISTS sector_ar         TEXT;

-- أعمدة الصور من S3
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS main_image_url    TEXT,
  ADD COLUMN IF NOT EXISTS image_url_2       TEXT,
  ADD COLUMN IF NOT EXISTS image_url_3       TEXT,
  ADD COLUMN IF NOT EXISTS images_count      INT DEFAULT 0;

-- أعمدة المسار التشغيلي والبراند
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS operational_track TEXT,
  ADD COLUMN IF NOT EXISTS brand             TEXT;  -- luxury_finishing | brand_identity | uberfix | laban_alasfour

-- أعمدة دفترة
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS daftra_id         TEXT,
  ADD COLUMN IF NOT EXISTS daftra_code       TEXT,
  ADD COLUMN IF NOT EXISTS egs_code          TEXT;

-- أعمدة التسعير المباشر
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_price        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS buy_price         NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS estimated_price   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS price_confidence  TEXT,
  ADD COLUMN IF NOT EXISTS price_source      TEXT;

-- أعمدة المخزون
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_stock       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_balance     NUMERIC(14,3);

-- أعمدة الحوكمة
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS confidence_level  TEXT,
  ADD COLUMN IF NOT EXISTS sync_status       JSONB DEFAULT '{"daftra":"pending","erpnext":"pending","uberfix":"pending","meta":"pending"}'::jsonb;

-- Indexes جديدة
CREATE INDEX IF NOT EXISTS idx_products_daftra_id      ON public.products(daftra_id)      WHERE daftra_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_egs_code       ON public.products(egs_code)       WHERE egs_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand          ON public.products(brand)          WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_operational    ON public.products(operational_track) WHERE operational_track IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_name_en_trgm   ON public.products USING gin(name_en gin_trgm_ops) WHERE name_en IS NOT NULL;

-- Seed: الفئات الأساسية الأربعة
INSERT INTO public.categories (name_ar, name_en, code) VALUES
  ('Luxury Finishing', 'Luxury Finishing', 'LUXURY'),
  ('UberFix',          'UberFix',          'UBERFIX'),
  ('Brand Identity',   'Brand Identity',   'BRAND'),
  ('Laban Alasfour',   'Laban Alasfour',   'LABAN')
ON CONFLICT (code) DO NOTHING;

-- Seed: وحدات القياس الأساسية
INSERT INTO public.units (name, code) VALUES
  ('قطعة',  'piece'),
  ('متر',   'meter'),
  ('م²',    'sqm'),
  ('كجم',   'kg'),
  ('لتر',   'liter'),
  ('خدمة',  'service'),
  ('علبة',  'box'),
  ('لفة',   'roll')
ON CONFLICT (code) DO NOTHING;
