import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderOpen, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Catalog = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  is_public: boolean;
  sort_order: number;
  cover_image_url: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/catalogs/")({
  head: () => ({ meta: [{ title: "إدارة الكتالوجات — Alazab PAOP" }] }),
  component: CatalogsAdmin,
});

function CatalogsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ slug: "", title_ar: "", title_en: "", description_ar: "" });

  const { data: catalogs, isLoading } = useQuery({
    queryKey: ["admin", "catalogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("id, slug, title_ar, title_en, description_ar, is_public, sort_order, cover_image_url")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Catalog[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_catalogs").insert({
        slug: form.slug.trim(),
        title_ar: form.title_ar.trim(),
        title_en: form.title_en.trim() || null,
        description_ar: form.description_ar.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      setOpen(false);
      setForm({ slug: "", title_ar: "", title_en: "", description_ar: "" });
      toast.success("تم إنشاء الكتالوج");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase.from("product_catalogs").update({ is_public: !is_public }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "catalogs"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_catalogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "catalogs"] }),
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">كتالوجات الأعمال</h1>
          <p className="text-sm text-muted-foreground">إنشاء وإدارة مجموعات المنتجات المعروضة للعملاء</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" /> كتالوج جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء كتالوج جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="slug">المعرف (slug)</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="مثال: finishing-works"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title_ar">العنوان بالعربي</Label>
                <Input
                  id="title_ar"
                  value={form.title_ar}
                  onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
                  placeholder="أعمال التشطيبات"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title_en">العنوان بالإنجليزي</Label>
                <Input
                  id="title_en"
                  value={form.title_en}
                  onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                  placeholder="Finishing Works"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description_ar">الوصف</Label>
                <Input
                  id="description_ar"
                  value={form.description_ar}
                  onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
                  placeholder="وصف مختصر للكتالوج"
                />
              </div>
              <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
                {create.isPending ? "جاري الإنشاء..." : "إنشاء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : catalogs?.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد كتالوجات بعد</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs?.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{c.title_ar}</h3>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    /catalogs/{c.slug}
                  </div>
                </div>
                <button
                  onClick={() => togglePublic.mutate({ id: c.id, is_public: c.is_public })}
                  className={`size-8 rounded-full grid place-items-center transition ${
                    c.is_public ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                  title={c.is_public ? "عام" : "مخفي"}
                >
                  {c.is_public ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </div>
              {c.description_ar && <p className="text-sm text-muted-foreground line-clamp-2">{c.description_ar}</p>}
              <div className="flex items-center gap-2 mt-auto pt-3 border-t">
                <Button variant="outline" size="sm" asChild className="gap-1">
                  <Link to="/admin/catalogs/$slug" params={{ slug: c.slug }}>
                    تعديل
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="gap-1 ml-auto">
                  <Link to="/catalogs/$slug" params={{ slug: c.slug }} target="_blank">
                    <ExternalLink className="size-3.5" /> عرض
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)} className="text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
