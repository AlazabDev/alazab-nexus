import { useCallback, useRef, useState } from "react";

export type OpKind = "upload" | "url" | "ai-generate" | "ai-edit";
export type OpStatus = "running" | "success" | "error";
export type LogLevel = "info" | "warn" | "error" | "success";

export type OpLogEntry = {
  ts: number;
  level: LogLevel;
  message: string;
};

export type OpContext = {
  correlationId: string;
  log: (message: string, level?: LogLevel) => void;
  setProgress: (value: number) => void;
};

export type AiOp = {
  id: string;
  correlationId: string;
  kind: OpKind;
  label: string;
  status: OpStatus;
  progress: number;
  error?: string;
  errorStack?: string;
  attempts: number;
  startedAt: number;
  endedAt?: number;
  logs: OpLogEntry[];
  run: (ctx: OpContext) => Promise<void>;
};

const KIND_LABEL: Record<OpKind, string> = {
  upload: "رفع ملف",
  url: "إضافة من رابط",
  "ai-generate": "إنشاء AI",
  "ai-edit": "تعديل AI",
};

function genCorrelationId() {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAiOps() {
  const [ops, setOps] = useState<AiOp[]>([]);
  const opsRef = useRef<AiOp[]>([]);
  opsRef.current = ops;

  const patch = useCallback((id: string, p: Partial<AiOp> | ((o: AiOp) => Partial<AiOp>)) => {
    setOps((cur) => cur.map((o) => (o.id === id ? { ...o, ...(typeof p === "function" ? p(o) : p) } : o)));
  }, []);

  const appendLog = useCallback((id: string, entry: OpLogEntry) => {
    setOps((cur) => cur.map((o) => (o.id === id ? { ...o, logs: [...o.logs, entry] } : o)));
  }, []);

  const remove = useCallback((id: string) => setOps((cur) => cur.filter((o) => o.id !== id)), []);
  const clearDone = useCallback(
    () => setOps((cur) => cur.filter((o) => o.status === "running")),
    [],
  );

  const execute = useCallback(
    async (id: string, fn: (ctx: OpContext) => Promise<void>, correlationId: string) => {
      let tick = 10;
      const interval = setInterval(() => {
        tick = Math.min(90, tick + Math.max(1, (90 - tick) * 0.15));
        setOps((cur) =>
          cur.map((o) => (o.id === id && o.status === "running" ? { ...o, progress: tick } : o)),
        );
      }, 400);

      const ctx: OpContext = {
        correlationId,
        log: (message, level = "info") => {
          // eslint-disable-next-line no-console
          console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
            `[${correlationId}] ${message}`,
          );
          appendLog(id, { ts: Date.now(), level, message });
        },
        setProgress: (value) => {
          tick = Math.max(tick, Math.min(95, value));
          patch(id, { progress: tick });
        },
      };

      ctx.log("بدء التنفيذ", "info");

      try {
        await fn(ctx);
        clearInterval(interval);
        ctx.log("اكتمل بنجاح", "success");
        patch(id, { status: "success", progress: 100, endedAt: Date.now() });
      } catch (e: any) {
        clearInterval(interval);
        const msg = e?.message ?? "فشل التنفيذ";
        ctx.log(`فشل: ${msg}`, "error");
        if (e?.stack) {
          appendLog(id, { ts: Date.now(), level: "error", message: String(e.stack).split("\n").slice(0, 4).join("\n") });
        }
        patch(id, { status: "error", error: msg, errorStack: e?.stack, endedAt: Date.now() });
      }
    },
    [appendLog, patch],
  );

  const start = useCallback(
    async (kind: OpKind, label: string, fn: (ctx: OpContext) => Promise<void> | Promise<unknown>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const correlationId = genCorrelationId();
      const wrapped: AiOp["run"] = async (ctx) => {
        await fn(ctx);
      };
      const op: AiOp = {
        id,
        correlationId,
        kind,
        label: label || KIND_LABEL[kind],
        status: "running",
        progress: 10,
        attempts: 1,
        startedAt: Date.now(),
        logs: [],
        run: wrapped,
      };
      setOps((cur) => [...cur, op]);
      await execute(id, wrapped, correlationId);
    },
    [execute],
  );

  const retry = useCallback(
    async (id: string) => {
      const op = opsRef.current.find((o) => o.id === id);
      if (!op) return;
      patch(id, (o) => ({
        status: "running",
        progress: 10,
        error: undefined,
        errorStack: undefined,
        attempts: o.attempts + 1,
        endedAt: undefined,
        logs: [...o.logs, { ts: Date.now(), level: "info", message: `— إعادة المحاولة #${o.attempts + 1} —` }],
      }));
      await execute(id, op.run, op.correlationId);
    },
    [execute, patch],
  );

  return { ops, start, retry, remove, clearDone };
}
