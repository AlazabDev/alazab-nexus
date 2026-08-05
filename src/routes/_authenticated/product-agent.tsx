import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  askProductAgent,
  applyProductAgentPatch,
  getProductAgentStatus,
  searchAgentProducts,
} from "@/lib/product-agent.functions";
import { FIELD_LABELS_AR, stripJsonBlock, type AgentSuggestion } from "@/lib/product-agent.shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Sparkles, Check, Search, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { AgentHealthIndicator } from "@/components/agent-health-indicator";


export const Route = createFileRoute("/_authenticated/product-agent")({
  head: () => ({
    meta: [
      { title: "وكيل المنتجات · ضبط الكتالوج — Alazab PAOP" },
      {
        name: "description",
        content:
          "شاشة العمل مع وكيل az-agent-prod لضبط بيانات المنتجات: تحسين الأسماء والأوصاف والمحتوى وتطبيق الاقتراحات مباشرة.",
      },
      { property: "og:title", content: "وكيل المنتجات · ضبط الكتالوج" },
      {
        property: "og:description",
        content: "اعمل مع وكيل Azure AI Foundry لضبط بيانات منتجات العزب وتطبيق التعديلات فوراً.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductAgentPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "راجع بيانات هذا المنتج واقترح تحسينات كاملة",
  "اكتب وصفاً تسويقياً احترافياً بالعربية والإنجليزية",
  "اقترح وسوم وكلمات بحث مناسبة",
  "أنشئ المحتوى الفني وملاحظات التركيب والصيانة",
];

function ProductAgentPage() {
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [suggestion, setSuggestion] = useState<AgentSuggestion | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "مرحباً، أنا وكيل المنتجات (az-agent-prod). اختر منتجاً من القائمة ثم اطلب مني ضبط بياناته.",
    },
  ]);

  const statusFn = useServerFn(getProductAgentStatus);
  const searchFn = useServerFn(searchAgentProducts);
  const askFn = useServerFn(askProductAgent);
  const applyFn = useServerFn(applyProductAgentPatch);

  const status = useQuery({ queryKey: ["product-agent-status"], queryFn: () => statusFn({}) });

  const products = useQuery({
    queryKey: ["product-agent-products", search],
    queryFn: () => searchFn({ data: { q: search } }),
  });

  const selected = products.data?.find((p) => p.id === productId);

  const ask = useMutation({
    mutationFn: async (text: string) => {
      const next = [...messages, { role: "user" as const, content: text }];
      return askFn({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          productId,
          sessionId,
        },
      });
    },
    onSuccess: (res) => {
      setSessionId(res.sessionId ?? sessionId);
      if (res.suggestion) setSuggestion(res.suggestion);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: stripJsonBlock(res.reply) || res.reply },
      ]);
    },
    onError: (e: Error) => toast.error(e.message || "تعذر الاتصال بالوكيل"),
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!productId || !suggestion) throw new Error("اختر منتجاً أولاً");
      return applyFn({ data: { productId, patch: suggestion } });
    },
    onSuccess: (res) => {
      toast.success(`تم تطبيق ${res.applied.length} حقل على المنتج`);
      setSuggestion(null);
    },
    onError: (e: Error) => toast.error(e.message || "فشل تطبيق التعديلات"),
  });

  const send = (text: string) => {
    if (!text.trim() || ask.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
    ask.mutate(text.trim());
    setInput("");
  };

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header className="flex flex-wrap items-center gap-3">
        <div className="size-10 rounded-xl bg-accent text-accent-foreground grid place-items-center">
          <Bot className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">وكيل المنتجات</h1>
          <p className="text-xs text-muted-foreground">
            Azure AI Foundry · {status.data?.agentName ?? "az-agent-prod"} v
            {status.data?.agentVersion ?? "—"} · {status.data?.modelDeployment ?? ""}
          </p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <AgentHealthIndicator />
          <Badge variant={status.data?.apiKey ? "secondary" : "destructive"} className="gap-1">
            <CircleDot className="size-3" /> {status.data?.apiKey ? "المفتاح مهيأ" : "المفتاح مفقود"}
          </Badge>
        </div>

      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_300px]">
        {/* Product picker */}
        <Card className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برمز AZ أو الاسم"
              className="pr-8"
            />
          </div>
          <ScrollArea className="h-[440px] pl-2">
            <div className="space-y-1">
              {products.data?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProductId(p.id);
                    setSuggestion(null);
                    setSessionId(undefined);
                  }}
                  className={`w-full text-right rounded-lg px-3 py-2 text-sm transition-colors ${
                    p.id === productId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium truncate">{p.name_ar}</div>
                  <div className="text-[10px] opacity-70 num" dir="ltr">
                    {p.az_code}
                  </div>
                </button>
              ))}
              {products.isLoading && (
                <div className="text-xs text-muted-foreground p-2">جارٍ التحميل…</div>
              )}
              {products.data?.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">لا توجد نتائج</div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col overflow-hidden h-[520px]">
          <div className="h-12 px-4 flex items-center gap-2 border-b text-sm">
            <Sparkles className="size-4 text-accent" />
            {selected ? (
              <span className="font-medium">
                {selected.name_ar} <span className="num text-muted-foreground" dir="ltr">({selected.az_code})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">لم يتم اختيار منتج</span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="size-7 rounded-full grid place-items-center bg-muted shrink-0">
                  {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="text-sm text-muted-foreground animate-pulse">الوكيل يفكر…</div>
            )}
          </div>

          <div className="border-t p-2 flex gap-1 flex-wrap">
            {QUICK_PROMPTS.map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                className="text-[11px] h-7"
                disabled={ask.isPending}
                onClick={() => send(q)}
              >
                {q}
              </Button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t p-3 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب طلبك للوكيل…"
              disabled={ask.isPending}
            />
            <Button type="submit" disabled={ask.isPending || !input.trim()} className="gap-2">
              <Send className="size-4" /> إرسال
            </Button>
          </form>
        </Card>

        {/* Suggestions */}
        <Card className="p-3 space-y-3 h-[520px] flex flex-col">
          <div className="font-semibold text-sm">التعديلات المقترحة</div>
          <ScrollArea className="flex-1 pl-2">
            {suggestion ? (
              <div className="space-y-3">
                {Object.entries(suggestion).map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-2">
                    <div className="text-[11px] font-medium text-muted-foreground mb-1">
                      {FIELD_LABELS_AR[k] ?? k}
                    </div>
                    <div className="text-xs whitespace-pre-wrap break-words">
                      {Array.isArray(v) ? v.join("، ") : v}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                اطلب من الوكيل مراجعة المنتج وستظهر هنا الحقول المقترحة لتطبيقها بضغطة واحدة.
              </p>
            )}
          </ScrollArea>
          <Button
            className="gap-2"
            disabled={!suggestion || !productId || apply.isPending}
            onClick={() => apply.mutate()}
          >
            <Check className="size-4" /> تطبيق على المنتج
          </Button>
        </Card>
      </div>
    </div>
  );
}
