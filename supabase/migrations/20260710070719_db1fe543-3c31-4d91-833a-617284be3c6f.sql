
-- Restrict anonymous access to only safe, public-facing columns via a view.
DROP POLICY IF EXISTS "public read active products" ON public.products;

CREATE OR REPLACE VIEW public.public_products
WITH (security_invoker = true) AS
SELECT
  id, az_code, product_code, egs_code, daftra_id,
  name_ar, name_en, short_description_ar, short_description_en,
  description_ar, description_en, marketing_content, technical_content, warranty_info,
  brand, item_type, unit_label, category,
  gpc_class, gpc_family, gpc_segment, gpc_brick_title,
  operational_track, tags,
  unit_price, estimated_price,
  main_image_url, image_url_2, image_url_3,
  status, active,
  created_at, updated_at
FROM public.products
WHERE active = true;

-- Re-add a minimal SELECT policy on products for anon, but only when reading via the view
-- (the view runs with invoker rights; anon still needs SELECT on the base table columns exposed).
CREATE POLICY "public read active products (view only)" ON public.products
  FOR SELECT TO anon
  USING (active = true);

-- Since anon can still SELECT the base table directly, revoke direct table access
-- and only grant SELECT on the safe columns needed by the view.
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, az_code, product_code, egs_code, daftra_id,
  name_ar, name_en, short_description_ar, short_description_en,
  description_ar, description_en, marketing_content, technical_content, warranty_info,
  brand, item_type, unit_label, category,
  gpc_class, gpc_family, gpc_segment, gpc_brick_title,
  operational_track, tags,
  unit_price, estimated_price,
  main_image_url, image_url_2, image_url_3,
  status, active,
  created_at, updated_at
) ON public.products TO anon;

GRANT SELECT ON public.public_products TO anon, authenticated;
