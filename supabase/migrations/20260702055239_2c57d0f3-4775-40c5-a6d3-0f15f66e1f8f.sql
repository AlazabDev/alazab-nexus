
-- Add missing product columns used by public catalog
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS main_image_url text,
  ADD COLUMN IF NOT EXISTS image_url_2 text,
  ADD COLUMN IF NOT EXISTS image_url_3 text,
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS daftra_id text,
  ADD COLUMN IF NOT EXISTS unit_label text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_active_status ON public.products(active, status);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_az_code_lookup ON public.products(az_code);

-- Public read-only access for the public catalog (only active items, no cost data via column-safe views/queries)
GRANT SELECT ON public.products TO anon;

DROP POLICY IF EXISTS "public read active products" ON public.products;
CREATE POLICY "public read active products"
  ON public.products FOR SELECT
  TO anon
  USING (active = true);
