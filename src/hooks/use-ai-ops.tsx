import { useCallback, useState } from "react";

export type OpKind = "upload" | "url" | "ai-generate" | "ai-edit";
export type OpStatus = "running" | "success" | "error";

export type AiOp = {
  id: string;
  kind: OpKind;
  label: string;
  status: OpStatus;
  progress: number; // 0..100
  error?: string;
  attempts: number;
  run: () => Promise<void>;
};

const KIND_LABEL: Record<OpKind, string> = {
  upload: "رفع ملف",
  url: "إضافة من رابط",
  "ai-generate": "إنشاء AI",
  "ai-edit": "تعديل AI",
};

export function useAiOps() {
  const [ops, setOps] = useState<AiOp[]>([]);

  const patch = (id: string, p: Partial<AiOp>) =>
    setOps((cur) => cur.map((o) => (o.id === id ? { ...o, ...p } : o)));

  const remove = (id: string) => setOps((cur) => cur.filter((o) => o.id !== id));
  const clearDone = () => setOps((cur) => cur.filter((o) => o.status === "running"));

  const start = useCallback(
    async (kind: OpKind, label: string, fn: () => Promise<void>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const op: AiOp = {
        id,
        kind,
        label: label || KIND_LABEL[kind],
        status: "running",
        progress: 10,
        attempts: 1,
        run: fn,
      };
      setOps((cur) => [...cur, op]);

      // soft progress ticker until done
      let tick = 10;
      const interval = setInterval(() => {
        tick = Math.min(90, tick + Math.max(1, (90 - tick) * 0.15));
        setOps((cur) => cur.map((o) => (o.id === id && o.status === "running" ? { ...o, progress: tick } : o)));
      }, 400);

      try {
        await fn();
        clearInterval(interval);
        patch(id, { status: "success", progress: 100 });
        setTimeout(() => remove(id), 2500);
      } catch (e: any) {
        clearInterval(interval);
        patch(id, { status: "error", error: e?.message ?? "فشل التنفيذ" });
      }
    },
    [],
  );

  const retry = useCallback(
    async (id: string) => {
      const op = ops.find((o) => o.id === id);
      if (!op) return;
      patch(id, { status: "running", progress: 10, error: undefined, attempts: op.attempts + 1 });
      let tick = 10;
      const interval = setInterval(() => {
        tick = Math.min(90, tick + Math.max(1, (90 - tick) * 0.15));
        setOps((cur) => cur.map((o) => (o.id === id && o.status === "running" ? { ...o, progress: tick } : o)));
      }, 400);
      try {
        await op.run();
        clearInterval(interval);
        patch(id, { status: "success", progress: 100 });
        setTimeout(() => remove(id), 2500);
      } catch (e: any) {
        clearInterval(interval);
        patch(id, { status: "error", error: e?.message ?? "فشل التنفيذ" });
      }
    },
    [ops],
  );

  return { ops, start, retry, remove, clearDone };
}
