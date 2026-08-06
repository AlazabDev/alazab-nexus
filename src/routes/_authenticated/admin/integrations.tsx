import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Network, Zap, CheckCircle2, XCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  testIntegrationConnection,
  type IntegrationType,
} from "@/lib/integrations-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.session.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "التكاملات — لوحة الإدارة" }] }),
  component: AdminIntegrationsPage,
});

type IntegrationDef = {
  type: IntegrationType;
  name: string;
  icon: string;
  description: string;
  fields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
};

const INTEGRATIONS: IntegrationDef[] = [
  {
    type: "erpnext",
    name: "ERPNext",
    icon: "📊",
    description: "ربط نظام إدارة الموارد Frappe/ERPNext",
    fields: [
      { key: "endpoint", label: "عنوان الخادم", placeholder: "https://erp.example.com" },
      { key: "apiKey", label: "API Key", secret: true },
      { key: "apiSecret", label: "API Secret", secret: true },
    ],
  },
  {
    type: "daftra",
    name: "Daftra",
    icon: "🏢",
    description: "نظام المحاسبة والفوترة",
    fields: [
      { key: "endpoint", label: "عنوان API (اختياري)", placeholder: "https://api.daftra.com" },
      { key: "apiKey", label: "APIKEY", secret: true },
    ],
  },
  {
    type: "supabase",
    name: "Supabase",
    icon: "⚡",
    description: "قاعدة البيانات والمصادقة",
    fields: [
      { key: "endpoint", label: "Project URL", placeholder: "https://xxx.supabase.co" },
      { key: "apiKey", label: "Publishable/Anon Key", secret: true },
    ],
  },
  {
    type: "rasa",
    name: "Rasa",
    icon: "🧠",
    description: "محرك المحادثة والذكاء الحواري",
    fields: [
      { key: "endpoint", label: "عنوان خادم Rasa", placeholder: "https://rasa.example.com" },
      { key: "apiKey", label: "Bearer Token (اختياري)", secret: true },
    ],
  },
  {
    type: "ai_agents",
    name: "AI Agents",
    icon: "🤖",
    description: "Azure OpenAI / AI Gateway للوكلاء الذكيين",
    fields: [
      { key: "endpoint", label: "Endpoint", placeholder: "https://xxx.openai.azure.com" },
      { key: "apiKey", label: "API Key", secret: true },
    ],
  },
];

type ConfigRow = {
  id: string;
  type: string;
  name: string | null;
  status: string;
  last_error: string | null;
  last_sync_at: string | null;
  config: Record<string, any> | null;
};

function AdminIntegrationsPage() {
  const qc = useQueryClient();
  const testFn = useServerFn(testIntegrationConnection);
  const [active, setActive] = useState<IntegrationType>("erpnext");

  const { data: configs } = useQuery({
    queryKey: ["admin-integration-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_configs")
        .select("id,type,name,status,last_error,last_sync_at,config");
      if (error) throw error;
      return (data ?? []) as ConfigRow[];
    },
  });

  const configByType = useMemo(() => {
    const m: Record<string, ConfigRow | undefined> = {};
    for (const c of configs ?? []) m[c.type] = c;
    return m;
  }, [configs]);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
          <Network className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">التكاملات</h1>
          <p className="text-sm text-muted-foreground">
            ضبط الربط مع الأنظمة الخارجية واختبار حالة الاتصال
          </p>
        </div>
      </header>

      <Tabs value={active} onValueChange={(v) => setActive(v as IntegrationType)}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          {INTEGRATIONS.map((i) => (
            <TabsTrigger key={i.type} value={i.type} className="gap-1.5">
              <span>{i.icon}</span>
              <span>{i.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {INTEGRATIONS.map((def) => (
          <TabsContent key={def.type} value={def.type} className="mt-4">
            <IntegrationCard
              def={def}
              row={configByType[def.type]}
              onTest={testFn}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin-integration-configs"] })}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function IntegrationCard({
  def,
  row,
  onTest,
  onSaved,
}: {
  def: IntegrationDef;
  row?: ConfigRow;
  onTest: ReturnType<typeof useServerFn<typeof testIntegrationConnection>>;
  onSaved: () => void;
}) {
  const initial = (row?.config as Record<string, string>) || {};
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; latency?: number } | null>(
    null,
  );

  const saveMut = useMutation({
    mutationFn: async (status?: string) => {
      const payload = {
        type: def.type,
        name: def.name,
        config: values,
        status: status ?? row?.status ?? "configured",
        updated_at: new Date().toISOString(),
      };
      if (row?.id) {
        const { error } = await supabase
          .from("integration_configs")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integration_configs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الحفظ"),
  });

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const { apiKey, endpoint, ...extra } = values;
      const res = await onTest({
        data: { type: def.type, endpoint, apiKey, extra },
      });
      setResult(res);
      // persist status
      await supabase.from("integration_configs").upsert(
        {
          type: def.type,
          name: def.name,
          config: values,
          status: res.ok ? "active" : "error",
          last_error: res.ok ? null : (res.message ?? null),
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "type" },
      );
      onSaved();
      if (res.ok) toast.success(`${def.name}: متصل (${res.latency}ms)`);
      else toast.error(`${def.name}: ${res.message}`);
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || "خطأ" });
      toast.error(e?.message || "فشل الاختبار");
    } finally {
      setTesting(false);
    }
  };

  const status = row?.status ?? "not_configured";
  const statusColor =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-700"
      : status === "error"
        ? "bg-red-500/15 text-red-700"
        : "bg-muted text-muted-foreground";

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{def.icon}</div>
          <div>
            <h2 className="text-lg font-semibold">{def.name}</h2>
            <p className="text-sm text-muted-foreground">{def.description}</p>
          </div>
        </div>
        <Badge className={statusColor}>
          {status === "active" ? "نشط" : status === "error" ? "خطأ" : "غير مُهيّأ"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {def.fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`${def.type}-${f.key}`}>{f.label}</Label>
            <Input
              id={`${def.type}-${f.key}`}
              type={f.secret ? "password" : "text"}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
            result.ok
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800"
              : "border-red-500/30 bg-red-500/5 text-red-800"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="size-4 mt-0.5 shrink-0" />
          )}
          <div>
            <div className="font-medium">
              {result.ok ? "الاتصال ناجح" : "فشل الاتصال"}
              {result.latency != null && ` — ${result.latency}ms`}
            </div>
            {result.message && <div className="text-xs opacity-80">{result.message}</div>}
          </div>
        </div>
      )}

      {row?.last_error && !result && (
        <div className="text-xs text-red-700 bg-red-500/5 border border-red-500/20 rounded p-2">
          آخر خطأ: {row.last_error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <Button onClick={handleTest} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          اختبار الاتصال
        </Button>
        <Button
          variant="outline"
          onClick={() => saveMut.mutate(undefined)}
          disabled={saveMut.isPending}
          className="gap-2"
        >
          <Save className="size-4" />
          حفظ الإعدادات
        </Button>
        {row?.last_sync_at && (
          <span className="text-xs text-muted-foreground mr-auto">
            آخر فحص: {new Date(row.last_sync_at).toLocaleString("ar-EG")}
          </span>
        )}
      </div>
    </Card>
  );
}
