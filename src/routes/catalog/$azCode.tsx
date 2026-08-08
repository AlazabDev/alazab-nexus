import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Package, Printer, Share2, Phone, FileText, Info, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  specifications: any;
  materials: any;
  status: string | null;
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

export const Route = createFileRoute("/catalog/$azCode")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("public_catalog_products")
      .select(
        "id,az_code,daftra_id,egs_code,name_ar,name_en,description_ar,description_en,brand,item_type,unit_label,category,gpc_class,gpc_family,gpc_segment,gpc_brick_title,operational_track,unit_price,estimated_price,main_image_url,image_url_2,image_url_3,specifications,materials,status",
      )
      .eq("az_code", params.azCode)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { product: data as unknown as PublicProduct };
  },

  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name_ar} — كتالوج العزب` },
          {
            name: "description",
            content: loaderData.product.description_ar ?? loaderData.product.name_ar,
          },
          { property: "og:title", content: loaderData.product.name_ar },
          {
            property: "og:description",
            content: loaderData.product.description_ar ?? loaderData.product.name_ar,
          },
          ...(loaderData.product.main_image_url
            ? [
                { property: "og:image", content: loaderData.product.main_image_url },
                { name: "twitter:image", content: loaderData.product.main_image_url },
              ]
            : []),
          { property: "og:type", content: "product" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "منتج غير موجود" }],
  }),
  component: ProductDetail,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-4">
        <Package className="size-14 mx-auto text-muted-foreground" />
        <h1 className="text-lg font-bold">المنتج غير متوفر</h1>
        <Button asChild>
          <Link to="/catalog" className="gap-2">
            <ArrowRight className="size-4" /> رجوع للكتالوج
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ProductDetail() {
  const { product: p } = Route.useLoaderData();
  const images = [p.main_image_url, p.image_url_2, p.image_url_3].filter(Boolean) as string[];
  const [active, setActive] = useState<string | null>(images[0] ?? null);
  const qrRef = useRef<HTMLDivElement>(null);
  const price = p.unit_price ?? p.estimated_price;

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name_ar,
    sku: p.az_code,
    description: p.description_ar ?? p.name_ar,
    image: images[0],
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: price
      ? {
          "@type": "Offer",
          priceCurrency: "EGP",
          price: String(price),
          availability: "https://schema.org/InStock",
          url: shareUrl,
        }
      : undefined,
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/catalog">
              <ArrowRight className="size-4" /> الكتالوج
            </Link>
          </Button>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" onClick={handleShare} title="مشاركة">
              <Share2 className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrint} title="طباعة">
              <Printer className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Gallery */}
        <section className="space-y-3">
          <div className="w-full aspect-square rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center">
            {active ? (
              <img src={active} alt={p.name_ar} className="w-full h-full object-contain p-6" />
            ) : (
              <Package className="size-20 text-muted-foreground" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url) => (
                <button
                  key={url}
                  onClick={() => setActive(url)}
                  className={`size-16 md:size-20 shrink-0 rounded-xl overflow-hidden border-2 transition ${active === url ? "border-ring" : "border-transparent hover:border-border"}`}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <section className="space-y-5">
          <div>
            {p.brand && (
              <div className="text-xs font-semibold text-primary mb-2">{p.brand}</div>
            )}
            <h1 className="text-2xl md:text-3xl font-black leading-tight text-foreground">{p.name_ar}</h1>
            {p.name_en && <div className="text-sm text-muted-foreground mt-1" dir="ltr">{p.name_en}</div>}
          </div>

          {price && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-success">{Number(price).toLocaleString("ar-EG")}</span>
              <span className="text-sm text-muted-foreground">ج.م</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(`شاهد هذا البند: ${p.name_ar} - ${shareUrl}`)}`} target="_blank" rel="noreferrer">
                <Phone className="size-4" /> استفسر عبر واتساب
              </a>
            </Button>
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="size-4" /> مشاركة الرابط
            </Button>
          </div>

          <Tabs defaultValue="description" className="w-full">
            <TabsList className="bg-card border">
              <TabsTrigger value="description" className="gap-1">
                <FileText className="size-3.5" /> الوصف
              </TabsTrigger>
              <TabsTrigger value="specs" className="gap-1">
                <Info className="size-3.5" /> المواصفات
              </TabsTrigger>
              <TabsTrigger value="qr" className="gap-1">
                <ChevronLeft className="size-3.5" /> QR
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4">
              <div className="bg-card rounded-2xl border border-border p-5">
                {p.description_ar ? (
                  <p className="text-sm leading-loose text-foreground">{p.description_ar}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">لا يوجد وصف تفصيلي.</p>
                )}
                {p.description_en && (
                  <p className="text-sm leading-loose text-muted-foreground mt-4" dir="ltr">
                    {p.description_en}
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="specs" className="mt-4">
              <div className="bg-card rounded-2xl border border-border p-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rows
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
                        <dd className="text-sm font-medium text-foreground">{value}</dd>
                      </div>
                    ))}
                </dl>
                {p.specifications && Object.keys(p.specifications).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-sm font-bold mb-3">تفاصيل فنية</h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(p.specifications).map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-xs text-muted-foreground mb-0.5">{k}</dt>
                          <dd className="text-sm font-medium text-foreground">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="qr" className="mt-4">
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl">
                  <QRCodeSVG value={shareUrl} size={180} level="H" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">امسح الكود للوصول إلى صفحة هذا البند مباشرة</p>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="border-t py-6 mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} العزب للتشطيبات المعمارية — كتالوج المنتجات والخدمات
      </footer>
    </div>
  );
}
