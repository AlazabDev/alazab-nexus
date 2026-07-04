import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Package, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

type PublicProduct = {
  id: string;
  az_code: string;
  egs_code: string | null;
  daftra_id: string | null;
  name_ar: string;
  name_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;
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

export const Route = createFileRoute("/products/$azCode")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,az_code,egs_code,daftra_id,name_ar,name_en,short_description_ar,short_description_en,description_ar,description_en,brand,item_type,unit_label,category,gpc_class,gpc_family,gpc_segment,gpc_brick_title,operational_track,unit_price,estimated_price,main_image_url,image_url_2,image_url_3,status",
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
          { title: `${loaderData.product.name_ar} — منتجات العزب` },
          {
            name: "description",
            content:
              loaderData.product.short_description_ar ||
              loaderData.product.description_ar ||
              loaderData.product.name_ar,
          },
        ]
      : [{ title: "منتج غير موجود" }],
  }),
  component: ProductPublicPage,
  notFoundComponent: ProductNotFound,
});

function priceLabel(product: PublicProduct) {
  const value = product.unit_price ?? product.estimated_price;
  if (!value) return "السعر عند الطلب";
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

function ProductNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] p-6" dir="rtl">
      <div className="max-w-md rounded-3xl border border-[#e5ddd1] bg-white p-8 text-center shadow-sm">
        <Package className="mx-auto mb-4 size-14 text-[#c7bcac]" />
        <h1 className="text-xl font-black text-[#15110d]">المنتج غير موجود</h1>
        <p className="mt-2 text-sm leading-7 text-[#766b5e]">قد يكون الكود غير صحيح أو المنتج غير مفعل للعرض العام.</p>
        <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0d1b2a] px-5 py-3 text-sm font-bold text-white">
          <ArrowRight className="size-4" /> رجوع للمنتجات
        </Link>
      </div>
    </main>
  );
}

function ProductPublicPage() {
  const { product } = Route.useLoaderData();
  const images = [product.main_image_url, product.image_url_2, product.image_url_3].filter(Boolean) as string[];
  const description = product.description_ar || product.short_description_ar || product.description_en || product.short_description_en;
  const productUrl = typeof window !== "undefined" ? window.location.href : `/products/${product.az_code}`;

  const rows: Array<[string, string | number | null]> = [
    ["كود AZ", product.az_code],
    ["كود EGS", product.egs_code],
    ["دفترة", product.daftra_id],
    ["البراند", product.brand],
    ["النوع", product.item_type],
    ["الوحدة", product.unit_label],
    ["الفئة", product.category],
    ["GPC Segment", product.gpc_segment],
    ["GPC Family", product.gpc_family],
    ["GPC Class", product.gpc_class],
    ["GPC Brick", product.gpc_brick_title],
    ["المسار التشغيلي", product.operational_track],
  ];

  const share = async () => {
    if (typeof navigator === "undefined") return;
    if (navigator.share) {
      await navigator.share({ title: product.name_ar, url: productUrl });
      return;
    }
    await navigator.clipboard.writeText(productUrl);
  };

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#15110d]" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-[#e5ddd1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-[#4c4033] transition hover:text-[#0d1b2a]">
            <ArrowRight className="size-4" /> كل المنتجات
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={share} className="inline-flex items-center gap-2 rounded-2xl border border-[#ded5c8] px-4 py-2 text-sm font-semibold transition hover:border-[#c9a84c]">
              <Share2 className="size-4" /> مشاركة
            </button>
            <Link to="/catalog/$azCode" params={{ azCode: product.az_code }} className="hidden rounded-2xl border border-[#ded5c8] px-4 py-2 text-sm font-semibold text-[#4c4033] transition hover:border-[#c9a84c] md:inline-flex">
              قالب الكتالوج
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.08fr_.92fr] md:px-8 md:py-12">
        <div className="space-y-4">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] border border-[#e5ddd1] bg-white shadow-sm">
            {images[0] ? (
              <img src={images[0]} alt={product.name_ar} className="h-full w-full object-contain p-6" />
            ) : (
              <Package className="size-20 text-[#c7bcac]" />
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {images.slice(0, 3).map((image) => (
                <div key={image} className="aspect-square overflow-hidden rounded-2xl border border-[#e5ddd1] bg-white">
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <article className="space-y-6">
          <div className="rounded-[2rem] border border-[#e5ddd1] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eeeafd] px-3 py-1 text-xs font-black text-[#5a49b8]">{product.az_code}</span>
              {product.item_type && <span className="rounded-full bg-[#eef7f2] px-3 py-1 text-xs font-bold text-[#0f6e56]">{product.item_type}</span>}
              {product.status && <span className="rounded-full bg-[#f6efe2] px-3 py-1 text-xs font-bold text-[#936411]">{product.status}</span>}
            </div>

            <h1 className="text-2xl font-black leading-tight md:text-4xl">{product.name_ar}</h1>
            {product.name_en && <p className="mt-2 text-sm text-[#8c8174] md:text-base">{product.name_en}</p>}

            <div className="mt-6 rounded-3xl bg-[#f7f4ee] p-5">
              <div className="text-xs font-bold text-[#8c8174]">السعر</div>
              <div className="mt-1 text-3xl font-black text-[#0f6e56]">{priceLabel(product)}</div>
            </div>

            {description && <p className="mt-6 whitespace-pre-line text-sm leading-8 text-[#4c4033] md:text-base">{description}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/201004006620?text=${encodeURIComponent(`أريد الاستعلام عن المنتج ${product.az_code} - ${product.name_ar}`)}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0d1b2a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#142942]"
              >
                <MessageCircle className="size-4" /> استعلام عن المنتج
              </a>
              <button onClick={() => window.print()} className="rounded-2xl border border-[#ded5c8] px-5 py-3 text-sm font-bold text-[#4c4033] transition hover:border-[#c9a84c]">
                طباعة الصفحة
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="overflow-hidden rounded-[2rem] border border-[#e5ddd1] bg-white shadow-sm">
              <table className="w-full text-sm">
                <tbody>
                  {rows
                    .filter(([, value]) => value !== null && value !== undefined && value !== "")
                    .map(([label, value]) => (
                      <tr key={label} className="border-b border-[#f0ebe2] last:border-b-0">
                        <td className="w-36 px-4 py-3 text-xs font-bold text-[#8c8174]">{label}</td>
                        <td className="px-4 py-3 font-semibold text-[#241f18]">{String(value)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-[#e5ddd1] bg-white p-5 shadow-sm">
              <QrCode className="mb-3 size-5 text-[#8c8174]" />
              <QRCodeSVG value={productUrl} size={128} level="M" includeMargin />
              <div className="mt-2 text-center text-xs font-bold text-[#8c8174]">QR المنتج</div>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
