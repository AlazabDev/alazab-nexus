import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchTerm } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { Search, Grid3X3, List, Package, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ItemType = Database["public"]["Enums"]["item_type"];

type Product = {
  id: string;
  az_code: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  brand: string | null;
  item_type: string | null;
  unit_price: number | null;
  estimated_price: number | null;
  main_image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  gpc_class: string | null;
  operational_track: string | null;
  status: string | null;
};

type Catalog = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  cover_image_url: string | null;
};

type Filters = {
  q: string;
  brand: string;
  type: string;
  sort: "name_ar" | "unit_price_asc" | "unit_price_desc";
};

const PAGE = 24;

const BRAND_META: Record<string, { label: string; cls: string }> = {
  luxury_finishing: { label: "Luxury Finishing", cls: "bg-primary/10 text-primary" },
  brand_identity: { label: "Brand Identity", cls: "bg-success/15 text-success" },
  uberfix: { label: "UberFix", cls: "bg-accent/20 text-accent-foreground" },
  laban_alasfour: { label: "Laban Alasfour", cls: "bg-warning/15 text-warning" },
};

const TYPE_LABELS: Record<string, string> = {
  product: "منتج",
  service: "خدمة",
  material: "مادة",
  spare_part: "قطعة غيار",
  tool: "أداة",
  bundle: "حزمة",
  package: "باكدج",
  work_item: "بند عمل",
  finish_item: "بند تشطيب",
  supplier_item: "بند مورد",
  custom_unit: "وحدة خاصة",
};

function imgSrc(p: Product): string | undefined {
  return p.main_image_url ?? undefined;
}

function priceLabel(p: Product) {
  const v = p.unit_price ?? p.estimated_price;
  if (!v) return null;
  return `${Number(v).toLocaleString("ar-EG")} ج.م`;
}

function BrandDot({ brand }: { brand: string | null }) {
  const m = BRAND_META[brand ?? ""] ?? null;
  if (!m) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

function ProductCard({ p }: { p: Product }) {
  const [imgErr, setImgErr] = useState(!imgSrc(p));
  const price = priceLabel(p);

  return (
    <Link
      to="/catalog/$azCode"
      params={{ azCode: p.az_code }}
      className="group bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-ring flex flex-col"
    >
      <div className="relative w-full h-48 bg-muted overflow-hidden">
        {!imgErr ? (
          <img
            src={imgSrc(p)}
            alt={p.name_ar}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="size-12 opacity-40" />
          </div>
        )}
        {p.item_type && p.item_type !== "product" && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card/90 text-primary">
            {TYPE_LABELS[p.item_type] ?? p.item_type}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <BrandDot brand={p.brand} />
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">{p.name_ar}</h3>
        {p.description_ar && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.description_ar}</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-primary font-semibold">{p.az_code}</span>
        {price ? (
          <span className="text-sm font-bold text-success">{price}</span>
        ) : (
          <span className="text-xs text-muted-foreground">بدون سعر</span>
        )}
      </div>
    </Link>
  );
}

function ProductRow({ p }: { p: Product }) {
  const [imgErr, setImgErr] = useState(!imgSrc(p));
  const price = priceLabel(p);

  return (
    <Link
      to="/catalog/$azCode"
      params={{ azCode: p.az_code }}
      className="flex items-center gap-4 bg-card rounded-xl border border-border px-4 py-3 cursor-pointer hover:border-ring hover:shadow-sm transition-all duration-150"
    >
      <div className="size-14 rounded-xl bg-muted overflow-hidden shrink-0">
        {!imgErr ? (
          <img
            src={imgSrc(p)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="size-full flex items-center justify-center">
            <Package className="size-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{p.name_ar}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="font-mono text-[10px] text-primary">{p.az_code}</span>
          {p.brand && <BrandDot brand={p.brand} />}
        </div>
      </div>
      {price && <span className="text-sm font-bold text-success shrink-0">{price}</span>}
      <ChevronLeft className="size-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function CatalogCard({ catalog }: { catalog: Catalog }) {
  return (
    <Link
      to="/catalogs/$slug"
      params={{ slug: catalog.slug }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-ring"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-accent/10" />
      <div className="relative">
        <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4 text-xl font-bold">
          {catalog.title_ar.charAt(0)}
        </div>
        <h3 className="font-bold text-lg mb-1">{catalog.title_ar}</h3>
        {catalog.description_ar && (
          <p className="text-sm text-muted-foreground line-clamp-2">{catalog.description_ar}</p>
        )}
      </div>
    </Link>
  );
}

export const Route = createFileRoute("/catalog/")({
  head: () => ({
    meta: [
      { title: "كتالوج العزب للتشطيبات — كل المنتجات والخدمات" },
      {
        name: "description",
        content: "كتالوج شامل لمنتجات وخدمات العزب للتشطيبات المعمارية — أكثر من 3,000 بند",
      },
      { property: "og:title", content: "كتالوج العزب للتشطيبات — كل المنتجات والخدمات" },
      {
        property: "og:description",
        content: "كتالوج شامل لمنتجات وخدمات العزب للتشطيبات المعمارية — أكثر من 3,000 بند",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ total: 0, priced: 0, synced: 0 });
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [filters, setFilters] = useState<Filters>({ q: "", brand: "", type: "", sort: "name_ar" });
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const term = sanitizeSearchTerm(filters.q).trim();

    let q = supabase.from("public_catalog_products").select("*", { count: "exact" });

    if (term) {
      q = q.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%,az_code.ilike.%${term}%`);
    }
    if (filters.brand) q = q.eq("brand", filters.brand);
    if (filters.type) q = q.eq("item_type", filters.type as ItemType);

    if (filters.sort === "unit_price_asc") q = q.order("unit_price", { ascending: true, nullsFirst: false });
    else if (filters.sort === "unit_price_desc") q = q.order("unit_price", { ascending: false, nullsFirst: false });
    else q = q.order("name_ar", { ascending: true });

    const from = (page - 1) * PAGE;
    const { data, error, count } = await q.range(from, from + PAGE - 1);

    if (!error) {
      setProducts((data ?? []) as unknown as Product[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [filters, page]);

  const fetchStats = useCallback(async () => {
    const { count: total } = await supabase.from("public_catalog_products").select("*", { count: "exact", head: true });
    const { count: priced } = await supabase
      .from("public_catalog_products")
      .select("*", { count: "exact", head: true })
      .gt("unit_price", 0);
    const { count: synced } = await supabase
      .from("public_catalog_products")
      .select("*", { count: "exact", head: true })
      .not("egs_code", "is", null);
    setStats({ total: total ?? 0, priced: priced ?? 0, synced: synced ?? 0 });
  }, []);

  const fetchCatalogs = useCallback(async () => {
    const { data } = await supabase
      .from("product_catalogs")
      .select("id, slug, title_ar, title_en, description_ar, cover_image_url")
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .limit(8);
    setCatalogs((data ?? []) as Catalog[]);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStats();
    fetchCatalogs();
  }, [fetchStats, fetchCatalogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,hsl(var(--accent))_0%,transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent text-accent-foreground grid place-items-center font-bold text-sm">
              AZ
            </div>
            <span className="font-bold text-lg">العزب للتشطيبات المعمارية</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">كتالوج المنتجات والخدمات</h1>
          <p className="text-primary-foreground/70 max-w-2xl leading-relaxed">
            تصفح كل بنود التشطيبات المعمارية من مواد وأدوات وخدمات — مع أسعار محدثة وأكواد مباشرة.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">إجمالي البنود</div>
            <div className="text-2xl font-black text-foreground">{stats.total.toLocaleString("ar-EG")}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">بها سعر</div>
            <div className="text-2xl font-black text-success">{stats.priced.toLocaleString("ar-EG")}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">متزامنة مع EGS</div>
            <div className="text-2xl font-black text-primary">{stats.synced.toLocaleString("ar-EG")}</div>
          </div>
        </div>
      </div>

      {/* Search & controls */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && setPage(1)}
              placeholder="ابحث بالاسم أو الكود..."
              className="pr-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((s) => !s)}>
            فلترة
          </Button>
          <div className="flex gap-1 border rounded-lg p-1 bg-card">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`size-9 rounded-md flex items-center justify-center transition ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "grid" ? <Grid3X3 className="size-4" /> : <List className="size-4" />}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 p-4 bg-card rounded-xl border border-border grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">العلامة التجارية</label>
              <select
                value={filters.brand}
                onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value, page: 1 }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">الكل</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">نوع البند</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">الكل</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">الترتيب</label>
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sort: e.target.value as Filters["sort"], page: 1 }))
                }
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="name_ar">الاسم</option>
                <option value="unit_price_asc">السعر: الأقل أولاً</option>
                <option value="unit_price_desc">السعر: الأعلى أولاً</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Catalogs */}
      {catalogs.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-6">
          <h2 className="text-lg font-bold mb-4">كتالوجات الأعمال</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {catalogs.map((c) => (
              <CatalogCard key={c.id} catalog={c} />
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">كل المنتجات</h2>
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString("ar-EG")} نتيجة
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="size-10 rounded-full border-3 border-muted border-t-accent animate-spin" />
            <p className="text-sm text-muted-foreground">جاري تحميل البنود...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد نتائج مطابقة</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.az_code} p={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <ProductRow key={p.az_code} p={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              السابق
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t py-6 mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} العزب للتشطيبات المعمارية — كتالوج المنتجات والخدمات
      </footer>
    </div>
  );
}
