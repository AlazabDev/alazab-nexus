import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, RotateCcw, Loader2, History, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getCategoryApprovalStats,
  bulkSetProductStatus,
  getBulkStatusHistory,
} from "@/lib/product-approvals.functions";

export const Route = createFileRoute("/_authenticated/admin/products/bulk-approval")({
  head: () => ({
    meta: [
      { title: "الاعتماد الجماعي للمنتجات — Alazab PAOP" },
      {
        name: "description",
        content: "التحكم بحالة الاعتماد (معتمد / قيد المراجعة) لكل فئة منتجات مع سجل تغييرات كامل.",
      },
    ],
  }),
  component: BulkApprovalPage,
});

function BulkApprovalPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");

  const statsFn = useServerFn(getCategoryApprovalStats);
  const historyFn = useServerFn(getBulkStatusHistory);
  const bulkFn = useServerFn(bulkSetProductStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "category-approval-stats"],
    queryFn: () => statsFn({}),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["admin", "bulk-status-history"],
    queryFn: () => historyFn({}),
  });

  const mutate = useMutation({
    mutationFn: (input: {
      categoryId?: string | null;
      uncategorized?: boolean;
      fromStatus: "approved" | "needs_review";
      toStatus: "approved" | "needs_review";
    }) => bulkFn({ data: { ...input, note: note || undefined } }),
    onSuccess: (res) => {
      toast.success(`تم تحديث ${res.count.toLocaleString("ar-EG")} منتج`);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin", "category-approval-stats"] });
      qc.invalidateQueries({ queryKey: ["admin", "bulk-status-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    const list = data?.categories ?? [];
    const q = search.trim();
    return q ? list.filter((c) => c.name.includes(q)) : list;
  }, [data, search]);

  const totals = data?.totals ?? { approved: 0, needs_review: 0, other: 0 };

  return (
    <div className="p-6 space-y-6 max-w-[1200px]" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          الاعتماد الجماعي للمنتجات
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تبديل حالة المنتجات بين «معتمد» و«قيد المراجعة» لكل فئة دفعة واحدة، مع حفظ سجل بكل تغيير.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="معتمد" value={totals.approved} tone="text-emerald-600" />
        <StatCard label="قيد المراجعة" value={totals.needs_review} tone="text-amber-600" />
        <StatCard label="حالات أخرى" value={totals.other} tone="text-muted-foreground" />
      </div>

      <Card className="p-4 surface-elevated border-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الفئات..."
              className="pr-9"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={mutate.isPending || totals.needs_review === 0}
            onClick={() => mutate.mutate({ fromStatus: "needs_review", toStatus: "approved" })}
          >
            <CheckCircle2 className="size-4" />
            اعتماد الكل
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={mutate.isPending || totals.approved === 0}
            onClick={() => mutate.mutate({ fromStatus: "approved", toStatus: "needs_review" })}
          >
            <RotateCcw className="size-4" />
            إرجاع الكل للمراجعة
          </Button>
        </div>
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="سبب/ملاحظة تُحفظ مع سجل التغيير (اختياري)"
        />
      </Card>

      {isLoading ? (
        <div className="grid place-items-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => {
            const isNone = c.id === "__none__";
            const scope = isNone ? { uncategorized: true } : { categoryId: c.id };
            return (
              <Card
                key={c.id}
                className="p-4 surface-elevated border-0 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold">{c.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="default" className="num">
                      معتمد {c.approved.toLocaleString("ar-EG")}
                    </Badge>
                    <Badge variant="secondary" className="num">
                      قيد المراجعة {c.needs_review.toLocaleString("ar-EG")}
                    </Badge>
                    {c.other > 0 && (
                      <Badge variant="outline" className="num">
                        أخرى {c.other.toLocaleString("ar-EG")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={mutate.isPending || c.needs_review === 0}
                    onClick={() =>
                      mutate.mutate({ ...scope, fromStatus: "needs_review", toStatus: "approved" })
                    }
                  >
                    اعتماد
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutate.isPending || c.approved === 0}
                    onClick={() =>
                      mutate.mutate({ ...scope, fromStatus: "approved", toStatus: "needs_review" })
                    }
                  >
                    للمراجعة
                  </Button>
                </div>
              </Card>
            );
          })}
          {categories.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground surface-elevated border-0">
              لا توجد فئات مطابقة
            </Card>
          )}
        </div>
      )}

      <Card className="p-5 surface-elevated border-0">
        <h2 className="font-bold flex items-center gap-2 mb-3">
          <History className="size-5" />
          سجل التغييرات
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة بعد.</p>
        ) : (
          <div className="divide-y">
            {history.map((h: any) => (
              <div key={h.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="outline">{h.action}</Badge>
                <span className="num">{(h.new_value?.count ?? 0).toLocaleString("ar-EG")} منتج</span>
                <span className="text-muted-foreground">
                  {h.new_value?.scope === "all"
                    ? "كل الفئات"
                    : h.new_value?.scope === "uncategorized"
                      ? "بدون فئة"
                      : "فئة محددة"}
                </span>
                {h.new_value?.note && (
                  <span className="text-muted-foreground truncate">— {h.new_value.note}</span>
                )}
                <span dir="ltr" className="num text-xs text-muted-foreground mr-auto">
                  {new Date(h.created_at).toLocaleString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-4 surface-elevated border-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-black num mt-1 ${tone}`}>{value.toLocaleString("ar-EG")}</div>
    </Card>
  );
}
