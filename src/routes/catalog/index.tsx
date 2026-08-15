import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchTerm } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import {
  Search,
  Grid3X3,
  List,
  Package,
  ChevronLeft,
  SlidersHorizontal,
  X,
  Plus,
  Check,
  ImageIcon,
  BadgeDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteCart } from "@/lib/quote-cart";
import { QuoteCartBar } from "@/components/catalog/quote-cart-bar";

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
  gpc_class: string | null;
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

const PAGE_SIZES = [24, 48, 96];

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

const SORT_LABELS: Record<string, string> = {
  name_ar: "الاسم",
  price_asc: "السعر: الأقل أولاً",
  price_desc: "السعر: الأعلى أولاً",
  newest: "الأحدث",
};

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  brand: fallback(z.string(), "").default(""),
  type: fallback(z.string(), "").default(""),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  img: fallback(z.boolean(), false).default(false),
  priced: fallback(z.boolean(), false).default(false),
  sort: fallback(z.string(), "name_ar").default("name_ar"),
  page: fallback(z.number().int(), 1).default(1),
  size: fallback(z.number().int(), 24).default(24),
  view: fallback(z.string(), "grid").default("grid"),
});

export const Route = createFileRoute("/catalog/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "كتالوج العزب للتشطيبات — كل المنتجات والخدمات" },
      {
        name: "description",
        content: "كتالوج شامل لمنتجات وخدمات العزب للتشطيبات المعمارية — أكثر من 3,000 بند مع بحث وفلترة وطلب عرض سعر فوري.",
      },
      { property: "og:title", content: "كتالوج العزب للتشطيبات — كل المنتجات والخدمات" },
      {
        property: "og:description",
        content: "كتالوج شامل لمنتجات وخدمات العزب للتشطيبات المعمارية — أكثر من 3,000 بند مع بحث وفلترة وطلب عرض سعر فوري.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});

function priceOf(p: Product) {
  return p.unit_price ?? p.estimated_price;
}

function priceLabel(p: Product) {
  const v = priceOf(p);
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

function AddButton({ p, className = "" }: { p: Product; className?: string }) {
  const { add, has } = useQuoteCart();
  const inCart = has(p.az_code);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add({ az_code: p.az_code, name_ar: p.name_ar, image: p.main_image_url, price: priceOf(p) });
      }}
      aria-label="أضف لطلب عرض السعر"
      title="أضف لطلب عرض السعر"
      className={`size-8 shrink-0 grid place-items-center rounded-lg border transition ${
        inCart
          ? "bg-success/15 text-success border-success/30"
          : "bg-card text-muted-foreground border-border hover:text-primary hover:border-ring"
      } ${className}`}
    >
      {inCart ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  );
}

function ProductCard({ p }: { p: Product }) {
  const [imgErr, setImgErr] = useState(!p.main_image_url);
  const price = priceLabel(p);

  return (
    <Link
      to="/catalog/$azCode"
      params={{ azCode: p.az_code }}
      className="group bg-card rounded-2xl border border-border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-ring flex flex-col"
    >
      <div className="relative w-full h-44 bg-muted overflow-hidden">
        {!imgErr ? (
          <img
            src={p.main_image_url ?? undefined}
            alt={p.name_ar}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="size-12 opacity-40" />
          </div>
        )}
        {p.item_type && p.item_type !== "product" && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card/90 text-primary backdrop-blur">
            {TYPE_LABELS[p.item_type] ?? p.item_type}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
        <div className="flex items-center gap-2">
          {price ? (
            <span className="text-sm font-bold text-success">{price}</span>
          ) : (
            <span className="text-xs text-muted-foreground">بدون سعر</span>
          )}
          <AddButton p={p} />
        </div>
      </div>
    </Link>
  );
}

function ProductRow({ p }: { p: Product }) {
  const [imgErr, setImgErr] = useState(!p.main_image_url);
  const price = priceLabel(p);

  return (
    <Link
      to="/catalog/$azCode"
      params={{ azCode: p.az_code }}
      className="flex items-center gap-4 bg-card rounded-xl border border-border px-4 py-3 hover:border-ring hover:shadow-sm transition-all duration-150"
    >
      <div className="size-14 rounded-xl bg-muted overflow-hidden shrink-0">
        {!imgErr ? (
          <img
            src={p.main_image_url ?? undefined}
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
      <AddButton p={p} />
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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"
    >
      {label}
      <X className="size-3" />
    </button>
  );
}

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalog" });

  const setSearch = useCallback(
    (patch: Partial<typeof search>, resetPage = true) => {
      navigate({
        search: (prev) => ({ ...prev, ...patch, ...(resetPage ? { page: 1 } : {}) }),
        replace: true,
      });
    },
    [navigate],
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ total: 0, priced: 0, synced: 0 });
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [facets, setFacets] = useState<{ brands: string[]; types: string[] }>({ brands: [], types: [] });

  // debounced text input
  const [term, setTerm] = useState(search.q);
  useEffect(() => setTerm(search.q), [search.q]);
  useEffect(() => {
    if (term === search.q) return;
    const t = setTimeout(() => setSearch({ q: term }), 350);
    return () => clearTimeout(t);
  }, [term, search.q, setSearch]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const safe = sanitizeSearchTerm(search.q).trim();

    let q = supabase.from("public_catalog_products").select("*", { count: "exact" });

    if (safe) {
      q = q.or(`name_ar.ilike.%${safe}%,name_en.ilike.%${safe}%,az_code.ilike.%${safe}%`);
    }
    if (search.brand) q = q.eq("brand", search.brand);
    if (search.type) q = q.eq("item_type", search.type as ItemType);
    if (search.min > 0) q = q.gte("unit_price", search.min);
    if (search.max > 0) q = q.lte("unit_price", search.max);
    if (search.img) q = q.not("main_image_url", "is", null);
    if (search.priced) q = q.gt("unit_price", 0);

    if (search.sort === "price_asc") q = q.order("unit_price", { ascending: true, nullsFirst: false });
    else if (search.sort === "price_desc") q = q.order("unit_price", { ascending: false, nullsFirst: false });
    else if (search.sort === "newest") q = q.order("updated_at", { ascending: false });
    else q = q.order("name_ar", { ascending: true });

    const size = PAGE_SIZES.includes(search.size) ? search.size : 24;
    const from = (Math.max(1, search.page) - 1) * size;
    const { data, error, count } = await q.range(from, from + size - 1);

    if (!error) {
      setProducts((data ?? []) as unknown as Product[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search]);

  const fetchMeta = useCallback(async () => {
    const [{ count: total }, { count: priced }, { count: synced }, facetRes, catalogRes] = await Promise.all([
      supabase.from("public_catalog_products").select("*", { count: "exact", head: true }),
      supabase.from("public_catalog_products").select("*", { count: "exact", head: true }).gt("unit_price", 0),
      supabase
        .from("public_catalog_products")
        .select("*", { count: "exact", head: true })
        .not("egs_code", "is", null),
      supabase.from("public_catalog_products").select("brand, item_type").limit(2000),
      supabase
        .from("product_catalogs")
        .select("id, slug, title_ar, title_en, description_ar, cover_image_url")
        .eq("is_public", true)
        .order("sort_order", { ascending: true })
        .limit(8),
    ]);

    setStats({ total: total ?? 0, priced: priced ?? 0, synced: synced ?? 0 });
    const rows = (facetRes.data ?? []) as Array<{ brand: string | null; item_type: string | null }>;
    setFacets({
      brands: Array.from(new Set(rows.map((r) => r.brand).filter((b): b is string => !!b))).sort(),
      types: Array.from(new Set(rows.map((r) => r.item_type).filter((t): t is string => !!t))).sort(),
    });
    setCatalogs((catalogRes.data ?? []) as Catalog[]);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const size = PAGE_SIZES.includes(search.size) ? search.size : 24;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, search.page), totalPages);

  const activeChips = useMemo(() => {
    const chips: Array<{ label: string; clear: Partial<typeof search> }> = [];
    if (search.q) chips.push({ label: `بحث: ${search.q}`, clear: { q: "" } });
    if (search.brand) chips.push({ label: BRAND_META[search.brand]?.label ?? search.brand, clear: { brand: "" } });
    if (search.type) chips.push({ label: TYPE_LABELS[search.type] ?? search.type, clear: { type: "" } });
    if (search.min > 0) chips.push({ label: `من ${search.min.toLocaleString("ar-EG")} ج.م`, clear: { min: 0 } });
    if (search.max > 0) chips.push({ label: `حتى ${search.max.toLocaleString("ar-EG")} ج.م`, clear: { max: 0 } });
    if (search.img) chips.push({ label: "بصورة فقط", clear: { img: false } });
    if (search.priced) chips.push({ label: "بسعر فقط", clear: { priced: false } });
    return chips;
  }, [search]);

  const view = search.view === "list" ? "list" : "grid";

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
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
            تصفح كل بنود التشطيبات المعمارية من مواد وأدوات وخدمات — مع أسعار محدثة وأكواد مباشرة وإمكانية طلب عرض سعر فوري.
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

      {/* Sticky search & controls */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border mt-6">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الكود..."
                className="pr-10"
              />
              {term && (
                <button
                  onClick={() => setTerm("")}
                  aria-label="مسح البحث"
                  className="absolute left-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters((s) => !s)}
                className="gap-2"
              >
                <SlidersHorizontal className="size-4" /> فلترة
                {activeChips.length > 0 && (
                  <span className="size-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
                    {activeChips.length}
                  </span>
                )}
              </Button>
              <select
                value={search.sort}
                onChange={(e) => setSearch({ sort: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(SORT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 border rounded-lg p-1 bg-card">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSearch({ view: v }, false)}
                    aria-label={v}
                    className={`size-8 rounded-md flex items-center justify-center transition ${
                      view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {v === "grid" ? <Grid3X3 className="size-4" /> : <List className="size-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* quick type chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSearch({ type: "" })}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                !search.type ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-ring"
              }`}
            >
              الكل
            </button>
            {facets.types.map((t) => (
              <button
                key={t}
                onClick={() => setSearch({ type: search.type === t ? "" : t })}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  search.type === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-ring"
                }`}
              >
                {TYPE_LABELS[t] ?? t}
              </button>
            ))}
          </div>

          {activeChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeChips.map((c) => (
                <Chip key={c.label} label={c.label} onRemove={() => setSearch(c.clear)} />
              ))}
              <button
                onClick={() =>
                  setSearch({ q: "", brand: "", type: "", min: 0, max: 0, img: false, priced: false })
                }
                className="text-xs text-muted-foreground hover:text-destructive underline"
              >
                مسح الكل
              </button>
            </div>
          )}

          {showFilters && (
            <div className="p-4 bg-card rounded-xl border border-border grid md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">العلامة التجارية</label>
                <select
                  value={search.brand}
                  onChange={(e) => setSearch({ brand: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">الكل</option>
                  {facets.brands.map((b) => (
                    <option key={b} value={b}>
                      {BRAND_META[b]?.label ?? b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">نطاق السعر (ج.م)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="من"
                    value={search.min || ""}
                    onChange={(e) => setSearch({ min: Number(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="إلى"
                    value={search.max || ""}
                    onChange={(e) => setSearch({ max: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">خيارات</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearch({ img: !search.img })}
                    className={`flex-1 h-10 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition ${
                      search.img ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input"
                    }`}
                  >
                    <ImageIcon className="size-3.5" /> بصورة
                  </button>
                  <button
                    onClick={() => setSearch({ priced: !search.priced })}
                    className={`flex-1 h-10 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition ${
                      search.priced ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input"
                    }`}
                  >
                    <BadgeDollarSign className="size-3.5" /> بسعر
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">عدد النتائج بالصفحة</label>
                <select
                  value={size}
                  onChange={(e) => setSearch({ size: Number(e.target.value) })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Catalogs */}
      {catalogs.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
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
          <span className="text-sm text-muted-foreground">{total.toLocaleString("ar-EG")} نتيجة</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden bg-card">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">لا توجد نتائج مطابقة</p>
            {activeChips.length > 0 && (
              <Button
                variant="outline"
                onClick={() =>
                  setSearch({ q: "", brand: "", type: "", min: 0, max: 0, img: false, priced: false })
                }
              >
                مسح الفلاتر
              </Button>
            )}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch({ page: Math.max(1, page - 1) }, false)}
              disabled={page === 1}
            >
              السابق
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              صفحة {page.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch({ page: Math.min(totalPages, page + 1) }, false)}
              disabled={page === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </main>

      <QuoteCartBar />

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} العزب للتشطيبات المعمارية — كتالوج المنتجات والخدمات
      </footer>
    </div>
  );
}
