import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowRight, Share2, Grid3X3, List, Search, X, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


type Catalog = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_image_url: string | null;
};

type CatalogItem = {
  product_id: string;
  sort_order: number;
  featured: boolean;

  product: {
    id: string;
    az_code: string;
    name_ar: string;
    name_en: string | null;
    description_ar: string | null;
    item_type: string | null;
    unit_price: number | null;
    estimated_price: number | null;
    main_image_url: string | null;
    image_url_2: string | null;
    image_url_3: string | null;
  } | null;
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

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  type: fallback(z.string(), "all").default("all"),
  view: fallback(z.string(), "grid").default("grid"),
  page: fallback(z.number().int(), 1).default(1),
});

const PAGE_SIZE = 24;

export const Route = createFileRoute("/catalogs/$slug")({
  validateSearch: zodValidator(searchSchema),
  loader: async ({ params }) => {

    const { data: catalog, error } = await supabase
      .from("product_catalogs")
      .select("id, slug, title_ar, title_en, description_ar, description_en, cover_image_url")
      .eq("slug", params.slug)
      .eq("is_public", true)
      .maybeSingle();

    if (error || !catalog) throw notFound();
    return { catalog: catalog as Catalog };
  },

  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.catalog.title_ar} — كتالوج العزب` },
          {
            name: "description",
            content: loaderData.catalog.description_ar ?? loaderData.catalog.title_ar,
          },
          { property: "og:title", content: loaderData.catalog.title_ar },
          {
            property: "og:description",
            content: loaderData.catalog.description_ar ?? loaderData.catalog.title_ar,
          },
          ...(loaderData.catalog.cover_image_url
            ? [{ property: "og:image", content: loaderData.catalog.cover_image_url }]
            : []),
        ]
      : [{ title: "الكتالوج غير موجود" }],
  }),

  component: CatalogDetail,
  notFoundComponent: CatalogNotFound,
});

function CatalogNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-4">
        <Package className="size-14 mx-auto text-muted-foreground" />
        <h1 className="text-lg font-bold">الكتالوج غير متوفر</h1>
        <Button asChild>
          <Link to="/catalog" className="gap-2">
            <ArrowRight className="size-4" /> رجوع للكتالوج
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CatalogDetail() {
  const { catalog } = Route.useLoaderData();
  const { q, type, view, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogs/$slug" });
  const [term, setTerm] = useState(q);

  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }) });

  const { data: items, isLoading } = useQuery({
    queryKey: ["catalog-items", catalog.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select(
          "product_id, sort_order, featured, product:public_catalog_products(id, az_code, name_ar, name_en, description_ar, item_type, unit_price, estimated_price, main_image_url, image_url_2, image_url_3)",
        )
        .eq("catalog_id", catalog.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CatalogItem[];
    },
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/catalogs/${catalog.slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: catalog.title_ar, url: shareUrl });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const allProducts = useMemo(
    () => items?.map((i) => i.product).filter((p): p is NonNullable<typeof p> => !!p) ?? [],
    [items],
  );

  // بنود مضافة للكتالوج لكن منتجاتها غير معتمدة (approved) → غير متاحة للزائر
  const unavailableCount = (items?.length ?? 0) - allProducts.length;

  const types = useMemo(() => {
    const s = new Set<string>();
    allProducts.forEach((p) => p.item_type && s.add(p.item_type));
    return Array.from(s);
  }, [allProducts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().slice(0, 100);
    return allProducts.filter((p) => {
      if (type !== "all" && p.item_type !== type) return false;
      if (!needle) return true;
      return [p.name_ar, p.name_en, p.az_code, p.description_ar]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle));
    });
  }, [allProducts, q, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const products = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const gridView = view === "list" ? "list" : "grid";


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: catalog.title_ar,
    description: catalog.description_ar ?? catalog.title_ar,
    url: shareUrl,
    itemListElement: products.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: p.name_ar,
        sku: p.az_code,
        description: p.description_ar ?? undefined,
        image: p.main_image_url ?? undefined,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/catalog">
              <ArrowRight className="size-4" /> الكتالوج العام
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} title="مشاركة">
            <Share2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,hsl(var(--accent))_0%,transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent text-accent-foreground grid place-items-center font-bold text-sm">
              AZ
            </div>
            <span className="font-bold text-lg">العزب للتشطيبات المعمارية</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-3">{catalog.title_ar}</h1>
          {catalog.description_ar && (
            <p className="text-primary-foreground/70 max-w-2xl leading-relaxed">{catalog.description_ar}</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-[57px] z-20 bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <form
              className="relative flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch({ q: term.trim().slice(0, 100) });
              }}
            >
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الكود أو الوصف..."
                className="pr-10 pl-9"
              />
              {term && (
                <button
                  type="button"
                  onClick={() => {
                    setTerm("");
                    setSearch({ q: "" });
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="مسح البحث"
                >
                  <X className="size-4" />
                </button>
              )}
            </form>
            <div className="flex gap-1">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => navigate({ search: (prev) => ({ ...prev, view: v }) })}
                  aria-label={v === "grid" ? "عرض شبكي" : "عرض قائمة"}
                  className={`size-9 rounded-lg border flex items-center justify-center transition ${
                    gridView === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-ring"
                  }`}
                >
                  {v === "grid" ? <Grid3X3 className="size-4" /> : <List className="size-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString("ar-EG")} منتج متاح
            </span>
            <div className="flex gap-1 flex-wrap">
              <TypeChip active={type === "all"} onClick={() => setSearch({ type: "all" })} label="الكل" />
              {types.map((t) => (
                <TypeChip
                  key={t}
                  active={type === t}
                  onClick={() => setSearch({ type: t })}
                  label={TYPE_LABELS[t] ?? t}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {unavailableCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <EyeOff className="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {unavailableCount.toLocaleString("ar-EG")} من بنود هذا الكتالوج غير معروضة حالياً لأنها قيد
              المراجعة ولم تُعتمد بعد. تواصل معنا للاستفسار عن توفرها.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="size-10 rounded-full border-3 border-muted border-t-accent animate-spin" />
            <p className="text-sm text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {allProducts.length === 0
                ? "لا توجد منتجات معتمدة في هذا الكتالوج حالياً"
                : "لا توجد نتائج مطابقة لبحثك"}
            </p>
            {allProducts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setTerm("");
                  setSearch({ q: "", type: "all" });
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </div>
        ) : gridView === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.az_code} product={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <ProductRow key={p.az_code} product={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: safePage - 1 }) })}
            >
              السابق
            </Button>
            <span className="text-xs text-muted-foreground">
              صفحة {safePage.toLocaleString("ar-EG")} من {totalPages.toLocaleString("ar-EG")}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => navigate({ search: (prev) => ({ ...prev, page: safePage + 1 }) })}
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

function ProductCard({ product: p }: { product: NonNullable<CatalogItem["product"]> }) {
  const [imgErr, setImgErr] = useState(!p.main_image_url);
  const price = p.unit_price ?? p.estimated_price;

  return (
    <Link
      to="/catalog/$azCode"
      params={{ azCode: p.az_code }}
      className="group bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-ring flex flex-col"
    >
      <div className="relative w-full h-48 bg-muted overflow-hidden">
        {!imgErr ? (
          <img
            src={p.main_image_url!}
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
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">{p.name_ar}</h3>
        {p.description_ar && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.description_ar}</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-primary font-semibold">{p.az_code}</span>
        {price ? (
          <span className="text-sm font-bold text-success">{Number(price).toLocaleString("ar-EG")} ج.م</span>
        ) : (
          <span className="text-xs text-muted-foreground">بدون سعر</span>
        )}
      </div>
    </Link>
  );
}

function ProductRow({ product: p }: { product: NonNullable<CatalogItem["product"]> }) {
  const [imgErr, setImgErr] = useState(!p.main_image_url);
  const price = p.unit_price ?? p.estimated_price;

  return (
    <Link
      to="/catalog/$azCode"
      params={{ azCode: p.az_code }}
      className="flex items-center gap-4 bg-card rounded-xl border border-border px-4 py-3 cursor-pointer hover:border-ring hover:shadow-sm transition-all duration-150"
    >
      <div className="size-14 rounded-xl bg-muted overflow-hidden shrink-0">
        {!imgErr ? (
          <img
            src={p.main_image_url!}
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
          {p.item_type && (
            <span className="text-[10px] text-muted-foreground">
              {TYPE_LABELS[p.item_type] ?? p.item_type}
            </span>
          )}
        </div>
      </div>
      {price && <span className="text-sm font-bold text-success shrink-0">{Number(price).toLocaleString("ar-EG")} ج.م</span>}
      <ArrowRight className="size-4 text-muted-foreground shrink-0 rotate-180" />
    </Link>
  );
}

function TypeChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-3 py-1 rounded-full border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:border-ring"
      }`}
    >
      {label}
    </button>
  );
}
