import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id: string;
  az_code: string;
  name_ar: string;
  name_en: string | null;
  short_description_ar: string | null;
  description_ar: string | null;
  brand: string | null;
  item_type: string | null;
  unit_price: number | null;
  estimated_price: number | null;
  main_image_url: string | null;
  status: string | null;
};

const PAGE_SIZE = 96;

export const Route = createFileRoute("/products/")({
  loader: async () => {
    const { data, error, count } = await supabase
      .from("products")
      .select(
        "id,az_code,name_ar,name_en,short_description_ar,description_ar,brand,item_type,unit_price,estimated_price,main_image_url,status",
        { count: "exact" },
      )
      .eq("active", true)
      .not("status", "in", "(archived,rejected)")
      .order("name_ar", { ascending: true })
      .range(0, PAGE_SIZE - 1);

    if (error) throw error;
    return { products: (data ?? []) as Product[], total: count ?? 0 };
  },
  head: () => ({
    meta: [
      { title: "منتجات العزب — Alazab Nexus" },
      {
        name: "description",
        content: "صفحة عامة تعرض منتجات وخدمات العزب من قاعدة بيانات Alazab Nexus.",
      },
    ],
  }),
  component: ProductsIndexPage,
});

function productPrice(product: Product) {
  const value = product.unit_price ?? product.estimated_price;
  if (!value) return "السعر عند الطلب";
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

function productDescription(product: Product) {
  return product.short_description_ar || product.description_ar || product.name_en || "بيانات المنتج من Alazab Nexus";
}

function ProductsIndexPage() {
  const { products, total } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      [product.name_ar, product.name_en, product.az_code, product.brand, product.item_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [products, query]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#15110d]" dir="rtl">
      <section className="border-b border-[#e5ddd1] bg-[#0d1b2a] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
            <Sparkles className="size-3.5" /> Alazab Nexus Public Catalog
          </div>
          <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">
            منتجات وخدمات العزب في صفحة عامة واحدة
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/70 md:text-base">
            صفحة عامة متصلة بقاعدة البيانات تعرض المنتجات والخدمات النشطة مع روابط ديناميكية لكل منتج حسب كود AZ.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-2xl font-black text-[#f1c75b]">{total.toLocaleString("ar-EG")}</div>
              <div className="mt-1 text-xs text-white/60">منتج وخدمة</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="text-2xl font-black text-[#f1c75b]">{filtered.length.toLocaleString("ar-EG")}</div>
              <div className="mt-1 text-xs text-white/60">ظاهر الآن</div>
            </div>
            <Link
              to="/catalog"
              className="rounded-2xl border border-[#f1c75b]/40 bg-[#f1c75b] p-4 text-center text-sm font-bold text-[#0d1b2a] transition hover:bg-[#ffd970]"
            >
              فتح الكتالوج المتقدم
            </Link>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-[#e5ddd1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8c8174]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم المنتج أو كود AZ أو البراند..."
              className="w-full rounded-2xl border border-[#ded5c8] bg-[#fbfaf7] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#c9a84c]"
            />
          </div>
          <Link to="/catalog" className="hidden rounded-2xl border border-[#ded5c8] px-4 py-3 text-sm font-semibold text-[#4c4033] transition hover:border-[#c9a84c] md:inline-flex">
            /catalog
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d7cbb8] bg-white p-12 text-center text-[#8c8174]">
            لا توجد منتجات مطابقة للبحث الحالي.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <Link
                key={product.id}
                to="/products/$azCode"
                params={{ azCode: product.az_code }}
                className="group overflow-hidden rounded-3xl border border-[#e5ddd1] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#c9a84c] hover:shadow-xl"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-[#eee8dc]">
                  {product.main_image_url ? (
                    <img src={product.main_image_url} alt={product.name_ar} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <Package className="size-14 text-[#c7bcac]" />
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eeeafd] px-2.5 py-1 text-[11px] font-bold text-[#5a49b8]">{product.az_code}</span>
                    {product.item_type && <span className="text-[11px] text-[#8c8174]">{product.item_type}</span>}
                  </div>
                  <h2 className="line-clamp-2 min-h-11 text-sm font-black leading-6 text-[#17130f]">{product.name_ar}</h2>
                  <p className="line-clamp-2 min-h-10 text-xs leading-5 text-[#766b5e]">{productDescription(product)}</p>
                  <div className="flex items-center justify-between border-t border-[#f0ebe2] pt-3">
                    <span className="text-xs text-[#8c8174]">عرض التفاصيل</span>
                    <span className="text-sm font-black text-[#0f6e56]">{productPrice(product)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
