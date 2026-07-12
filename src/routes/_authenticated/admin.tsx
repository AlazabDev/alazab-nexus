import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  Users,
  Key,
  Layers,
  GitBranch,
  Ruler,
  Network,
  DollarSign,
  Sparkles,
  Bell,
  Truck,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.session.user.id);
    const allowed = roles?.some((r) => r.role === "admin" || r.role === "editor");
    if (!allowed) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "لوحة الإدارة — Alazab PAOP" }] }),
  component: AdminLayout,
});

export const ADMIN_NAV = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutGrid, exact: true, section: "general" },
  { to: "/admin/users", label: "المستخدمون والأدوار", icon: Users, section: "access", adminOnly: true },
  { to: "/admin/api-keys", label: "مفاتيح API", icon: Key, section: "access", adminOnly: true },
  { to: "/admin/categories", label: "الفئات", icon: Layers, section: "reference" },
  { to: "/admin/families", label: "العائلات", icon: GitBranch, section: "reference" },
  { to: "/admin/units", label: "الوحدات", icon: Ruler, section: "reference" },
  { to: "/suppliers", label: "الموردون", icon: Truck, section: "reference", external: true },
  { to: "/integrations", label: "التكاملات", icon: Network, section: "resources", external: true, adminOnly: true },
  { to: "/pricing", label: "قواعد التسعير", icon: DollarSign, section: "resources", external: true, adminOnly: true },
  { to: "/ai-studio", label: "إعدادات الذكاء الاصطناعي", icon: Sparkles, section: "resources", external: true, adminOnly: true },
  { to: "/notifications", label: "الإشعارات", icon: Bell, section: "resources", external: true },
] as const;

const SECTIONS: Record<string, string> = {
  general: "عام",
  access: "الوصول والصلاحيات",
  reference: "البيانات المرجعية",
  resources: "موارد التطبيق",
};

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const groups = Object.entries(SECTIONS).map(([key, label]) => ({
    key,
    label,
    items: ADMIN_NAV.filter((i) => i.section === key),
  }));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]" dir="rtl">
      <aside className="w-64 shrink-0 border-l bg-card/40 p-3 overflow-y-auto">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <Shield className="size-5 text-primary" />
          <h2 className="font-bold">لوحة الإدارة</h2>
        </div>
        <nav className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 mb-1">
                {g.label}
              </div>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = item.exact
                    ? path === item.to
                    : path === item.to || path.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4" />
                      <span className="truncate">{item.label}</span>
                      {"external" in item && item.external && (
                        <span className="text-[10px] text-muted-foreground/70 mr-auto">↗</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
