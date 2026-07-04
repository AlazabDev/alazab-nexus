CREATE TABLE IF NOT EXISTS public._catalog_import_staging (
  az_code text PRIMARY KEY,
  daftra_id text, egs_code text, name_ar text, name_en text,
  description_ar text, description_en text, operational_track text, item_type text,
  unit_label text, category text, gs1_gpc_brick text, gpc_brick_title text,
  gpc_class text, gpc_family text, gpc_segment text, sector_ar text, confidence_level text,
  unit_price numeric, estimated_price numeric,
  main_image_url text, image_url_2 text, image_url_3 text,
  source text, status text, active boolean
);
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public._catalog_import_staging TO sandbox_exec;
GRANT ALL ON public._catalog_import_staging TO service_role;
ALTER TABLE public._catalog_import_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public._catalog_import_staging FOR ALL USING (false) WITH CHECK (false);