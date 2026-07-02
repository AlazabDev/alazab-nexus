import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Package, Download, Printer, Share2 } from "lucide-react";

// Same monospace stack used on the catalog list — as requested
const MONO_STACK =
  '"Menlo","Monaco","Consolas","Cascadia Mono","Ubuntu Mono","DejaVu Sans Mono","Liberation Mono","JetBrains Mono","Fira Code","Cousine","Roboto Mono","Courier New",Courier,sans-serif,system-ui';

type PublicProduct = {
  id: string;
  az_code: string;
  daftra_id: string | null;
  egs_code: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  brand: string | null;
  item_type: string | null;
  unit_label: string | null;
  category: string | null;
  gpc_class: string | null;
  gpc_family: string | null;
  gpc_segment: string | null;
  gpc_brick_title: string | null;
  operational_track: string | null;
  unit_price: number | null;
  estimated_price: number | null;
  main_image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  status: string | null;
};

const BRAND_META: Record<string, { label: string; color: string; bg: string }> = {
  luxury_finishing: { label: "Luxury Finishing", color: "#534AB7", bg: "#EEEDFE" },
  brand_identity:   { label: "Brand Identity",   color: "#0F6E56", bg: "#E1F5EE" },
  uberfix:          { label: "UberFix",           color: "#185FA5", bg: "#E6F1FB" },
  laban_alasfour:   { label: "Laban Alasfour",    color: "#BA7517", bg: "#FEF3E2" },
};

const TYPE_LABELS: Record<string, string> = {
  product: "منتج", service: "خدمة", material: "مادة", spare_part: "قطعة غيار",
  tool: "أداة", bundle: "حزمة", package: "باكدج", work_item: "بند عمل",
  finish_item: "بند تشطيب", supplier_item: "بند مورد", custom_unit: "وحدة خاصة",
};

export const Route = createFileRoute("/catalog/$azCode")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,az_code,daftra_id,egs_code,name_ar,name_en,description_ar,description_en,brand,item_type,unit_label,category,gpc_class,gpc_family,gpc_segment,gpc_brick_title,operational_track,unit_price,estimated_price,main_image_url,image_url_2,image_url_3,status"
      )
      .eq("az_code", params.azCode)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { product: data as PublicProduct };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name_ar} — كتالوج العزب` },
          { name: "description", content: loaderData.product.description_ar ?? loaderData.product.name_ar },
        ]
      : [{ title: "منتج غير موجود" }],
  }),
  component: ProductDetail,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]" dir="rtl" style={{ fontFamily: MONO_STACK }}>
      <div className="text-center space-y-4">
        <Package className="size-14 mx-auto text-[#C5BEE8]" />
        <h1 className="text-lg font-bold">المنتج غير متوفر</h1>
        <Link to="/catalog" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D1B2A] text-white text-sm">
          <ArrowRight className="size-4" /> رجوع للكتالوج
        </Link>
      </div>
    </div>
  );
}

function ProductDetail() {
  const { product: p } = Route.useLoaderData();
  const images = [p.main_image_url, p.image_url_2, p.image_url_3].filter(Boolean) as string[];
  const [active, setActive] = useState<string | null>(images[0] ?? null);
  const price = p.unit_price ?? p.estimated_price;
  const bm = BRAND_META[p.brand ?? ""];

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/catalog/${p.az_code}`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: p.name_ar, url: shareUrl });
      } catch {
        /* cancelled */
      }
    } else if (typeof navigator !== "undefined") {
      await navigator.clipboard.writeText(shareUrl);
      alert("تم نسخ الرابط");
    }
  };

  const handlePrint = () => window.print();

  const rows: Array<[string, string | number | null]> = [
    ["الكود", p.az_code],
    ["كود EGS", p.egs_code],
    ["ID دفترة", p.daftra_id],
    ["النوع", TYPE_LABELS[p.item_type ?? ""] ?? p.item_type],
    ["الوحدة", p.unit_label],
    ["الفئة", p.category],
    ["GPC Class", p.gpc_class],
    ["GPC Family", p.gpc_family],
    ["GPC Brick", p.gpc_brick_title],
    ["المسار التشغيلي", p.operational_track],
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]" dir="rtl" style={{ fontFamily: MONO_STACK }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E8E4DC]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-xs md:text-sm text-[#4A4540] hover:text-[#0D1B2A] transition">
            <ArrowRight className="size-4" /> الكتالوج
          </Link>
          <div className="flex items-center gap-1.5">
            <button onClick={handleShare} className="size-9 rounded-lg border border-[#E8E4DC] flex items-center justify-center hover:border-[#C9A84C] transition" title="مشاركة">
              <Share2 className="size-4" />
            </button>
            <button onClick={handlePrint} className="size-9 rounded-lg border border-[#E8E4DC] flex items-center justify-center hover:border-[#C9A84C] transition" title="طباعة">
              <Printer className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Gallery */}
        <section className="space-y-3">
          <div className="w-full aspect-square rounded-2xl bg-white border border-[#E8E4DC] overflow-hidden flex items-center justify-center">
            {active ? (
              <img src={active} alt={p.name_ar} className="w-full h-full object-contain p-6" />
            ) : (
              <Package className="size-20 text-[#C5BEE8]" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url) => (
                <button
                  key={url}
                  onClick={() => setActive(url)}
                  className={`size-16 md:size-20 shrink-0 rounded-xl overflow-hidden border-2 transition ${active === url ? "border-[#C9A84C]" : "border-transparent hover:border-[#E8E4DC]"}`}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <section className="space-y-5">
          <div className="space-y-2">
            {bm && (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ color: bm.color, background: bm.bg }}
              >
                <span className="size-1.5 rounded-full" style={{ background: bm.color }} />
                {bm.label}
              </span>
            )}
            <h1 className="text-xl md:text-2xl font-bold leading-snug text-[#0D1B2A]">{p.name_ar}</h1>
            {p.name_en && <p className="text-sm text-[#8C8680]">{p.name_en}</p>}
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            {price ? (
              <>
                <span className="text-2xl md:text-3xl font-bold text-[#0F6E56]">
                  {Number(price).toLocaleString("ar-EG")} <span className="text-sm">ج.م</span>
                </span>
                {p.unit_label && <span className="text-xs text-[#8C8680]">/ {p.unit_label}</span>}
                {!p.unit_price && p.estimated_price != null && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3E2] text-[#BA7517] font-semibold">تقديري</span>
                )}
              </>
            ) : (
              <span className="text-sm text-[#B0A89E]">السعر عند الطلب</span>
            )}
          </div>

          {p.description_ar && (
            <p className="text-sm leading-loose text-[#4A4540] whitespace-pre-line">{p.description_ar}</p>
          )}

          {/* QR + AZ code card */}
          <div className="rounded-2xl bg-white border border-[#E8E4DC] p-4 flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg border border-[#E8E4DC]">
              <QRCodeSVG value={shareUrl} size={96} level="M" includeMargin={false} />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-[#8C8680]">AZ Code</div>
              <div className="text-lg font-bold text-[#534AB7] break-all">{p.az_code}</div>
              <a
                href={`data:image/svg+xml;utf8,${encodeURIComponent(
                  `<?xml version="1.0" encoding="UTF-8"?>` +
                    (document.querySelector(`[data-qr="${p.az_code}"]`)?.outerHTML ?? "")
                )}`}
                onClick={(e) => {
                  e.preventDefault();
                  const svg = document.querySelector<SVGSVGElement>("svg[data-qr='" + p.az_code + "']");
                  if (!svg) return;
                  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `qr-${p.az_code}.svg`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-[#0D1B2A] hover:text-[#C9A84C] transition"
              >
                <Download className="size-3" /> تنزيل QR (SVG)
              </a>
              {/* Hidden reference SVG used for the download */}
              <div className="hidden">
                <QRCodeSVG value={shareUrl} size={512} level="M" includeMargin={false} />
              </div>
            </div>
          </div>

          {/* Specs table */}
          <div className="rounded-2xl bg-white border border-[#E8E4DC] overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {rows
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => (
                    <tr key={k} className="border-b border-[#F0EDE8] last:border-b-0">
                      <td className="py-2.5 px-4 text-[#8C8680] w-1/3 text-xs">{k}</td>
                      <td className="py-2.5 px-4 font-medium text-[#1C1917]">{String(v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E4DC] py-6 mt-6 text-center text-[11px] text-[#8C8680]">
        © {new Date().getFullYear()} العزب للتشطيبات المعمارية — كتالوج المنتجات والخدمات
      </footer>
    </div>
  );
}
