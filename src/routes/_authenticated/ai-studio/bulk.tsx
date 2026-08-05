import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ImageIcon, FileText, RotateCw, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { azureBulkOptimizeContent } from "@/lib/azure-bulk-optimize.functions";
import { generateProductImages } from "@/lib/product-image-gen.functions";
import { getAzureStatus } from "@/lib/azure.functions";
import { useAiOps } from "@/hooks/use-ai-ops";
import { AiOpsPanel } from "@/components/ai-ops-panel";
import { sanitizeSearchTerm } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai-studio/bulk")({
  component: BulkAzurePage,
});

type Filter = "all" | "missing_desc" | "missing_images" | "missing_name_en";
type FieldKey =
  | "name_ar"
  | "name_en"
  | "short_description_ar"
  | "short_description_en"
  | "description_ar"
  | "description_en"
  | "marketing_content"
  | "technical_content"
  | "tags"
  | "search_keywords";

const ALL_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "name_ar", label: "الاسم (عربي)" },
  { key: "name_en", label: "Name (EN)" },
  { key: "short_description_ar", label: "وصف قصير (عربي)" },
  { key: "short_description_en", label: "Short desc (EN)" },
  { key: "description_ar", label: "وصف تفصيلي (عربي)" },
  { key: "description_en", label: "Description (EN)" },
  { key: "marketing_content", label: "محتوى تسويقي" },
  { key: "technical_content", label: "محتوى فني" },
  { key: "tags", label: "وسوم" },
  { key: "search_keywords", label: "كلمات بحث" },
];

const BATCH_SIZE = 10;

function BulkAzurePage() {
  const qc = useQueryClient();
  const aiOps = useAiOps();
  const optimize = useServerFn(azureBulkOptimizeContent);
  const genImages = useServerFn(generateProductImages);

  const [filter, setFilter] = useState<Filter>("missing_desc");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fields, setFields] = useState<Set<FieldKey>>(
    new Set(["name_ar", "name_en", "short_description_ar", "description_ar", "description_en", "tags", "search_keywords"]),
  );
  const [overwrite, setOverwrite] = useState(false);
  const [runContent, setRunContent] = useState(true);
  const [runImages, setRunImages] = useState(false);

  const azureStatus = useQuery({
    queryKey: ["azure-status"],
    queryFn: () => getAzureStatus(),
    staleTime: 60_000,
  });

  const products = useQuery({
    queryKey: ["bulk-azure-products", filter, search],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, az_code, name_ar, name_en, description_ar, description_en")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (filter === "missing_desc") q = q.or("description_ar.is.null,description_ar.eq.");
      if (filter === "missing_name_en") q = q.or("name_en.is.null,name_en.eq.");
      if (search.trim()) q = q.or(`az_code.ilike.%${sanitizeSearchTerm(search)}%,name_ar.ilike.%${sanitizeSearchTerm(search)}%,name_en.ilike.%${sanitizeSearchTerm(search)}%`);
      const { data, error } = await q;
      if (error) throw error;
      if (filter === "missing_images" && data?.length) {
        const ids = data.map((p) => p.id);
        const { data: links } = await supabase
          .from("product_assets")
          .select("product_id")
          .in("product_id", ids);
        const have = new Set((links ?? []).map((l) => l.product_id));
        return data.filter((p) => !have.has(p.id));
      }
      return data ?? [];
    },
  });

  const list = products.data ?? [];

  const toggle = (id: string) => {
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === list.length) setSelected(new Set());
    else setSelected(new Set(list.map((p) => p.id)));
  };

  const toggleField = (k: FieldKey) => {
    setFields((cur) => {
      const n = new Set(cur);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const ids = useMemo(() => Array.from(selected), [selected]);
  const azureReady = azureStatus.data?.ready;

  const runAll = async () => {
    if (!ids.length) return toast.error("اختر منتجاً واحداً على الأقل");
    if (!runContent && !runImages) return toast.error("اختر نوع التحسين");
    if (runContent && fields.size === 0) return toast.error("اختر حقلاً واحداً على الأقل");
    if (runContent && !azureReady) return toast.error("Azure OpenAI غير مهيأ");

    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) batches.push(ids.slice(i, i + BATCH_SIZE));

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];

      if (runContent) {
        await aiOps.start(
          "ai-generate",
          `Azure محتوى · دفعة ${bi + 1}/${batches.length} (${batch.length})`,
          async (ctx) => {
            ctx.log(`المنتجات: ${batch.length}`);
            ctx.log(`الحقول: ${Array.from(fields).join(", ")}`);
            ctx.log(`overwrite: ${overwrite}`);
            ctx.setProgress(20);
            const res = await optimize({
              data: { productIds: batch, fields: Array.from(fields), overwrite },
            });
            ctx.setProgress(85);
            ctx.log(`تم تحديث ${res.totalUpdated} · فشل ${res.totalFailed}`, res.totalFailed ? "warn" : "success");
            res.summary.filter((s) => s.error).slice(0, 5).forEach((s) => ctx.log(`✗ ${s.azCode}: ${s.error}`, "error"));
            qc.invalidateQueries({ queryKey: ["bulk-azure-products"] });
          },
        );
      }

      if (runImages) {
        await aiOps.start(
          "ai-generate",
          `صور AI · دفعة ${bi + 1}/${batches.length} (${batch.length})`,
          async (ctx) => {
            ctx.log(`توليد 3 صور لكل منتج عبر AI Gateway`);
            ctx.setProgress(20);
            const res = await genImages({ data: { productIds: batch } });
            ctx.setProgress(90);
            ctx.log(`تم إنشاء ${res.totalGenerated} صورة · فشل ${res.totalFailed}`, res.totalFailed ? "warn" : "success");
            qc.invalidateQueries({ queryKey: ["bulk-azure-products"] });
          },
        );
      }
    }
    toast.success("اكتملت جميع الدفعات");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Azure AI · ضبط جماعي للمنتجات"
        description="استخدم Azure OpenAI لتحسين محتوى المنتجات و AI Gateway لإنشاء صورها بشكل جماعي"
      />

      {!azureStatus.isLoading && !azureReady && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Azure OpenAI غير مكتمل التهيئة</p>
              <p className="text-muted-foreground">
                تأكد من ضبط AZURE_OPENAI_ENDPOINT و AZURE_OPENAI_API_KEY و AZURE_OPENAI_DEPLOYMENT. تحسين المحتوى لن يعمل، لكن إنشاء الصور عبر AI Gateway متاح.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>اختيار المنتجات</span>
              <Badge variant="secondary">{selected.size} محدد</Badge>
            </CardTitle>
            <CardDescription>صفّ المنتجات حسب الحاجة ثم حدد ما تريد معالجته</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المنتجات</SelectItem>
                  <SelectItem value="missing_desc">بدون وصف عربي</SelectItem>
                  <SelectItem value="missing_name_en">بدون اسم إنجليزي</SelectItem>
                  <SelectItem value="missing_images">بدون صور</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برمز AZ أو الاسم…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Button variant="outline" onClick={toggleAll} disabled={!list.length}>
                {selected.size === list.length && list.length ? "إلغاء الكل" : "تحديد الكل"}
              </Button>
            </div>

            <ScrollArea className="h-[440px] rounded-md border">
              {products.isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">جاري التحميل…</div>
              ) : !list.length ? (
                <div className="p-6 text-sm text-muted-foreground">لا توجد منتجات مطابقة</div>
              ) : (
                <ul className="divide-y">
                  {list.map((p) => {
                    const checked = selected.has(p.id);
                    return (
                      <li key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                        <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name_ar || p.name_en || p.az_code}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{p.az_code}</span>
                            {!p.description_ar && <Badge variant="outline" className="h-4 text-[10px]">بدون وصف</Badge>}
                            {!p.name_en && <Badge variant="outline" className="h-4 text-[10px]">بدون EN</Badge>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> نوع التحسين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" /> تحسين المحتوى (Azure OpenAI)
                </span>
                <Switch checked={runContent} onCheckedChange={setRunContent} />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-sm">
                  <ImageIcon className="h-4 w-4" /> إنشاء صور (AI Gateway)
                </span>
                <Switch checked={runImages} onCheckedChange={setRunImages} />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t">
                <span className="text-sm">استبدال الحقول الموجودة</span>
                <Switch checked={overwrite} onCheckedChange={setOverwrite} />
              </label>
            </CardContent>
          </Card>

          {runContent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الحقول</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {ALL_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={fields.has(f.key)} onCheckedChange={() => toggleField(f.key)} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          <Button size="lg" className="w-full" onClick={runAll} disabled={!selected.size}>
            <RotateCw className="h-4 w-4 ml-2" />
            تشغيل على {selected.size} منتج
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            تتم المعالجة على دفعات بحجم {BATCH_SIZE}
          </p>
        </div>
      </div>

      <AiOpsPanel ops={aiOps.ops} onRetry={aiOps.retry} onDismiss={aiOps.remove} onClearDone={aiOps.clearDone} />
    </div>
  );
}

