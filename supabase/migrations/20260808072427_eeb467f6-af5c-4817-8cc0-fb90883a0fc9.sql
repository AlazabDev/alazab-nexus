-- Catalogs table: business/public product collections
CREATE TABLE public.product_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  cover_image_url text,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_catalogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_catalogs TO authenticated;
GRANT ALL ON public.product_catalogs TO service_role;

ALTER TABLE public.product_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active catalogs"
  ON public.product_catalogs
  FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Authenticated read catalogs"
  ON public.product_catalogs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manage catalogs"
  ON public.product_catalogs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Catalog items: link products to catalogs
CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, product_id)
);

GRANT SELECT ON public.catalog_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read catalog items for public catalogs"
  ON public.catalog_items
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.product_catalogs c
    WHERE c.id = catalog_id AND c.is_public = true
  ));

CREATE POLICY "Authenticated read catalog items"
  ON public.catalog_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin manage catalog items"
  ON public.catalog_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read policy for approved products (enables anonymous catalog browsing)
CREATE POLICY "Public read approved products"
  ON public.products
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- Safe public catalog view
CREATE OR REPLACE VIEW public.public_catalog_products AS
SELECT
  id, az_code, product_code, egs_code,
  name_ar, name_en, short_description_ar, short_description_en,
  description_ar, description_en, marketing_content, technical_content,
  installation_notes, maintenance_notes, warranty_info,
  brand, item_type, category_id, family_id, unit_id,
  gpc_class, gpc_family, gpc_segment, gpc_brick_title, operational_track,
  unit_price, estimated_price, price, buy_price,
  main_image_url, image_url_2, image_url_3,
  specifications, materials, stock_balance, track_stock,
  status, created_at, updated_at
FROM public.products
WHERE status = 'approved';

GRANT SELECT ON public.public_catalog_products TO anon;
GRANT SELECT ON public.public_catalog_products TO authenticated;
GRANT ALL ON public.public_catalog_products TO service_role;

-- Updated-at trigger for new tables
CREATE TRIGGER product_catalogs_set_updated_at
  BEFORE UPDATE ON public.product_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER catalog_items_set_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Indexes for common lookups
CREATE INDEX idx_product_catalogs_slug ON public.product_catalogs(slug);
CREATE INDEX idx_product_catalogs_public ON public.product_catalogs(is_public, sort_order);
CREATE INDEX idx_catalog_items_catalog ON public.catalog_items(catalog_id, sort_order);
CREATE INDEX idx_catalog_items_product ON public.catalog_items(product_id);
