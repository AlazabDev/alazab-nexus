import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { AiOp, OpKind, LogLevel } from "@/hooks/use-ai-ops";

const ICON: Record<OpKind, React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  url: LinkIcon,
  "ai-generate": Sparkles,
  "ai-edit": Wand2,
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  warn: "text-amber-500",
  error: "text-destructive",
  success: "text-emerald-500",
};

const LEVEL_DOT: Record<LogLevel, string> = {
  info: "bg-muted-foreground/60",
  warn: "bg-amber-500",
  error: "bg-destructive",
  success: "bg-emerald-500",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function OpRow({
  op,
  onRetry,
  onDismiss,
}: {
  op: AiOp;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [open, setOpen] = useState(op.status === "error");
  const Icon = ICON[op.kind];
  const duration = (op.endedAt ?? Date.now()) - op.startedAt;

  const copyId = () => {
    navigator.clipboard?.writeText(op.correlationId);
    toast.success("تم نسخ المعرّف");
  };

  return (
    <li className="rounded-md bg-muted/40 overflow-hidden">
      <div className="flex items-center gap-3 p-2">
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium truncate">{op.label}</div>
            <div className="flex items-center gap-1">
              {op.status === "running" && <Loader2 className="size-3.5 animate-spin text-accent" />}
              {op.status === "success" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
              {op.status === "error" && <AlertCircle className="size-3.5 text-destructive" />}
              {op.attempts > 1 && (
                <span className="text-[10px] text-muted-foreground num" dir="ltr">
                  ×{op.attempts}
                </span>
              )}
            </div>
          </div>
          <Progress
            value={op.progress}
            className={`h-1.5 mt-1 ${
              op.status === "error"
                ? "[&>div]:bg-destructive"
                : op.status === "success"
                  ? "[&>div]:bg-emerald-500"
                  : ""
            }`}
          />
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <button
                onClick={copyId}
                className="font-mono hover:text-foreground transition flex items-center gap-1"
                dir="ltr"
                title="نسخ معرّف الترابط"
              >
                <Copy className="size-2.5" />
                {op.correlationId}
              </button>
              <span dir="ltr">· {formatDuration(duration)}</span>
              {op.logs.length > 0 && <span dir="ltr">· {op.logs.length} خطوة</span>}
            </div>
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              {open ? "إخفاء السجل" : "عرض السجل"}
              {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>
        </div>
        {op.status === "error" && (
          <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => onRetry(op.id)}>
            <RotateCw className="size-3" /> إعادة
          </Button>
        )}
        {op.status !== "running" && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDismiss(op.id)}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {open && (
        <div className="border-t border-border/50 bg-background/50 px-3 py-2 max-h-48 overflow-y-auto">
          {op.logs.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic">لا توجد خطوات بعد…</div>
          ) : (
            <ol className="space-y-1">
              {op.logs.map((entry, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span
                    className={`mt-1 size-1.5 rounded-full shrink-0 ${LEVEL_DOT[entry.level]}`}
                  />
                  <span className="text-muted-foreground font-mono shrink-0 num" dir="ltr">
                    {formatTime(entry.ts)}
                  </span>
                  <span className={`${LEVEL_COLOR[entry.level]} whitespace-pre-wrap break-words`}>
                    {entry.message}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

export function AiOpsPanel({
  ops,
  onRetry,
  onDismiss,
  onClearDone,
}: {
  ops: AiOp[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearDone: () => void;
}) {
  if (!ops.length) return null;
  const doneCount = ops.filter((o) => o.status !== "running").length;

  return (
    <Card className="p-3 surface-elevated border-0 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Loader2
            className={`size-4 ${
              ops.some((o) => o.status === "running")
                ? "animate-spin text-accent"
                : "text-muted-foreground"
            }`}
          />
          عمليات قيد التنفيذ
          <Badge variant="secondary" className="num" dir="ltr">
            {ops.length}
          </Badge>
        </div>
        {doneCount > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearDone}>
            مسح المنتهية
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {ops.map((o) => (
          <OpRow key={o.id} op={o} onRetry={onRetry} onDismiss={onDismiss} />
        ))}
      </ul>
    </Card>
  );
}
