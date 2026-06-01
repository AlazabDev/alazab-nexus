import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Mail, Phone, MapPin, Edit2, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupplierForm } from "@/components/supplier-form";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/suppliers/$id")({
  head: () => ({ meta: [{ title: "تفاصيل المورد — Alazab PAOP" }] }),
  component: SupplierDetail,
});

const TIER_LABEL: Record<string, string> = {
  first_tier: "درجة أولى",
  second_tier: "درجة ثانية",
  backup: "احتياطي",
  local: "محلي",
  imported: "مستورد",
  internal_workshop: "ورشة داخلية",
  factory: "مصنع",
  marketplace: "تطبيق تجارة",
};

function SupplierDetail() {
  const { id } = Route.useParams();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const qc = useQueryClient();
  const navigate = Route.useNavigate();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["supplier-products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, az_code, name_ar, name_en")
        .contains("suppliers", [id])
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  const handleDelete = async () => {
    try {
      await supabase.from("suppliers").delete().eq("id", id);
      toast.success("تم حذف المورد بنجاح");
      navigate({ to: "/suppliers" });
    } catch (error) {
      toast.error("خطأ في الحذف");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">جاري التحميل...</div>;
  }

  if (!supplier) {
    return <div className="p-6 text-muted-foreground">المورد غير موجود</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <Link
        to="/suppliers"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
      >
        <ArrowRight className="size-3" /> العودة للقائمة
      </Link>

      <Card className="p-6 surface-elevated border-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="num text-xs text-accent font-semibold">{supplier.supplier_code}</div>
            <h1 className="text-2xl font-bold mt-1">{supplier.name_ar}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{supplier.name_en}</p>
          </div>
          <div className="flex gap-2">
            <Sheet open={showEdit} onOpenChange={setShowEdit}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit2 className="size-4 ml-1" />
                  تعديل
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>تعديل المورد</SheetTitle>
                  <SheetDescription>
                    حدث معلومات المورد
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <SupplierForm
                    initialData={supplier}
                    onSuccess={() => {
                      setShowEdit(false);
                      qc.invalidateQueries({ queryKey: ["supplier", id] });
                    }}
                    onCancel={() => setShowEdit(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="size-4 ml-1" />
                حذف
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف المورد</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف المورد "{supplier.name_ar}"؟ هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-3">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive"
                  >
                    حذف
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1">الفئة</div>
            <div className="text-sm font-medium">{supplier.category || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">المستوى</div>
            <Badge className="bg-accent/15 text-accent">
              {TIER_LABEL[supplier.tier] || supplier.tier}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">الحالة</div>
            <Badge
              variant="outline"
              className={
                supplier.status === "active"
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-muted text-muted-foreground"
              }
            >
              {supplier.status === "active" ? "نشط" : "غير نشط"}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">إضافة في</div>
            <div className="text-sm">
              {new Date(supplier.created_at).toLocaleDateString("ar")}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="products">المنتجات ({products.length})</TabsTrigger>
          <TabsTrigger value="notes">ملاحظات</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card className="p-6 surface-elevated border-0">
            <h3 className="font-bold mb-4">بيانات التواصل</h3>
            <div className="space-y-3">
              {supplier.contact_person && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm min-w-[100px]">الشخص:</span>
                  <span>{supplier.contact_person}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${supplier.email}`} className="text-accent hover:underline">
                    {supplier.email}
                  </a>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${supplier.phone}`} className="text-accent hover:underline">
                    {supplier.phone}
                  </a>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-muted-foreground mt-0.5" />
                  <span>{supplier.address}</span>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="surface-elevated border-0 overflow-hidden">
            {products.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                لا توجد منتجات مرتبطة بهذا المورد
              </div>
            ) : (
              <div className="divide-y">
                {products.map((p: any) => (
                  <Link
                    key={p.id}
                    to="/products/$id"
                    params={{ id: p.id }}
                    className="p-4 hover:bg-secondary/50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-medium group-hover:text-accent transition-colors">
                        {p.name_ar}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 num">
                        {p.az_code}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-accent" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card className="p-6 surface-elevated border-0">
            {supplier.notes ? (
              <p className="text-sm">{supplier.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد ملاحظات</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
