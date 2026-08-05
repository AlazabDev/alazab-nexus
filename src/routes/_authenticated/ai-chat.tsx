import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { azureChatCompletion } from "@/lib/ai-assistant.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ConnectionStatusIndicator } from "@/components/connection-status-indicator";
import { ChatProductivityTools } from "@/components/chat-productivity-tools";
import { ChatSmartSuggestions } from "@/components/chat-smart-suggestions";
import { Bot, Send, User, Loader2, Sparkles, Menu } from "lucide-react";
import { toast } from "sonner";
import { sanitizeSearchTerm } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai-chat")({
  head: () => ({ meta: [{ title: "مساعد AI — Alazab PAOP" }] }),
  component: AiChat,
});

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `أنت مساعد ذكي لشركة العزب للتشطيبات. لديك صلاحية الوصول لقاعدة بيانات المنتجات (2,794 بند).
يمكنك:
- البحث عن منتجات بالاسم أو الكود
- تحسين وصف أي منتج
- الإجابة على أسئلة الكتالوج
- اقتراح أسعار تقديرية
أجب دائماً بالعربية وكن دقيقاً ومختصراً.`;

const SUGGESTIONS = [
  "ابحث عن منتجات الإضاءة",
  "كم عدد منتجات UberFix؟",
  "اقترح وصفاً لباب كشف MDF",
  "ما أفضل منتجات الرخام؟",
];

async function searchProducts(query: string) {
  const { data } = await supabase
    .from("products")
    .select("az_code, name_ar, description_ar, gpc_class, price")
    .or(`name_ar.ilike.%${sanitizeSearchTerm(query)}%,gpc_class.ilike.%${sanitizeSearchTerm(query)}%,az_code.ilike.%${sanitizeSearchTerm(query)}%`)
    .limit(5);
  return data ?? [];
}



function AiChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [conversationId] = useState(`chat-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);

    try {
      // معالجة الأوامر السريعة
      if (content.startsWith("/")) {
        const command = content.substring(1).toLowerCase();
        let quickResponse = "";

        switch (true) {
          case command === "مساعدة" || command === "help":
            quickResponse = `الأوامر السريعة المتاحة:
/مساعدة - عرض هذه الرسالة
/إحصائيات - إحصائيات المحادثة
/حفظ - حفظ المحادثة
/مسح - مسح المحادثة
/البحث [كلمة] - البحث عن منتج`;
            break;
          case command === "مسح" || command === "clear":
            setMsgs([]);
            quickResponse = "تم مسح المحادثة";
            break;
          case command.startsWith("بحث"):
          case command.startsWith("search"):
            quickResponse = "يرجى استخدام البحث العادي بدلاً من الأمر السريع";
            break;
          default:
            quickResponse = `أمر غير معروف: ${command}\nاكتب /مساعدة لعرض الأوامر المتاحة`;
        }

        setMsgs([...history, { role: "assistant", content: quickResponse }]);
        setLoading(false);
        return;
      }

      // بحث تلقائي لو الرسالة تحتوي كلمات بحث
      let context = "";
      const searchTerms = ["ابحث", "search", "منتج", "product", "كود", "code"];
      if (searchTerms.some(t => content.includes(t))) {
        const results = await searchProducts(content);
        if (results.length > 0) {
          context = `\n\nنتائج البحث:\n${results.map(p =>
            `- ${p.az_code}: ${p.name_ar} | ${p.gpc_class ?? ""} | سعر: ${p.price ?? "غير محدد"} ج.م`
          ).join("\n")}`;
        }
      }

      const messages = [
        { role: "system" as const, content: SYSTEM + context },
        ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const res = await azureChatCompletion({ data: { messages, max_tokens: 1000 } });

      if ("error" in res) throw new Error(res.error);

      const reply = res.choices?.[0]?.message?.content ?? "لم أستطع الرد";
      setMsgs([...history, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error("خطأ: " + (e.message ?? "فشل الاتصال"));
      setMsgs(history);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-accent" />
            <div>
              <h1 className="text-lg font-semibold">مساعد AI</h1>
              <p className="text-xs text-muted-foreground">
                اسأل عن المنتجات أو اطلب تحسين المحتوى
              </p>
            </div>
          </div>
          <ConnectionStatusIndicator showDetails={true} autoMonitor={true} />
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-160px)] max-w-3xl mx-auto p-4 gap-3">

        {/* منطقة المحادثة */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {msgs.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <Sparkles className="size-12 mx-auto text-accent/60" />
              <p className="text-muted-foreground text-sm">ابدأ المحادثة أو اختر من الاقتراحات</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Bot className="size-4 text-accent" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                ${m.role === "user"
                  ? "bg-accent text-accent-foreground rounded-tr-sm"
                  : "bg-secondary rounded-tl-sm"}`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot className="size-4 text-accent" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* الاقتراحات الذكية */}
        <ChatSmartSuggestions
          messages={msgs}
          onSuggestionClick={send}
        />

        {/* حقل الإدخال */}
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="اكتب رسالتك... (/ للأوامر السريعة)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-accent/40 max-h-32 overflow-y-auto"
            />
            <Button onClick={() => send()} disabled={!input.trim() || loading} size="icon" className="h-11 w-11 rounded-xl">
              <Send className="size-4" />
            </Button>
          </div>

          {/* الأدوات الإنتاجية */}
          {msgs.length > 0 && (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">
                {msgs.length} رسالة
              </span>
              <ChatProductivityTools
                messages={msgs.map(m => ({
                  role: m.role,
                  content: m.content,
                }))}
                conversationId={conversationId}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
