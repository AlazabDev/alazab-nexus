import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, Tags, Ruler, DollarSign, Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/products/settings")({
  head: () => ({ meta: [{ title: "إعدادات المنتجات — Alazab PAOP" }] }),
  component: ProductSettings,
});

function ProductSettings() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "product-settings-stats"],
    queryFn: async () => {
      const [products, categories, families, units, pricingRules, aiJobs] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("families").select("*", { count: "exact", head: true }),
        supabase.from("units").select("*", { count: "exact", head: true }),
        supabase.from("pricing_rules").select("*", { count: "exact", head: true }),
        supabase.from("ai_optimization_jobs").select("*", { count: "exact", head: true }),
      ]);
      return {
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        families: families.count ?? 0,
        units: units.count ?? 0,
        pricingRules: pricingRules.count ?? 0,
        aiJobs: aiJobs.count ?? 0,
      };
    },
  });

  const sections = [
    {
      title: "البيانات الأساسية",
      description: "الفئات، العائلات، الوحدات، والعلامات التجارية",
      icon: Layers,
      links: [
        { to: "/admin/categories", label: "الفئات" },
        { to: "/admin/families", label: "العائلات" },
        { to: "/admin/units", label: "الوحدات" },
      ],
    },
    {
      title: "إدارة المنتجات",
      description: "إنشاء المنتجات، التصنيف، والكتالوجات العامة",
      icon: Package,
      links: [
        { to: "/products/new", label: "منتج جديد" },
        { to: "/products", label: "قائمة المنتجات" },
        { to: "/admin/catalogs", label: "الكتالوجات" },
      ],
    },
    {
      title: "التسعير",
      description: "قواعد التسعير، الأسعار، والهوامش",
      icon: DollarSign,
      links: [
        { to: "/pricing", label: "قواعد التسعير" },
        { to: "/import", label: "استيراد الأسعار" },
        { to: "/export", label: "تصدير البيانات" },
      ],
    },
    {
      title: "الذكاء الاصطناعي",
      description: "ضبط المحتوى، الصور، والبيانات الفنية",
      icon: Sparkles,
      links: [
        { to: "/ai-studio", label: "استوديو الذكاء الاصطناعي" },
        { to: "/ai-studio/bulk", label: "الضبط الجماعي" },
        { to: "/ai-review", label: "مراجعة الذكاء الاصطناعي" },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إعدادات المنتجات</h1>
        <p className="text-sm text-muted-foreground">مركز تحكم موارد المنتجات والكتالوجات</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="المنتجات" value={stats?.products ?? 0} icon={Package} />
          <StatCard label="الفئات" value={stats?.categories ?? 0} icon={Tags} />
          <StatCard label="العائلات" value={stats?.families ?? 0} icon={Layers} />
          <StatCard label="الوحدات" value={stats?.units ?? 0} icon={Ruler} />
          <StatCard label="قواعد التسعير" value={stats?.pricingRules ?? 0} icon={DollarSign} />
          <StatCard label="مهام AI" value={stats?.aiJobs ?? 0} icon={Sparkles} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Card key={s.title} className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <s.icon className="size-5" />
              </div>
              <div>
                <h2 className="font-bold">{s.title}</h2>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-auto">
              {s.links.map((l) => (
                <Button key={l.to} variant="outline" size="sm" asChild>
                  <Link to={l.to}>{l.label}</Link>
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Package }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl bg-muted text-muted-foreground grid place-items-center">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-black">{value.toLocaleString("ar-EG")}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
