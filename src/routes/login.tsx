import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — Alazab PAOP" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("تم تسجيل الدخول بنجاح");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" dir="rtl">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-accent text-accent-foreground grid place-items-center font-bold">
            AZ
          </div>
          <div>
            <div className="text-lg font-bold">Alazab PAOP</div>
            <div className="text-xs text-sidebar-foreground/70">
              Product Asset Operations Platform
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="gold-divider" />
          <h1 className="text-3xl font-bold leading-tight">
            مركز التحكم المركزي
            <br />
            لإدارة الأصول والمنتجات والخدمات
          </h1>
          <p className="text-sidebar-foreground/80 leading-loose">
            منصة العزب الموحدة لتنظيم الكتالوج، إدارة التسعير، الربط مع الموردين، وتوفير API قوي
            للتكامل مع كل الأنظمة الخارجية.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              ["2,794", "بند معتمد"],
              ["15", "جدول بيانات"],
              ["10+", "نقطة تكامل"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="rounded-lg border border-sidebar-border bg-sidebar-accent p-4"
              >
                <div className="text-2xl font-bold text-accent num">{v}</div>
                <div className="text-xs text-sidebar-foreground/70 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-sidebar-foreground/60 flex items-center gap-2">
          <ShieldCheck className="size-4" />
          محمي بمصادقة متعددة الطبقات و Row-Level Security
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md surface-elevated rounded-xl p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              AZ
            </div>
            <div className="font-bold">Alazab PAOP</div>
          </div>
          <h2 className="text-2xl font-bold">تسجيل الدخول</h2>
          <p className="text-sm text-muted-foreground mt-1">
            الوصول إلى المنصة للمستخدمين المُصرح لهم فقط. للحصول على حساب، تواصل مع مدير النظام.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="mt-1.5 num"
              />
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="mt-1.5 num"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري المعالجة..." : "دخول"}
            </Button>
          </form>
          <p className="mt-6 text-xs text-center text-muted-foreground">
            بالدخول، أنت توافق على سياسات المنصة الأمنية.
          </p>
        </div>
      </div>
    </div>
  );
}

