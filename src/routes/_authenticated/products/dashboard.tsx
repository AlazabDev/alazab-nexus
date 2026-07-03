import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
  Plus,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProductStats {
  total: number;
  recent: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

function ProductsDashboard() {
  const { data: stats = { total: 0, recent: 0, byStatus: {}, byType: {} } as ProductStats } = useQuery({
    queryKey: ["product-stats"],
    queryFn: async (): Promise<ProductStats> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, status, item_type, created_at", { count: "exact" });
      if (error) throw error;

      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return {
        total: data?.length || 0,
        recent: data?.filter((p: any) => new Date(p.created_at) > lastMonth).length || 0,
        byStatus: groupBy(data || [], "status"),
        byType: groupBy(data || [], "item_type"),
      };
    },
  });

  const { data: recentProducts = [] } = useQuery({
    queryKey: ["recent-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: needsReview = [] } = useQuery({
    queryKey: ["products-needs-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("status", ["needs_review", "duplicate_suspected", "content_incomplete"])
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // معالجة البيانات
  const statusData = Object.entries(stats.byStatus || {}).map(([status, count]: any) => ({
    name: translateStatus(status),
    value: count,
    fill: getStatusColor(status),
  }));

  const typeData = Object.entries(stats.byType || {}).map(([type, count]: any) => ({
    name: translateType(type),
    value: count,
  }));

  const completionRate =
    stats.total > 0
      ? Math.round(
          ((stats.byStatus?.approved || 0) / stats.total) * 100,
        )
      : 0;

  const reviewRate =
    stats.total > 0
      ? Math.round(
          ((stats.byStatus?.needs_review || 0) / stats.total) * 100,
        )
      : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="size-8 text-accent" />
            لوحة معلومات المنتجات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            عرض شامل لحالة وإحصائيات منتجاتك
          </p>
        </div>
        <Link to="/products/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            منتج جديد
          </Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">إجمالي المنتجات</span>
            <Package className="size-4 text-accent" />
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">
            <span className="text-success">↑ {stats.recent}</span> في الشهر الأخير
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">معدل الإنجاز</span>
            <CheckCircle2 className="size-4 text-success" />
          </div>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <Progress value={completionRate} className="h-1" />
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">يحتاج مراجعة</span>
            <AlertCircle className="size-4 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold">{reviewRate}%</div>
          <div className="text-xs text-muted-foreground">
            {stats.byStatus?.needs_review || 0} منتجات
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">نوع بند</span>
            <TrendingUp className="size-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{Object.keys(stats.byType || {}).length}</div>
          <div className="text-xs text-muted-foreground">أنواع مختلفة</div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-semibold mb-4">توزيع حالات المنتجات</div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Type Distribution */}
        {typeData.length > 0 && (
          <Card className="p-4">
            <div className="text-sm font-semibold mb-4">توزيع أنواع البنود</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-muted-foreground)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-background)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Bar dataKey="value" fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Recent Products */}
      {recentProducts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">آخر المنتجات المضافة</h2>
            <Link to="/products">
              <Button variant="ghost" size="sm" className="gap-1">
                عرض الكل
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {recentProducts.map((product: any) => (
              <Link key={product.id} to="/products/$id" params={{ id: product.id }}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.name_ar || product.name_en}</p>
                    <p className="text-xs text-muted-foreground">{product.az_code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      {translateType(product.item_type)}
                    </Badge>
                    <Badge className={`text-xs border-0 ${getStatusBadgeClass(product.status)}`}>
                      {translateStatus(product.status)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Products Needing Review */}
      {needsReview.length > 0 && (
        <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-yellow-600" />
              <h2 className="text-sm font-semibold">منتجات تحتاج مراجعة</h2>
            </div>
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
              {needsReview.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {needsReview.map((product: any) => (
              <Link key={product.id} to="/products/$id" params={{ id: product.id }}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background transition-colors cursor-pointer">
                  <div className="flex items-start gap-3 flex-1">
                    <Activity className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name_ar || product.name_en}</p>
                      <p className="text-xs text-muted-foreground">{getReviewReason(product.status)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    مراجعة
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Link to="/products/new">
            <Button variant="outline" className="w-full gap-2">
              <Plus className="size-4" />
              إضافة منتج
            </Button>
          </Link>
          <Link to="/products" search={{ status: "needs_review" } as never}>
            <Button variant="outline" className="w-full gap-2">
              <AlertCircle className="size-4" />
              مراجعة المنتجات
            </Button>
          </Link>
          <Link to="/integrations">
            <Button variant="outline" className="w-full gap-2">
              <Activity className="size-4" />
              التكاملات
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

// Utility functions
function groupBy(arr: any[], key: string) {
  return arr.reduce(
    (acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    draft: "مسودة",
    needs_review: "بحاجة مراجعة",
    duplicate_suspected: "مكرر محتمل",
    content_incomplete: "محتوى ناقص",
    pricing_incomplete: "سعر ناقص",
    supplier_pending: "بانتظار المورد",
    approved: "معتمد",
    rejected: "مرفوض",
    exported: "مصدر",
    archived: "مؤرشف",
  };
  return translations[status] || status;
}

function translateType(type: string): string {
  const translations: Record<string, string> = {
    product: "منتج",
    service: "خدمة",
    work_item: "عنصر عمل",
    material: "مادة",
    tool: "أداة",
    spare_part: "قطعة غيار",
    finish_item: "منتج نهائي",
    custom_unit: "وحدة مخصصة",
    supplier_item: "منتج المورد",
    package: "عبوة",
    bundle: "مجموعة",
  };
  return translations[type] || type;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    approved: "#10b981",
    draft: "#6b7280",
    needs_review: "#f59e0b",
    duplicate_suspected: "#f59e0b",
    content_incomplete: "#ef4444",
    pricing_incomplete: "#ef4444",
    supplier_pending: "#3b82f6",
    rejected: "#dc2626",
    exported: "#8b5cf6",
    archived: "#9ca3af",
  };
  return colors[status] || "#6b7280";
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    approved: "bg-success/20 text-success",
    draft: "bg-muted text-muted-foreground",
    needs_review: "bg-yellow-500/20 text-yellow-700",
    duplicate_suspected: "bg-yellow-500/20 text-yellow-700",
    content_incomplete: "bg-destructive/20 text-destructive",
    pricing_incomplete: "bg-destructive/20 text-destructive",
    supplier_pending: "bg-blue-500/20 text-blue-700",
    rejected: "bg-destructive/20 text-destructive",
    exported: "bg-purple-500/20 text-purple-700",
    archived: "bg-muted text-muted-foreground",
  };
  return classes[status] || "bg-muted text-muted-foreground";
}

function getReviewReason(status: string): string {
  const reasons: Record<string, string> = {
    needs_review: "بحاجة إلى مراجعة يدوية",
    duplicate_suspected: "قد يكون تكراراً لمنتج آخر",
    content_incomplete: "المحتوى ناقص",
    pricing_incomplete: "معلومات السعر ناقصة",
  };
  return reasons[status] || "بحاجة مراجعة";
}
