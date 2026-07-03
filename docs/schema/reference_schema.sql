-- ============================================================
-- AzProud — Alazab PAOP Full Schema
-- قاعدة بيانات نظام إدارة المنتجات الكامل
-- ============================================================
-- التشغيل: psql -U postgres -d postgres -f azab_full_schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ── ENUMs ───────────────────────────────────────────────────
CREATE TYPE item_type AS ENUM (
    'product', 'service', 'material', 'spare_part', 'bundle'
);

CREATE TYPE item_status AS ENUM (
    'draft', 'needs_review', 'approved', 'rejected', 'archived'
);

CREATE TYPE asset_role AS ENUM (
    'main', 'gallery', 'technical', 'certificate', 'datasheet', 'video'
);

CREATE TYPE supplier_tier AS ENUM (
    'preferred', 'standard', 'occasional', 'blacklisted'
);

CREATE TYPE approval_stage AS ENUM (
    'technical', 'pricing', 'content', 'final'
);

CREATE TYPE approval_status AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
);

CREATE TYPE app_role AS ENUM (
    'admin', 'manager', 'editor', 'viewer', 'api_user'
);

-- ============================================================
-- §1  التصنيف الهرمي
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar     TEXT NOT NULL,
    name_en     TEXT,
    code        TEXT UNIQUE,
    parent_id   UUID REFERENCES categories(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS families (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar     TEXT NOT NULL,
    name_en     TEXT,
    code        TEXT UNIQUE,
    category_id UUID REFERENCES categories(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    code        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §2  الموردون
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    supplier_type    TEXT,
    supplier_tier    supplier_tier,
    contact_name     TEXT,
    email            TEXT,
    phone            TEXT,
    website          TEXT,
    api_url          TEXT,
    coverage_areas   TEXT[],
    delivery_time    TEXT,
    payment_terms    TEXT,
    rating           NUMERIC(3,2),
    notes            TEXT,
    price_file_url   TEXT,
    webhook_enabled  BOOLEAN DEFAULT false,
    last_sync_at     TIMESTAMPTZ,
    status           TEXT DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_webhooks (
    supplier_id    UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    webhook_secret TEXT,
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (supplier_id)
);

CREATE TABLE IF NOT EXISTS supplier_sync_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id        UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    event_type         TEXT NOT NULL,
    status             TEXT NOT NULL,
    records_processed  INT DEFAULT 0,
    records_updated    INT DEFAULT 0,
    records_failed     INT DEFAULT 0,
    payload            JSONB,
    ip_address         TEXT,
    error_message      TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §3  المنتجات
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- التكويد
    az_code                    TEXT UNIQUE NOT NULL,
    egs_code                   TEXT UNIQUE,
    product_code               TEXT,

    -- الأسماء والأوصاف
    name_ar                    TEXT NOT NULL,
    name_en                    TEXT,
    short_description_ar       TEXT,
    short_description_en       TEXT,
    description_ar             TEXT,
    description_en             TEXT,
    marketing_content          TEXT,
    technical_content          TEXT,
    installation_notes         TEXT,
    maintenance_notes          TEXT,
    warranty_info              TEXT,
    faq                        JSONB,
    external_links             JSONB,

    -- التصنيف
    item_type                  item_type NOT NULL DEFAULT 'product',
    status                     item_status NOT NULL DEFAULT 'draft',
    category_id                UUID REFERENCES categories(id),
    category                   TEXT,
    family_id                  UUID REFERENCES families(id),
    unit_id                    UUID REFERENCES units(id),
    operational_track          TEXT,
    sector_ar                  TEXT,

    -- GPC
    gs1_gpc_brick              TEXT,
    gpc_brick_title            TEXT,
    gpc_class                  TEXT,
    gpc_family                 TEXT,
    gpc_segment                TEXT,

    -- بحث وتصنيف
    tags                       TEXT[],
    search_keywords            TEXT[],
    specifications             JSONB,
    materials                  JSONB,
    confidence_level           TEXT,

    -- تسعير مرجعي
    price                      NUMERIC(14,2),

    -- روابط افتراضية
    default_price_id           UUID,
    default_supplier_id        UUID,

    -- AI
    content_optimization_score NUMERIC(5,2),
    datasheet_generated        BOOLEAN DEFAULT false,

    -- حوكمة
    source                     TEXT,
    internal_notes             TEXT,
    created_by                 UUID,
    approved_by                UUID,
    approved_at                TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §4  الأصول الرقمية
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name        TEXT NOT NULL,
    file_url         TEXT NOT NULL,
    file_type        TEXT,
    file_size        BIGINT,
    folder_path      TEXT,
    source           TEXT,
    storage_provider TEXT,
    tags             TEXT[],
    notes            TEXT,
    status           TEXT DEFAULT 'active',
    uploaded_by      UUID,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_assets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    asset_role  asset_role NOT NULL DEFAULT 'gallery',
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §5  التسعير
-- ============================================================

CREATE TABLE IF NOT EXISTS prices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id       UUID REFERENCES suppliers(id),

    -- أسعار
    purchase_price    NUMERIC(14,2),
    selling_price     NUMERIC(14,2),
    retail_price      NUMERIC(14,2),
    wholesale_price   NUMERIC(14,2),
    client_price      NUMERIC(14,2),
    project_price     NUMERIC(14,2),
    reference_price   NUMERIC(14,2),

    -- تكاليف إضافية
    installation_cost NUMERIC(14,2),
    transport_cost    NUMERIC(14,2),
    operation_cost    NUMERIC(14,2),
    maintenance_cost  NUMERIC(14,2),

    -- هامش وعملة
    margin_percent    NUMERIC(5,2),
    currency          TEXT DEFAULT 'EGP',
    source            TEXT,
    status            TEXT DEFAULT 'active',

    valid_from        TIMESTAMPTZ,
    valid_to          TIMESTAMPTZ,
    changed_by        UUID,
    approved_by       UUID,
    approved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    old_price   NUMERIC(14,2),
    new_price   NUMERIC(14,2),
    change_reason TEXT,
    changed_by  UUID,
    source      TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT,
    rule_type  TEXT NOT NULL,
    value      NUMERIC(14,2),
    conditions JSONB,
    priority   INT DEFAULT 0,
    is_active  BOOLEAN DEFAULT true,
    status     TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §6  المخزون / Supplier Inventory
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_inventory (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id          UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    internal_product_id  UUID REFERENCES products(id),
    supplier_sku         TEXT,
    supplier_product_name TEXT,
    supplier_price       NUMERIC(14,2),
    available_quantity   NUMERIC(14,3),
    availability_status  TEXT,
    currency             TEXT,
    source_type          TEXT,
    source_url           TEXT,
    sync_status          TEXT,
    last_sync_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §7  طلبات العروض والتصنيع
-- ============================================================

CREATE TABLE IF NOT EXISTS quote_requests (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id           TEXT UNIQUE,
    chatbot_session_id   TEXT,
    customer_id          TEXT,
    customer_name        TEXT,
    customer_phone       TEXT,
    customer_email       TEXT,
    design_file_url      TEXT,
    design_file_type     TEXT,
    design_data          JSONB,
    design_preview_url   TEXT,
    dimensions           JSONB,
    materials            JSONB,
    components           JSONB,
    finishes             JSONB,
    accessories          JSONB,
    special_requirements JSONB,
    pricing_breakdown    JSONB,
    materials_cost       NUMERIC(12,2),
    labor_cost           NUMERIC(12,2),
    overhead_cost        NUMERIC(12,2),
    profit_margin        NUMERIC(5,2),
    total_cost           NUMERIC(12,2),
    selling_price        NUMERIC(12,2),
    currency             TEXT DEFAULT 'EGP',
    status               TEXT DEFAULT 'pending',
    quoted_at            TIMESTAMPTZ,
    quote_valid_until    TIMESTAMPTZ,
    customer_response    TEXT,
    customer_response_at TIMESTAMPTZ,
    customer_notes       TEXT,
    rejection_reason     TEXT,
    accepted_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_generated_quotes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID REFERENCES products(id),
    quote_request_id  UUID REFERENCES quote_requests(id),
    consumer_id       UUID,
    api_endpoint      TEXT,
    quote_token       TEXT,
    quote_request_data JSONB,
    generated_quote   JSONB,
    generated_at      TIMESTAMPTZ,
    generated_by      TEXT,
    status            TEXT DEFAULT 'pending',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manufacturing_orders (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number             TEXT UNIQUE NOT NULL,
    quote_request_id         UUID REFERENCES quote_requests(id),
    approval_id              UUID,
    customer_id              TEXT,
    customer_name            TEXT,
    customer_phone           TEXT,
    design_data              JSONB,
    specifications           JSONB,
    materials                JSONB,
    quantity                 INT,
    unit_price               NUMERIC(12,2),
    total_price              NUMERIC(12,2),
    final_price              NUMERIC(12,2),
    discount_amount          NUMERIC(12,2),
    amount_paid              NUMERIC(12,2),
    currency                 TEXT DEFAULT 'EGP',
    payment_status           TEXT,
    status                   TEXT DEFAULT 'pending',
    priority                 TEXT DEFAULT 'normal',
    estimated_start_date     DATE,
    estimated_completion_date DATE,
    actual_start_date        DATE,
    actual_completion_date   DATE,
    estimated_completion     TEXT,
    delivery_date            DATE,
    delivery_notes           TEXT,
    production_notes         TEXT,
    quality_notes            TEXT,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_requisitions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_number   TEXT UNIQUE NOT NULL,
    manufacturing_order_id UUID REFERENCES manufacturing_orders(id),
    approval_id          UUID,
    status               TEXT DEFAULT 'pending',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_requisition_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id       TEXT NOT NULL,
    product_id           UUID REFERENCES products(id),
    product_code         TEXT,
    product_name         TEXT,
    supplier_id          UUID REFERENCES suppliers(id),
    supplier_name        TEXT,
    requested_quantity   NUMERIC(14,3),
    unit                 TEXT,
    unit_cost            NUMERIC(14,2),
    total_cost           NUMERIC(14,2),
    status               TEXT DEFAULT 'pending',
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §8  الاعتمادات
-- ============================================================

CREATE TABLE IF NOT EXISTS approvals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type    TEXT NOT NULL,
    entity_id      TEXT NOT NULL,
    title          TEXT NOT NULL,
    current_stage  approval_stage NOT NULL DEFAULT 'technical',
    status         approval_status NOT NULL DEFAULT 'pending',
    priority       TEXT DEFAULT 'normal',
    notes          TEXT,
    rejection_reason TEXT,
    requested_by   UUID,
    assigned_to    UUID,
    decided_by     UUID,
    decided_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id  TEXT NOT NULL,
    stage        approval_stage NOT NULL,
    action       TEXT NOT NULL,
    actor        TEXT,
    comment      TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §9  الطلبات العامة
-- ============================================================

CREATE TABLE IF NOT EXISTS requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    request_type     TEXT NOT NULL,
    category         TEXT,
    description      TEXT,
    quantity         NUMERIC(14,3),
    estimated_budget NUMERIC(14,2),
    priority         TEXT DEFAULT 'normal',
    status           TEXT DEFAULT 'pending',
    requested_by     UUID,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §10  Datasheets
-- ============================================================

CREATE TABLE IF NOT EXISTS product_datasheets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    format          TEXT,
    language        TEXT DEFAULT 'ar',
    content         JSONB,
    file_url        TEXT,
    status          TEXT DEFAULT 'draft',
    generator_model TEXT,
    generated_at    TIMESTAMPTZ,
    generated_by    UUID,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §11  المجموعات المكررة
-- ============================================================

CREATE TABLE IF NOT EXISTS duplicate_groups (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    confidence_score NUMERIC(5,2),
    status           TEXT DEFAULT 'open',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duplicate_group_members (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duplicate_group_id UUID NOT NULL REFERENCES duplicate_groups(id) ON DELETE CASCADE,
    product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    similarity_reason TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §12  التكاملات
-- ============================================================

CREATE TABLE IF NOT EXISTS api_integrations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    integration_type TEXT NOT NULL,
    config           JSONB NOT NULL DEFAULT '{}',
    status           TEXT DEFAULT 'inactive',
    last_sync_at     TIMESTAMPTZ,
    last_error       TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_consumers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    channel               TEXT NOT NULL,
    api_key               TEXT UNIQUE NOT NULL,
    allowed_endpoints     TEXT[],
    rate_limit_per_minute INT DEFAULT 60,
    total_requests        INT DEFAULT 0,
    is_active             BOOLEAN DEFAULT true,
    notes                 TEXT,
    created_by            UUID,
    last_used_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_call_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id       UUID REFERENCES api_consumers(id),
    consumer_name     TEXT,
    endpoint          TEXT NOT NULL,
    method            TEXT DEFAULT 'GET',
    channel           TEXT,
    status_code       INT,
    response_time_ms  INT,
    request_payload   JSONB,
    response_payload  JSONB,
    error_message     TEXT,
    ip_address        TEXT,
    user_agent        TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §13  الإشعارات وسجلات التدقيق
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL,
    title                TEXT NOT NULL,
    body                 TEXT,
    kind                 TEXT NOT NULL,
    link                 TEXT,
    is_read              BOOLEAN DEFAULT false,
    related_entity_id    UUID,
    related_entity_type  TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type  TEXT NOT NULL,
    entity_id    UUID,
    action       TEXT NOT NULL,
    old_value    JSONB,
    new_value    JSONB,
    created_by   UUID,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action           TEXT NOT NULL,
    entity_type      TEXT,
    entity_id        UUID,
    product_id       UUID REFERENCES products(id),
    optimization_type TEXT,
    status           TEXT,
    duration_ms      INT,
    metadata         JSONB,
    user_id          UUID,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §14  وظائف AI
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_optimization_jobs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id               TEXT UNIQUE NOT NULL,
    consumer_id          UUID,
    optimization_type    TEXT,
    optimization_level   TEXT,
    product_ids          JSONB,
    total_products       INT,
    processed_products   INT DEFAULT 0,
    processed_count      INT DEFAULT 0,
    success_count        INT DEFAULT 0,
    failed_count         INT DEFAULT 0,
    progress_percent     NUMERIC(5,2) DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'queued',
    result               JSONB,
    results              JSONB,
    errors               JSONB,
    error                TEXT,
    estimated_completion TIMESTAMPTZ,
    started_at           TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §15  Import / Export
-- ============================================================

CREATE TABLE IF NOT EXISTS import_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type  TEXT NOT NULL,
    file_name    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    total_rows   INT DEFAULT 0,
    valid_rows   INT DEFAULT 0,
    invalid_rows INT DEFAULT 0,
    error_log    JSONB,
    created_by   UUID,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS export_jobs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type    TEXT NOT NULL,
    format         TEXT NOT NULL,
    target         TEXT NOT NULL,
    filters        JSONB,
    status         TEXT NOT NULL DEFAULT 'pending',
    file_url       TEXT,
    total_rows     INT,
    error_message  TEXT,
    created_by     UUID,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §16  المستخدمون والأدوار
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID NOT NULL,
    role     app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot_interactions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id       UUID REFERENCES quote_requests(id),
    manufacturing_order_id UUID REFERENCES manufacturing_orders(id),
    interaction_type       TEXT NOT NULL,
    direction              TEXT,
    channel                TEXT,
    payload                JSONB,
    response_payload       JSONB,
    status                 TEXT,
    delivered_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- §17  الفهارس
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_az_code    ON products(az_code);
CREATE INDEX IF NOT EXISTS idx_products_egs_code   ON products(egs_code) WHERE egs_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_status     ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_item_type  ON products(item_type);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_ar    ON products USING gin(name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_en    ON products USING gin(name_en gin_trgm_ops) WHERE name_en IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_tags       ON products USING gin(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_updated    ON products(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_status       ON assets(status);
CREATE INDEX IF NOT EXISTS idx_product_assets_pid  ON product_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_product      ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_supplier     ON prices(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_entity        ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_consumer   ON api_call_logs(consumer_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created    ON api_call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user          ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_supplier_inv        ON supplier_inventory(supplier_id);

-- ============================================================
-- §18  Trigger — updated_at تلقائي
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'products','categories','families','suppliers','prices',
        'assets','api_integrations','api_consumers',
        'manufacturing_orders','quote_requests','requests',
        'approvals','ai_optimization_jobs','supplier_inventory',
        'product_datasheets','pricing_rules','export_jobs',
        'material_requisitions'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()', t, t);
    END LOOP;
END $$;

-- ============================================================
-- §19  Seed — الفئات الأساسية
-- ============================================================

INSERT INTO categories (name_ar, name_en, code) VALUES
    ('Luxury Finishing',  'Luxury Finishing',  'LUXURY'),
    ('UberFix',           'UberFix',           'UBERFIX'),
    ('Brand Identity',    'Brand Identity',    'BRAND'),
    ('Laban Alasfour',    'Laban Alasfour',    'LABAN')
ON CONFLICT (code) DO NOTHING;

INSERT INTO units (name, code) VALUES
    ('قطعة',  'piece'),
    ('متر',   'meter'),
    ('م²',    'sqm'),
    ('كجم',   'kg'),
    ('لتر',   'liter'),
    ('خدمة',  'service'),
    ('علبة',  'box'),
    ('لفة',   'roll')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
