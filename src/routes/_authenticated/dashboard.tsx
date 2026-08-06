import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Image,
  DollarSign,
  Truck,
  Network,
  Copy,
  History,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/page-header";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — Alazab PAOP" }] }),
  component: Dashboard,
});

async function fetchStats() {
  const [products, approved, draft, needsReview, assets, suppliers, prices, integrations, dups] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "needs_review"),
      supabase.from("assets").select("*", { count: "exact", head: true }),
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
      supabase.from("prices").select("*", { count: "exact", head: true }),
      supabase.from("api_integrations").select("*", { count: "exact", head: true }),
      supabase
        .from("duplicate_groups")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
    ]);
  return {
    products: products.count ?? 0,
    approved: approved.count ?? 0,
    draft: draft.count ?? 0,
    needsReview: needsReview.count ?? 0,
    assets: assets.count ?? 0,
    suppliers: suppliers.count ?? 0,
    prices: prices.count ?? 0,
    integrations: integrations.count ?? 0,
    dups: dups.count ?? 0,
  };
}

async function fetchRecent() {
  const { data } = await supabase
    .from("products")
    .select("id, az_code, name_ar, item_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function fetchTypeBreakdown() {
  const { data } = await supabase.from("products").select("gpc_family");
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    const k = r.gpc_family || "غير مصنف";
    counts[k] = (counts[k] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

async function fetchStatusDistribution() {
  const { data } = await supabase.from("products").select("status");
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    const k = r.status || "unknown";
    counts[k] = (counts[k] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

async function fetchMonthlyActivity() {
  const { data } = await supabase
    .from("products")
    .select("created_at")
    .order("created_at", { ascending: true });
  const months: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    const date = new Date(r.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] ?? 0) + 1;
  });
  return Object.entries(months)
    .slice(-12)
    .map(([month, count]) => ({ month, count }));
}

async function fetchRecentAuditLogs() {
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

function Dashboard() {
  const navigate = useNavigate();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const { data: recent } = useQuery({ queryKey: ["recent"], queryFn: fetchRecent });
  const { data: families } = useQuery({ queryKey: ["families"], queryFn: fetchTypeBreakdown });
  const { data: statusDist } = useQuery({
    queryKey: ["status-dist"],
    queryFn: fetchStatusDistribution,
  });
  const { data: monthlyActivity } = useQuery({
    queryKey: ["monthly-activity"],
    queryFn: fetchMonthlyActivity,
  });
  const { data: auditLogs } = useQuery({
    queryKey: ["recent-audit"],
    queryFn: fetchRecentAuditLogs,
  });

  // Use design tokens so colors track theme (light/dark)
  const statusColors: Record<string, string> = {
    approved: "var(--success)",
    draft: "var(--muted-foreground)",
    needs_review: "var(--warning)",
    rejected: "var(--destructive)",
    archived: "var(--muted-foreground)",
  };

  const statusLabels: Record<string, string> = {
    approved: "معتمد",
    draft: "مسودة",
    needs_review: "مراجعة",
    rejected: "مرفوض",
    archived: "مؤرشف",
  };

  const actionLabels: Record<string, string> = {
    create: "انشاء",
    update: "تحديث",
    delete: "حذف",
    approve: "اعتماد",
  };

  const primaryKpis = [
    { label: "اجمالي البنود", value: stats?.products, icon: Package, tone: "primary" as const, to: "/products" },
    { label: "بنود معتمدة", value: stats?.approved, icon: CheckCircle2, tone: "success" as const, to: "/products" },
    { label: "تحتاج مراجعة", value: stats?.needsReview, icon: AlertTriangle, tone: "warning" as const, to: "/products" },
    { label: "مسودات", value: stats?.draft, icon: Clock, tone: "muted" as const, to: "/products" },
  ];
  const secondaryKpis = [
    { label: "الأصول الرقمية", value: stats?.assets, icon: Image, tone: "accent" as const, to: "/assets" },
    { label: "سجلات الأسعار", value: stats?.prices, icon: DollarSign, tone: "accent" as const, to: "/pricing" },
    { label: "الموردون", value: stats?.suppliers, icon: Truck, tone: "accent" as const, to: "/suppliers" },
    { label: "تكاملات API", value: stats?.integrations, icon: Network, tone: "accent" as const, to: "/api-center" },
  ];
  const approvalPct = stats?.products
    ? Math.round(((stats.approved ?? 0) / stats.products) * 100)
    : 0;

  return (
    <>
      <PageHeader
        icon={<LayoutDashboard className="size-5" />}
        title="لوحة التحكم"
        description="نظرة شاملة على حالة المنصة والبيانات المعتمدة"
        actions={
          <>
            <Link
              to="/products"
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              إدارة المنتجات
            </Link>
            <Link
              to="/import"
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition"
            >
              استيراد
            </Link>
          </>
        }
      />
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Hero summary */}
        <Card className="relative overflow-hidden p-5 md:p-6 border-0 surface-elevated bg-gradient-to-l from-primary/10 via-accent/5 to-transparent">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground mb-1">نسبة الاعتماد الحالية</div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-4xl font-bold num">{approvalPct}%</span>
              <span className="text-sm text-muted-foreground num">
                {stats?.approved ?? 0} / {stats?.products ?? 0} بند معتمد
              </span>
            </div>
            <div className="h-2 mt-3 bg-secondary rounded-full overflow-hidden max-w-md">
              <div
                className="h-full bg-gradient-to-l from-success to-accent transition-all"
                style={{ width: `${approvalPct}%` }}
              />
            </div>

          </div>
        </Card>

        {/* Primary KPIs */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
            مؤشرات المحتوى
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {primaryKpis.map((k) => (
              <KPICard key={k.label} {...k} onClick={() => navigate({ to: k.to })} />
            ))}
          </div>
        </div>

        {/* Secondary KPIs */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
            الموارد والتكاملات
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {secondaryKpis.map((k) => (
              <KPICard key={k.label} {...k} onClick={() => navigate({ to: k.to })} />
            ))}
          </div>
        </div>





      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly Activity Chart */}
        <Card className="lg:col-span-2 p-5 surface-elevated border-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp className="size-4" />
              نشاط الاضافة الشهري
            </h3>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyActivity ?? []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  name="عدد البنود"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="p-5 surface-elevated border-0">
          <h3 className="font-bold mb-4">توزيع الحالات</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {(statusDist ?? []).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={statusColors[entry.name] || "var(--muted-foreground)"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, statusLabels[name] || name]}
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {(statusDist ?? []).map((s: any) => (
              <div key={s.name} className="flex items-center gap-1 text-xs">
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: statusColors[s.name] || "var(--muted-foreground)" }}
                />
                <span>{statusLabels[s.name] || s.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 surface-elevated border-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">آخر البنود المضافة</h3>
            <Link to="/products" className="text-xs text-accent hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="divide-y">
            {(recent ?? []).map((p: any) => (
              <Link
                key={p.id}
                to="/products/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between py-3 hover:bg-secondary/50 rounded-md px-2 -mx-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name_ar}</div>
                  <div className="text-[11px] text-muted-foreground num mt-0.5" dir="ltr">
                    {p.az_code}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 surface-elevated border-0">
          <h3 className="font-bold mb-4">التوزيع حسب العائلة (GPC)</h3>
          <div className="space-y-2">
            {(families ?? []).map(([name, count]) => {
              const max = families?.[0]?.[1] ?? 1;
              const pct = ((count as number) / (max as number)) * 100;
              return (
                <div key={name as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate">{name}</span>
                    <span className="num text-muted-foreground">
                      {(count as number).toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5 surface-elevated border-0">
        <div className="flex items-center gap-2 mb-2">
          <Copy className="size-4 text-warning" />
          <h3 className="font-bold">حوكمة البيانات</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          النظام يلتزم بسياسات صارمة: لا حذف نهائي، كل ت��ديل مسجل في audit_logs، التصدير محصور
          بالبنود المعتمدة، تعديل الاسعار يحفظ التاريخ تلقائيا، ولا يتم اعتماد بند بدون البيانات
          الاساسية الكاملة.
        </p>
      </Card>

      {/* Recent Audit Logs */}
      <Card className="p-5 surface-elevated border-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <History className="size-4" />
            اخر سجلات التدقيق
          </h3>
          <Link to="/audit-logs" className="text-xs text-accent hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="divide-y">
          {(auditLogs ?? []).map((log: any) => (
            <div key={log.id} className="py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">
                  {actionLabels[log.action] || log.action}
                </span>
                <span className="text-sm">{log.entity_type}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleDateString("ar")}
              </span>
            </div>
          ))}
          {(!auditLogs || auditLogs.length === 0) && (
            <div className="py-4 text-center text-muted-foreground text-sm">
              لا توجد سجلات حديثة
            </div>
          )}
        </div>
      </Card>
      </div>
    </>
  );
}


function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "معتمد", cls: "bg-success/15 text-success" },
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    needs_review: { label: "مراجعة", cls: "bg-warning/15 text-warning" },
    rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive" },
    archived: { label: "مؤرشف", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`text-[10px] px-2 py-0.5 rounded ${v.cls} shrink-0`}>{v.label}</span>;
}
