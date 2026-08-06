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
import { ArrowRight, Clock, AlertCircle, CheckCircle2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الطلب — Alazab PAOP" }] }),
  component: RequestDetails,
});

function RequestDetails() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const {
    data: request,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_requests")
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
        .from("product_requests")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-request", id] });
      qc.invalidateQueries({ queryKey: ["product-requests"] });
      toast.success("تم تحديث الحالة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePriority = useMutation({
    mutationFn: async (newPriority: string) => {
      const { error } = await supabase
        .from("product_requests")
        .update({ priority: newPriority })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-request", id] });
      qc.invalidateQueries({ queryKey: ["product-requests"] });
      toast.success("تم تحديث الأولوية");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMap: Record<string, { label: string; icon: any; tone: string }> = {
    open: { label: "مفتوح", icon: AlertCircle, tone: "bg-warning/15 text-warning" },
    in_review: { label: "قيد المراجعة", icon: Clock, tone: "bg-primary/15 text-primary" },
    approved: { label: "معتمد", icon: CheckCircle2, tone: "bg-success/15 text-success" },
    rejected: { label: "مرفوض", icon: AlertCircle, tone: "bg-destructive/15 text-destructive" },
  };

  const priorityMap: Record<string, string> = {
    low: "منخفضة",
    medium: "متوسطة",
    high: "عالية",
    urgent: "عاجلة",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-secondary text-muted-foreground",
    medium: "bg-warning/15 text-warning",
    high: "bg-orange-500/15 text-orange-600",
    urgent: "bg-destructive/15 text-destructive",
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">جاري التحميل...</div>;
  if (error) return <div className="p-6 text-destructive">حدث خطأ في التحميل</div>;
  if (!request) return <div className="p-6 text-muted-foreground">الطلب غير موجود</div>;

  return (
    <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
      <Link
        to="/requests"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowRight className="size-3" /> العودة للقائمة
      </Link>

      <Card className="p-6 surface-elevated border-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <div className="text-sm text-muted-foreground mt-2">{request.description}</div>
          </div>
          <div className="flex items-center gap-2">
            {statusMap[request.status] ? (
              <div
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium ${statusMap[request.status].tone}`}
              >
                {(() => {
                  const IconComponent = statusMap[request.status].icon;
                  return <IconComponent className="size-4" />;
                })()}
                {statusMap[request.status].label}
              </div>
            ) : (
              <Badge>{request.status}</Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">النوع</div>
          <div className="text-sm font-medium">
            {request.request_type === "new_product"
              ? "منتج جديد"
              : request.request_type === "new_service"
                ? "خدمة جديدة"
                : request.request_type === "bulk_order"
                  ? "طلب كمي"
                  : "طلب خاص"}
          </div>
        </Card>

        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">الكمية</div>
          <div className="text-sm font-medium num">{request.quantity || "—"}</div>
        </Card>

        <Card className="p-4 surface-elevated border-0">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">
            تاريخ الإنشاء
          </div>
          <div className="text-sm font-medium">
            {new Date(request.created_at).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6 surface-elevated border-0">
        <h3 className="font-bold mb-4">إدارة الطلب</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">تغيير الحالة</label>
              <Select
                value={request.status}
                onValueChange={(v) => updateStatus.mutate(v)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="in_review">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">تغيير الأولوية</label>
              <Select
                value={request.priority}
                onValueChange={(v) => updatePriority.mutate(v)}
                disabled={updatePriority.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
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
            <span className="text-muted-foreground">معرف الطلب</span>
            <span className="num font-mono text-xs">{request.id}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">آخر تحديث</span>
            <span>
              {new Date(request.updated_at).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">الحقول الإضافية</span>
            <span className="text-muted-foreground">—</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
