import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentHealth } from "@/lib/agent-health.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2 } from "lucide-react";

const OVERALL: Record<string, { label: string; className: string }> = {
  ok: {
    label: "الاتصال سليم",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  degraded: {
    label: "اتصال جزئي",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  down: {
    label: "الاتصال متعطل",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  unconfigured: { label: "غير مهيأ", className: "bg-muted text-muted-foreground border-border" },
};

function Dot({ ok, configured }: { ok: boolean; configured: boolean }) {
  if (!configured) return <AlertTriangle className="size-4 text-muted-foreground shrink-0" />;
  return ok ? (
    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
  ) : (
    <XCircle className="size-4 text-destructive shrink-0" />
  );
}

export function AgentHealthIndicator({ compact = false }: { compact?: boolean }) {
  const fn = useServerFn(getAgentHealth);
  const health = useQuery({
    queryKey: ["agent-health"],
    queryFn: () => fn({}),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const overall = OVERALL[health.data?.overall ?? "unconfigured"]!;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="outline-none">
          <Badge variant="outline" className={`gap-1.5 cursor-pointer ${overall.className}`}>
            {health.isFetching ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Activity className="size-3" />
            )}
            {health.isLoading ? "جارٍ الفحص…" : overall.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">صحة الاتصال بالوكيل</div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
            aria-label="إعادة الفحص"
          >
            <RefreshCw className={`size-3.5 ${health.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {!compact && health.data && (
          <div className="text-[11px] text-muted-foreground num" dir="ltr">
            {health.data.agentName} v{health.data.agentVersion} · {health.data.modelDeployment}
          </div>
        )}

        <div className="space-y-2">
          {health.data?.services.map((s) => (
            <div key={s.key} className="flex items-start gap-2 rounded-lg border p-2">
              <Dot ok={s.ok} configured={s.configured} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{s.label}</div>
                <div className="text-[11px] text-muted-foreground break-words">{s.detail}</div>
              </div>
              {s.latencyMs !== null && (
                <span className="text-[10px] text-muted-foreground num shrink-0" dir="ltr">
                  {s.latencyMs}ms
                </span>
              )}
            </div>
          ))}
          {health.isError && <div className="text-xs text-destructive">تعذر جلب حالة الاتصال.</div>}
        </div>

        {health.data && (
          <div className="text-[10px] text-muted-foreground num" dir="ltr">
            {new Date(health.data.checkedAt).toLocaleTimeString()}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
