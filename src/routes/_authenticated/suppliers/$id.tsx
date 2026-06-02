import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Mail, Phone, MapPin, Globe, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/suppliers/$id")({
  head: () => ({ meta: [{ title: "تفاصيل المورد — Alazab PAOP" }] }),
  component: SupplierDetails,
});

function SupplierDetails() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: supplier, isLoading, error } = useQuery({
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

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier", id] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("تم تحديث حالة المورد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSupplierType = useMutation({
    mutationFn: async (newType: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ supplier_type: newType })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier", id] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("تم تحديث نوع المورد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tierMap: Record<string, { label: string; color: string }> = {
    first_tier: { label: "الدرجة الأولى", color: "bg-success/15 text-success" },
    second_tier: { label: "الدرجة الثانية", color: "bg-primary/15 text-primary" },
    backup: { label: "احتياطي", color: "bg-warning/15 text-warning" },
    local: { label: "محلي", color: "bg-accent/15 text-accent" },
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">جاري التحميل...</div>;
  if (error) return <div className="p-6 text-destructive">حدث خطأ في التحميل</div>;
  if (!supplier)
    return <div className="p-6 text-muted-foreground">المورد غير موجود</div>;

  return (
    <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
      <Link
        to="/suppliers"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowRight className="size-3" /> العودة للقائمة
      </Link>

      <Card className="p-6 surface-elevated border-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {supplier.supplier_type && <span className="capitalize">{supplier.supplier_type.replace(/_/g, " ")}</span>}
            </div>
            <div className="flex gap-3 mt-3">
              {supplier.email && (
                <a
                  href={`mailto:${supplier.email}`}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <Mail className="size-4" />
                  {supplier.email}
                </a>
              )}
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <Phone className="size-4" />
                  {supplier.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-sm ${
                supplier.status === "active"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {supplier.status === "active" ? "نشط" : "غير نشط"}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">
            نوع المورد
          </div>
          <div className="text-sm font-medium capitalize">
            {supplier.supplier_type ? supplier.supplier_type.replace(/_/g, " ") : "—"}
          </div>
        </Card>

        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">
            التقييم
          </div>
          <div className="text-sm font-medium">{supplier.rating || "—"}</div>
        </Card>

        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">
            شروط الدفع
          </div>
          <div className="text-sm font-medium">{supplier.payment_terms || "—"}</div>
        </Card>

        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">
            تاريخ الإضافة
          </div>
          <div className="text-sm font-medium">
            {new Date(supplier.created_at).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6 surface-elevated border-0">
        <h3 className="font-bold mb-4">معلومات التواصل</h3>
        <div className="space-y-3">
          {supplier.contact_name && (
            <div className="flex gap-3 items-start">
              <span className="text-xs text-muted-foreground font-semibold">المسؤول:</span>
              <div className="text-sm">{supplier.contact_name}</div>
            </div>
          )}
          {supplier.website && (
            <div className="flex gap-3 items-start">
              <Globe className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <a
                href={supplier.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {supplier.website}
              </a>
            </div>
          )}
          {supplier.delivery_time && (
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground font-semibold mb-1">مدة التسليم</div>
              <div className="text-sm">{supplier.delivery_time}</div>
            </div>
          )}
          {supplier.notes && (
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground font-semibold mb-2">ملاحظات</div>
              <div className="text-sm text-muted-foreground">{supplier.notes}</div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 surface-elevated border-0">
        <h3 className="font-bold mb-4">إدارة المورد</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">تغيير الحالة</label>
              <Select
                value={supplier.status ?? "active"}
                onValueChange={(v) => updateStatus.mutate(v)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">تغيير نوع المورد</label>
              <Select
                value={supplier.supplier_type ?? ""}
                onValueChange={(v) => updateSupplierType.mutate(v)}
                disabled={updateSupplierType.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">محلي</SelectItem>
                  <SelectItem value="international">دولي</SelectItem>
                  <SelectItem value="wholesale">جملة</SelectItem>
                  <SelectItem value="retail">تجزئة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit2 className="size-3.5" />
              تعديل
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
              <Trash2 className="size-3.5" />
              حذف
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 surface-elevated border-0">
        <h3 className="font-bold mb-4">معلومات إضافية</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">معرف المورد</span>
            <span className="num font-mono text-xs">{supplier.id}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">آخر تحديث</span>
            <span>
              {new Date(supplier.updated_at).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
