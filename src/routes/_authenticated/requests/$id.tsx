import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Edit2, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الطلب — Alazab PAOP" }] }),
  component: RequestDetail,
});

const STATUS_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "مفتوح", color: "bg-primary/15 text-primary", icon: Clock },
  in_review: { label: "قيد المراجعة", color: "bg-warning/15 text-warning", icon: Zap },
  pricing_assigned: { label: "تسعير معين", color: "bg-accent/15 text-accent", icon: Zap },
  approved: { label: "معتمد", color: "bg-success/15 text-success", icon: CheckCircle2 },
  rejected: { label: "مرفوض", color: "bg-destructive/15 text-destructive", icon: XCircle },
};

const REQUEST_TYPES: Record<string, string> = {
  product: "منتج",
  service: "خدمة",
  material: "مادة خام",
  pricing_inquiry: "استعلام تسعير",
  supplier_connection: "ربط مورد",
};

const PRIORITIES: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

function RequestDetail() {
  const { id } = Route.useParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const qc = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ["request", id],
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

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await supabase
        .from("product_requests")
        .update({ status: newStatus })
        .eq("id", id);
      qc.invalidateQueries({ queryKey: ["request", id] });
      toast.success("تم تحديث الحالة بنجاح");
    } catch (error) {
      toast.error("خطأ في التحديث");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">جاري التحميل...</div>;
  }

  if (!request) {
    return <div className="p-6 text-muted-foreground">الطلب غير موجود</div>;
  }

  const statusInfo = STATUS_LABEL[request.status] || { label: request.status, color: "bg-secondary" };
  const StatusIcon = statusInfo.icon || Clock;

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <Link
        to="/requests"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
      >
        <ArrowRight className="size-3" /> العودة للقائمة
      </Link>

      <Card className="p-6 surface-elevated border-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="num text-xs text-accent font-semibold">#{request.id.slice(0, 8)}</div>
            <h1 className="text-2xl font-bold mt-1">{request.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {REQUEST_TYPES[request.request_type] || request.request_type}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={statusInfo.color}>
              <StatusIcon className="size-3 ml-1" />
              {statusInfo.label}
            </Badge>
            <Badge variant="outline">
              أولوية: {PRIORITIES[request.priority] || request.priority}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">النوع</div>
            <div className="font-medium">{REQUEST_TYPES[request.request_type] || request.request_type}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">الفئة</div>
            <div className="font-medium">{request.category || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">الكمية</div>
            <div className="font-medium num">{request.quantity ? request.quantity.toLocaleString() : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">التاريخ</div>
            <div className="text-sm">
              {new Date(request.created_at).toLocaleDateString("ar")}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
          <TabsTrigger value="notes">ملاحظات</TabsTrigger>
          <TabsTrigger value="actions">الإجراءات</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card className="p-6 surface-elevated border-0">
            <h3 className="font-bold mb-4">وصف الطلب</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {request.description || "لا يوجد وصف"}
            </p>
          </Card>

          {request.estimated_budget && (
            <Card className="p-6 surface-elevated border-0">
              <h3 className="font-bold mb-4">الميزانية المقدرة</h3>
              <div className="num text-lg font-semibold text-accent">
                {request.estimated_budget.toLocaleString("ar-EG", {
                  style: "currency",
                  currency: "EGP",
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card className="p-6 surface-elevated border-0">
            {request.notes ? (
              <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد ملاحظات</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card className="p-6 surface-elevated border-0">
            <h3 className="font-bold mb-4">تحديث الحالة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">الحالة الجديدة</label>
                <Select
                  value={request.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-3">سير العمل</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-accent" />
                    <span>تم الإنشاء بواسطة المستخدم</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${request.status !== "open" ? "bg-accent" : "bg-muted"}`} />
                    <span>جاري المراجعة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${["pricing_assigned", "approved", "rejected"].includes(request.status) ? "bg-accent" : "bg-muted"}`} />
                    <span>تعيين التسعير أو الموافقة</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
