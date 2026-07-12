import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Key, Plus, Copy, RefreshCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({
  beforeLoad: async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", s.session.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "مفاتيح API — لوحة الإدارة" }] }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("web");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-api-consumers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_consumers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const apiKey = `ak_${crypto.randomUUID().replace(/-/g, "")}`;
      const { error } = await supabase
        .from("api_consumers")
        .insert({ name, api_key: apiKey, channel, created_by: user?.id });
      if (error) throw error;
      return apiKey;
    },
    onSuccess: (key) => {
      navigator.clipboard.writeText(key);
      toast.success("تم إنشاء المفتاح ونسخه");
      qc.invalidateQueries({ queryKey: ["admin-api-consumers"] });
      setOpen(false);
      setName("");
    },
    onError: () => toast.error("فشل الإنشاء"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("api_consumers")
        .update({ is_active: !active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-api-consumers"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_consumers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-api-consumers"] });
      toast.success("تم الحذف");
    },
  });

  return (
    <div className="p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="size-6" />
            مفاتيح API
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مفاتيح للوصول للبيانات من التطبيقات الخارجية (ERP، موبايل، أو مسارات مخصصة).
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 ml-1" />
          مفتاح جديد
        </Button>
      </div>

      {isLoading && (
        <Card className="p-8 text-center text-muted-foreground surface-elevated border-0">
          جاري التحميل...
        </Card>
      )}

      <div className="grid gap-3">
        {data?.map((api) => (
          <Card key={api.id} className="p-4 surface-elevated border-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{api.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      api.is_active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {api.is_active ? "نشط" : "معطل"}
                  </Badge>
                  <Badge variant="outline">{api.channel}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-xs num bg-secondary px-2 py-1 rounded" dir="ltr">
                    {api.api_key.slice(0, 24)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(api.api_key);
                      toast.success("تم النسخ");
                    }}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>
                    الطلبات: <span className="num">{api.total_requests.toLocaleString()}</span>
                  </span>
                  <span>
                    الحد: <span className="num">{api.rate_limit_per_minute}</span>/دقيقة
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggle.mutate({ id: api.id, active: api.is_active })}
                >
                  <RefreshCw className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("حذف المفتاح؟")) del.mutate(api.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مفتاح API جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>اسم التطبيق</Label>
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: تطبيق الموبايل"
              />
            </div>
            <div>
              <Label>القناة</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">ويب</SelectItem>
                  <SelectItem value="mobile">موبايل</SelectItem>
                  <SelectItem value="erp">ERP</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
