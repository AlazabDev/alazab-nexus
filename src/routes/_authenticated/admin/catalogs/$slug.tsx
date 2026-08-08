import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Search, GripVertical, Trash2, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Catalog = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  is_public: boolean;
};

type CatalogItem = {
  id: string;
  catalog_id: string;
  product_id: string;
  sort_order: number;
  featured: boolean;
  product: {
    id: string;
    az_code: string;
    name_ar: string;
    name_en: string | null;
    main_image_url: string | null;
  } | null;
};

type ProductOption = {
  id: string;
  az_code: string;
  name_ar: string;
  name_en: string | null;
  main_image_url: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/catalogs/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("product_catalogs")
      .select("id, slug, title_ar, title_en, description_ar, description_en, cover_image_url, is_public")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { catalog: data as Catalog };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `تعديل ${loaderData.catalog.title_ar} — Alazab PAOP` : "الكتالوج غير موجود" }],
  }),
  component: CatalogEdit,
  notFoundComponent: CatalogNotFound,
});

function CatalogNotFound() {
  return (
    <div className="p-6 text-center" dir="rtl">
      <h1 className="text-lg font-bold">الكتالوج غير موجود</h1>
      <Button asChild variant="outline" className="mt-4 gap-2">
        <Link to="/admin/catalogs">
          <ArrowRight className="size-4" /> رجوع
        </Link>
      </Button>
    </div>
  );
}

function CatalogEdit() {
  const { catalog } = Route.useLoaderData();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(catalog);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["admin", "catalog-items", catalog.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("id, catalog_id, product_id, sort_order, featured, product:products(id, az_code, name_ar, name_en, main_image_url)")
        .eq("catalog_id", catalog.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CatalogItem[];
    },
  });

  const { data: productOptions } = useQuery({
    queryKey: ["admin", "product-options", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, az_code, name_ar, name_en, main_image_url")
        .or(`name_ar.ilike.%${search}%,az_code.ilike.%${search}%`)
        .eq("status", "approved")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ProductOption[];
    },
    enabled: search.trim().length > 0,
  });

  const existingIds = useMemo(() => new Set(items?.map((i) => i.product_id) ?? []), [items]);

  const updateCatalog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("product_catalogs")
        .update({
          title_ar: form.title_ar,
          title_en: form.title_en || null,
          description_ar: form.description_ar || null,
          description_en: form.description_en || null,
          cover_image_url: form.cover_image_url || null,
          is_public: form.is_public,
        })
        .eq("id", catalog.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      toast.success("تم حفظ التغييرات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("catalog_items").insert({
        catalog_id: catalog.id,
        product_id: productId,
        sort_order: (items?.length ?? 0) * 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "catalog-items", catalog.id] });
      setSearch("");
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("catalog_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "catalog-items", catalog.id] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("catalog_items").update({ featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "catalog-items", catalog.id] }),
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{catalog.title_ar}</h1>
          <p className="text-sm text-muted-foreground">تعديل الكتالوج وإدارة المنتجات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link to="/catalogs/$slug" params={{ slug: catalog.slug }} target="_blank">
              <ExternalLink className="size-3.5" /> عرض الكتالوج
            </Link>
          </Button>
          <Button size="sm" onClick={() => updateCatalog.mutate()} disabled={updateCatalog.isPending} className="gap-1">
            <Save className="size-3.5" /> حفظ
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>العنوان بالعربي</Label>
            <Input value={form.title_ar} onChange={(e) => setForm((f: Catalog) => ({ ...f, title_ar: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>العنوان بالإنجليزي</Label>
            <Input
              value={form.title_en ?? ""}
              onChange={(e) => setForm((f: Catalog) => ({ ...f, title_en: e.target.value }))}
              dir="ltr"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>الوصف بالعربي</Label>
            <Input
              value={form.description_ar ?? ""}
              onChange={(e) => setForm((f: Catalog) => ({ ...f, description_ar: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الوصف بالإنجليزي</Label>
            <Input
              value={form.description_en ?? ""}
              onChange={(e) => setForm((f: Catalog) => ({ ...f, description_en: e.target.value }))}
              dir="ltr"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>رابط صورة الغلاف</Label>
          <Input
            value={form.cover_image_url ?? ""}
            onChange={(e) => setForm((f: Catalog) => ({ ...f, cover_image_url: e.target.value }))}
            dir="ltr"
            placeholder="https://..."
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="is_public"
            checked={form.is_public}
            onCheckedChange={(v) => setForm((f: Catalog) => ({ ...f, is_public: v === true }))}
          />
          <Label htmlFor="is_public" className="cursor-pointer">
            نشر الكتالوج للعامة
          </Label>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-lg">إضافة منتجات</h2>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المنتج أو الكود..."
            className="pr-10"
          />
        </div>
        {productOptions && productOptions.length > 0 && (
          <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
            {productOptions
              .filter((p) => !existingIds.has(p.id))
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-muted overflow-hidden">
                      {p.main_image_url ? (
                        <img src={p.main_image_url} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="size-full grid place-items-center text-muted-foreground text-xs">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{p.name_ar}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {p.az_code}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addProduct.mutate(p.id)} disabled={addProduct.isPending}>
                    إضافة
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-lg">المنتجات في الكتالوج</h2>
        {itemsLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : items?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد منتجات مضافة</div>
        ) : (
          <div className="space-y-2">
            {items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 border rounded-xl bg-card hover:border-ring transition"
              >
                <GripVertical className="size-4 text-muted-foreground" />
                <div className="size-12 rounded-lg bg-muted overflow-hidden shrink-0">
                  {item.product?.main_image_url ? (
                    <img src={item.product.main_image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center text-muted-foreground text-xs">—</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.product?.name_ar ?? "—"}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {item.product?.az_code}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.featured}
                      onChange={(e) => toggleFeatured.mutate({ id: item.id, featured: e.target.checked })}
                    />
                    مميز
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.id)} className="text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
