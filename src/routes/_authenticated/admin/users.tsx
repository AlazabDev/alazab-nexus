import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", s.session.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "المستخدمون والأدوار — لوحة الإدارة" }] }),
  component: UsersPage,
});

const ROLES: AppRole[] = ["admin", "editor", "viewer"];
const ROLE_LABELS: Record<AppRole, string> = {
  admin: "مدير",
  editor: "محرر",
  viewer: "مشاهد",
};

function UsersPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const byUser = new Map<string, { user_id: string; roles: { id: string; role: AppRole }[] }>();
      for (const r of data ?? []) {
        if (!byUser.has(r.user_id)) byUser.set(r.user_id, { user_id: r.user_id, roles: [] });
        byUser.get(r.user_id)!.roles.push({ id: r.id, role: r.role as AppRole });
      }
      return Array.from(byUser.values());
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-roles"] });
      toast.success("تم منح الصلاحية");
    },
    onError: (e: any) => toast.error(e?.message || "فشل"),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-roles"] });
      toast.success("تم السحب");
    },
  });

  return (
    <div className="p-6 space-y-4 max-w-[1000px]">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="size-6" />
          المستخدمون والأدوار
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          امنح أو اسحب صلاحيات المستخدمين المسجّلين. لإضافة مستخدم جديد، يجب تسجيله من صفحة الدخول
          أولاً.
        </p>
      </div>

      <Card className="p-4 surface-elevated border-0">
        {isLoading && <div className="text-center text-muted-foreground py-8">جاري التحميل...</div>}
        {!isLoading && data?.length === 0 && (
          <div className="text-center text-muted-foreground py-8">لا يوجد مستخدمون</div>
        )}

        <div className="divide-y">
          {data?.map((u) => (
            <UserRow
              key={u.user_id}
              userId={u.user_id}
              roles={u.roles}
              onAdd={(role) => addRole.mutate({ user_id: u.user_id, role })}
              onRemove={(id) => removeRole.mutate(id)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function UserRow({
  userId,
  roles,
  onAdd,
  onRemove,
}: {
  userId: string;
  roles: { id: string; role: AppRole }[];
  onAdd: (role: AppRole) => void;
  onRemove: (id: string) => void;
}) {
  const currentRoles = new Set(roles.map((r) => r.role));
  const available = ROLES.filter((r) => !currentRoles.has(r));
  return (
    <div className="py-3 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="text-xs num text-muted-foreground truncate" dir="ltr">
          {userId}
        </div>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {roles.map((r) => (
            <Badge
              key={r.id}
              variant="outline"
              className={
                r.role === "admin"
                  ? "bg-destructive/15 text-destructive"
                  : r.role === "editor"
                    ? "bg-accent/15 text-accent"
                    : "bg-muted"
              }
            >
              {ROLE_LABELS[r.role]}
              <button
                onClick={() => {
                  if (confirm(`سحب صلاحية ${ROLE_LABELS[r.role]}؟`)) onRemove(r.id);
                }}
                className="mr-1 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      {available.length > 0 && (
        <Select onValueChange={(v) => onAdd(v as AppRole)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="منح صلاحية..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
