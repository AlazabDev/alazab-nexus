import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, RotateCw, X, Upload, Link as LinkIcon, Sparkles, Wand2 } from "lucide-react";
import type { AiOp, OpKind } from "@/hooks/use-ai-ops";

const ICON: Record<OpKind, React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  url: LinkIcon,
  "ai-generate": Sparkles,
  "ai-edit": Wand2,
};

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
          <Loader2 className={`size-4 ${ops.some((o) => o.status === "running") ? "animate-spin text-accent" : "text-muted-foreground"}`} />
          عمليات قيد التنفيذ
          <Badge variant="secondary" className="num" dir="ltr">{ops.length}</Badge>
        </div>
        {doneCount > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearDone}>
            مسح المنتهية
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {ops.map((o) => {
          const Icon = ICON[o.kind];
          return (
            <li key={o.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
              <Icon className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{o.label}</div>
                  <div className="flex items-center gap-1">
                    {o.status === "running" && <Loader2 className="size-3.5 animate-spin text-accent" />}
                    {o.status === "success" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                    {o.status === "error" && <AlertCircle className="size-3.5 text-destructive" />}
                    {o.attempts > 1 && (
                      <span className="text-[10px] text-muted-foreground num" dir="ltr">×{o.attempts}</span>
                    )}
                  </div>
                </div>
                <Progress
                  value={o.progress}
                  className={`h-1.5 mt-1 ${o.status === "error" ? "[&>div]:bg-destructive" : o.status === "success" ? "[&>div]:bg-emerald-500" : ""}`}
                />
                {o.status === "error" && (
                  <div className="text-[11px] text-destructive mt-1 truncate" title={o.error}>
                    {o.error}
                  </div>
                )}
              </div>
              {o.status === "error" && (
                <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => onRetry(o.id)}>
                  <RotateCw className="size-3" /> إعادة
                </Button>
              )}
              {o.status !== "running" && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDismiss(o.id)}>
                  <X className="size-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
