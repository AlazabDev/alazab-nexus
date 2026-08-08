CREATE OR REPLACE VIEW public.public_catalog_products
WITH (security_invoker = true)
AS
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
