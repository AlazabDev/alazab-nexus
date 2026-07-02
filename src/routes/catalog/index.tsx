import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Search, Grid3X3, List, X,
  Package, ExternalLink, QrCode as QrIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type ItemType = Database["public"]["Enums"]["item_type"];

// Monospace stack — as requested by the user
const MONO_STACK =
  '"Menlo","Monaco","Consolas","Cascadia Mono","Ubuntu Mono","DejaVu Sans Mono","Liberation Mono","JetBrains Mono","Fira Code","Cousine","Roboto Mono","Courier New",Courier,sans-serif,system-ui';

export const Route = createFileRoute("/catalog/")({
  head: () => ({
    meta: [
      { title: "كتالوج العزب للتشطيبات — كل المنتجات والخدمات" },
      { name: "description", content: "كتالوج شامل لمنتجات وخدمات العزب للتشطيبات المعمارية — أكثر من 3,000 بند" },
    ],
  }),
  component: CatalogPage,
});


// ── Types ──────────────────────────────────────────────────
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

type Filters = {
  q: string;
  brand: string;
  type: string;
  sort: "name_ar" | "unit_price_asc" | "unit_price_desc";
};

// ── Constants ──────────────────────────────────────────────
const PAGE = 24;
const S3   = "https://alazab-storage-prod.s3.amazonaws.com/catalog-images";

const BRAND_META: Record<string, { label: string; color: string; bg: string }> = {
  luxury_finishing: { label: "Luxury Finishing", color: "#534AB7", bg: "#EEEDFE" },
  brand_identity:   { label: "Brand Identity",   color: "#0F6E56", bg: "#E1F5EE" },
  uberfix:          { label: "UberFix",           color: "#185FA5", bg: "#E6F1FB" },
  laban_alasfour:   { label: "Laban Alasfour",    color: "#BA7517", bg: "#FEF3E2" },
};

const TYPE_LABELS: Record<string, string> = {
  product: "منتج", service: "خدمة", material: "مادة", spare_part: "قطعة غيار",
};

// ── Helpers ────────────────────────────────────────────────
function imgSrc(p: Product) {
  return p.main_image_url || `${S3}/${p.az_code}_1.jpg`;
}

function priceLabel(p: Product) {
  const v = p.unit_price ?? p.estimated_price;
  if (!v) return null;
  return `${Number(v).toLocaleString("ar-EG")} ج.م`;
}

// ── Sub-components ─────────────────────────────────────────
function BrandDot({ brand }: { brand: string | null }) {
  const m = BRAND_META[brand ?? ""] ?? null;
  if (!m) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function ProductCard({ p, onClick }: { p: Product; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const price = priceLabel(p);

  return (
    <article
      onClick={onClick}
      className="group bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden cursor-pointer
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,.1)]
                 flex flex-col"
    >
      <div className="relative w-full h-48 bg-[#F5F3EE] overflow-hidden">
        {!imgErr ? (
          <img
            src={imgSrc(p)}
            alt={p.name_ar}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#C5BEE8]">
            <Package className="size-12 opacity-40" />
          </div>
        )}
        {p.item_type && p.item_type !== "product" && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-[#534AB7]">
            {TYPE_LABELS[p.item_type] ?? p.item_type}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <BrandDot brand={p.brand} />
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-[#1C1917]">
          {p.name_ar}
        </h3>
        {p.description_ar && (
          <p className="text-xs text-[#8C8680] leading-relaxed line-clamp-2">{p.description_ar}</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#F0EDE8] flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-[#534AB7] font-semibold">{p.az_code}</span>
        {price
          ? <span className="text-sm font-bold text-[#0F6E56]">{price}</span>
          : <span className="text-xs text-[#B0A89E]">بدون سعر</span>}
      </div>
    </article>
  );
}

function ProductRow({ p, onClick }: { p: Product; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const price = priceLabel(p);

  return (
    <article
      onClick={onClick}
      className="flex items-center gap-4 bg-white rounded-xl border border-[#E8E4DC] px-4 py-3
                 cursor-pointer hover:border-[#C9A84C] hover:shadow-sm transition-all duration-150"
    >
      <div className="size-14 rounded-xl bg-[#F5F3EE] overflow-hidden shrink-0">
        {!imgErr ? (
          <img src={imgSrc(p)} alt="" loading="lazy" className="size-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="size-full flex items-center justify-center"><Package className="size-5 text-[#C5BEE8]" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{p.name_ar}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="font-mono text-[10px] text-[#534AB7]">{p.az_code}</span>
          {p.brand && <BrandDot brand={p.brand} />}
        </div>
      </div>
      {price && <span className="text-sm font-bold text-[#0F6E56] shrink-0">{price}</span>}
    </article>
  );
}

// ── Modal ──────────────────────────────────────────────────
function ProductModal({ p, onClose }: { p: Product; onClose: () => void }) {
  const [activeImg, setActiveImg] = useState(imgSrc(p));
  const imgs = [p.main_image_url, p.image_url_2, p.image_url_3]
    .filter(Boolean).map(String);
  const price = priceLabel(p);
  const bm = BRAND_META[p.brand ?? ""];

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-start justify-between p-5 border-b border-[#F0EDE8] gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug">{p.name_ar}</h2>
            {p.name_en && <p className="text-xs text-[#8C8680] mt-0.5">{p.name_en}</p>}
          </div>
          <button onClick={onClose} className="size-8 rounded-full bg-[#F5F3EE] flex items-center justify-center shrink-0 hover:bg-[#EAE6DE] transition">
            <X className="size-4" />
          </button>
        </div>

        {/* Main image */}
        <div className="w-full h-64 bg-[#F5F3EE]">
          <img src={activeImg} alt={p.name_ar} className="w-full h-full object-contain p-4" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>

        {/* Thumbs */}
        {imgs.length > 1 && (
          <div className="flex gap-2 px-5 py-3">
            {imgs.map((url) => (
              <button key={url} onClick={() => setActiveImg(url)}
                className={`size-14 rounded-lg overflow-hidden border-2 transition ${activeImg === url ? "border-[#C9A84C]" : "border-transparent"}`}>
                <img src={url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Details */}
        <div className="p-5 space-y-4">
          {bm && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ color: bm.color, background: bm.bg }}>
              {bm.label}
            </span>
          )}

          {p.description_ar && (
            <p className="text-sm text-[#4A4540] leading-relaxed">{p.description_ar}</p>
          )}

          <table className="w-full text-sm">
            <tbody>
              {[
                ["الكود", p.az_code],
                ["النوع", TYPE_LABELS[p.item_type ?? ""] ?? p.item_type],
                ["الفئة", p.gpc_class],
                ["السعر", price ?? "—"],
              ].filter(([, v]) => v).map(([k, v]) => (
                <tr key={k} className="border-b border-[#F0EDE8]">
                  <td className="py-2 text-[#8C8680] w-1/3">{k}</td>
                  <td className="py-2 font-medium">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-[1fr_auto] items-center gap-4 pt-2">
            <Link
              to="/catalog/$azCode"
              params={{ azCode: p.az_code }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: "#0D1B2A" }}
            >
              عرض التفاصيل <ExternalLink className="size-4" />
            </Link>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-[#E8E4DC]">
              <QRCodeSVG
                value={typeof window !== "undefined" ? `${window.location.origin}/catalog/${p.az_code}` : `/catalog/${p.az_code}`}
                size={64}
                level="M"
                includeMargin={false}
              />
              <span className="text-[9px] text-[#8C8680]" style={{ fontFamily: MONO_STACK }}>QR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
function CatalogPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [view, setView]           = useState<"grid" | "list">("grid");
  const [selected, setSelected]   = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats]         = useState({ total: 0, priced: 0, synced: 0 });
  const [filters, setFilters]     = useState<Filters>({
    q: "", brand: "", type: "", sort: "name_ar",
  });

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navigate = useNavigate();

  // إحصائيات سريعة
  useEffect(() => {
    (async () => {
      const [t, p, s] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true).not("unit_price", "is", null),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true).not("daftra_id", "is", null),
      ]);
      setStats({ total: t.count ?? 0, priced: p.count ?? 0, synced: s.count ?? 0 });
    })();
  }, []);

  const load = useCallback(async (f: Filters, pg: number) => {
    setLoading(true);
    let q = supabase.from("products")
      .select("id,az_code,name_ar,name_en,description_ar,brand,item_type,unit_price,estimated_price,main_image_url,image_url_2,image_url_3,gpc_class,operational_track,status", { count: "exact" })
      .eq("active", true)
      .not("status", "in", "(archived,rejected)")
      .range((pg - 1) * PAGE, pg * PAGE - 1);

    if (f.q)     q = q.or(`name_ar.ilike.%${f.q}%,az_code.ilike.%${f.q}%,name_en.ilike.%${f.q}%`);
    if (f.brand) q = q.eq("brand", f.brand);
    if (f.type)  q = q.eq("item_type", f.type as ItemType);

    if (f.sort === "unit_price_asc")  q = q.order("unit_price", { ascending: true,  nullsFirst: false });
    else if (f.sort === "unit_price_desc") q = q.order("unit_price", { ascending: false, nullsFirst: false });
    else                              q = q.order("name_ar", { ascending: true });

    const { data, count, error } = await q;
    if (!error) { setProducts(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }, []);

  useEffect(() => { load(filters, page); }, [filters, page, load]);

  const setFilter = (key: keyof Filters, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const onSearch = (v: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setFilter("q", v), 300);
  };

  const totalPages = Math.ceil(total / PAGE);

  return (
    <div className="min-h-screen bg-[#FAFAF8]" dir="rtl"
      style={{ fontFamily: MONO_STACK }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1a2f4a 60%, #0D1B2A 100%)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #C9A84C 0%, transparent 50%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: "#C9A84C", color: "#0D1B2A" }}>AZ</div>
            <span className="text-white font-bold text-lg">العزب للتشطيبات المعمارية</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
            كتالوج المنتجات<br />
            <span style={{ color: "#C9A84C" }}>والخدمات</span>
          </h1>
          <p className="text-white/70 text-sm leading-loose max-w-md mb-8">
            أكثر من 3,000 منتج وخدمة في مجال التشطيبات والديكور والأعمال المعمارية
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {[
              { v: stats.total.toLocaleString("ar-EG"), l: "بند إجمالي" },
              { v: stats.synced.toLocaleString("ar-EG"), l: "في دفترة" },
              { v: stats.priced.toLocaleString("ar-EG"), l: "بسعر" },
            ].map(({ v, l }) => (
              <div key={l} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.2)" }}>
                <div className="text-xl font-black" style={{ color: "#C9A84C" }}>{v}</div>
                <div className="text-xs text-white/60 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky controls ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#E8E4DC] shadow-sm">
        {/* Brand tabs */}
        <div className="flex gap-2 px-6 pt-3 overflow-x-auto pb-2 scrollbar-hide">
          {[{ key: "", label: "الكل" }, ...Object.entries(BRAND_META).map(([k, m]) => ({ key: k, label: m.label }))].map(({ key, label }) => {
            const active = filters.brand === key;
            const m = BRAND_META[key];
            return (
              <button key={key}
                onClick={() => setFilter("brand", key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all"
                style={active
                  ? { background: m?.color ?? "#0D1B2A", color: "#fff", borderColor: m?.color ?? "#0D1B2A" }
                  : { background: m?.bg ?? "#F5F3EE", color: m?.color ?? "#4A4540", borderColor: "transparent" }
                }
              >{label}</button>
            );
          })}
        </div>

        {/* Search & tools */}
        <div className="flex items-center gap-2 px-6 pb-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#B0A89E]" />
            <input
              type="text" placeholder="ابحث بالاسم أو الكود..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E8E4DC] rounded-xl outline-none
                         focus:border-[#C9A84C] bg-[#FAFAF8] transition"
            />
          </div>

          <select value={filters.type} onChange={(e) => setFilter("type", e.target.value)}
            className="px-3 py-2.5 text-sm border border-[#E8E4DC] rounded-xl outline-none bg-[#FAFAF8] focus:border-[#C9A84C]">
            <option value="">كل الأنواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value as Filters["sort"])}
            className="px-3 py-2.5 text-sm border border-[#E8E4DC] rounded-xl outline-none bg-[#FAFAF8] focus:border-[#C9A84C]">
            <option value="name_ar">الاسم</option>
            <option value="unit_price_asc">السعر ↑</option>
            <option value="unit_price_desc">السعر ↓</option>
          </select>

          <div className="flex gap-1">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`size-9 rounded-xl border flex items-center justify-center transition
                  ${view === v ? "bg-[#0D1B2A] border-[#0D1B2A] text-white" : "border-[#E8E4DC] text-[#8C8680]"}`}>
                {v === "grid" ? <Grid3X3 className="size-4" /> : <List className="size-4" />}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#8C8680] whitespace-nowrap font-medium">
            {total.toLocaleString("ar-EG")} بند
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="size-10 rounded-full border-3 border-[#E8E4DC] border-t-[#C9A84C] animate-spin" />
            <p className="text-sm text-[#8C8680]">جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Package className="size-12 mx-auto text-[#C5BEE8] mb-4" />
            <p className="text-[#8C8680]">لا توجد نتائج</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} onClick={() => setSelected(p)} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p) => <ProductRow key={p.id} p={p} onClick={() => setSelected(p)} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-sm rounded-xl border border-[#E8E4DC] disabled:opacity-40 hover:border-[#C9A84C] transition">
              ‹ السابق
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const n = page <= 4 ? i + 1 : page + i - 3;
              if (n < 1 || n > totalPages) return null;
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`size-9 rounded-xl text-sm font-medium border transition
                    ${n === page ? "bg-[#0D1B2A] text-white border-[#0D1B2A]" : "border-[#E8E4DC] hover:border-[#C9A84C]"}`}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 text-sm rounded-xl border border-[#E8E4DC] disabled:opacity-40 hover:border-[#C9A84C] transition">
              التالي ›
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      {selected && <ProductModal p={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
