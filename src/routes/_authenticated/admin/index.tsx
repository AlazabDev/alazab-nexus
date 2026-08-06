import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useUserRole } from "@/lib/auth";
import { ADMIN_NAV } from "../admin";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — نظرة عامة" }] }),
  component: AdminHome,
});

function useCount(
  table: "categories" | "families" | "units" | "user_roles" | "api_consumers" | "suppliers",
) {
  return useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function AdminHome() {
  const role = useUserRole();
  const cats = useCount("categories");
  const fams = useCount("families");
  const units = useCount("units");
  const users = useCount("user_roles");
  const keys = useCount("api_consumers");
  const sups = useCount("suppliers");

  const stats = [
    { label: "الفئات", value: cats.data, to: "/admin/categories" },
    { label: "العائلات", value: fams.data, to: "/admin/families" },
    { label: "الوحدات", value: units.data, to: "/admin/units" },
    { label: "الموردون", value: sups.data, to: "/suppliers" },
    { label: "المستخدمون", value: users.data, to: "/admin/users", adminOnly: true },
    { label: "مفاتيح API", value: keys.data, to: "/admin/api-keys", adminOnly: true },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="size-6" />
          لوحة الإدارة
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          مركز موحد لإدارة موارد التطبيق: المستخدمون، الصلاحيات، البيانات المرجعية، والتكاملات.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats
          .filter((s) => !s.adminOnly || role === "admin")
          .map((s) => (
            <Link key={s.label} to={s.to}>
              <Card className="p-4 surface-elevated border-0 hover:bg-accent/5 transition-colors">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold num mt-1">{s.value ?? "—"}</div>
              </Card>
            </Link>
          ))}
      </div>

      <div>
        <h2 className="font-semibold mb-3">أقسام الإدارة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADMIN_NAV.filter(
            (n) => !n.exact && (!("adminOnly" in n && n.adminOnly) || role === "admin"),
          ).map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="p-4 surface-elevated border-0 hover:bg-accent/5 transition-colors h-full">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <item.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    {"external" in item && item.external && (
                      <div className="text-[11px] text-muted-foreground">صفحة موجودة</div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
