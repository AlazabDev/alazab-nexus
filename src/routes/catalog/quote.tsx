import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Package, Minus, Plus, Trash2, Phone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuoteCart } from "@/lib/quote-cart";

export const Route = createFileRoute("/catalog/quote")({
  head: () => ({
    meta: [
      { title: "طلب عرض سعر — كتالوج العزب للتشطيبات" },
      {
        name: "description",
        content: "راجع البنود المختارة وأرسل طلب عرض سعر مباشر لفريق العزب للتشطيبات المعمارية.",
      },
      { property: "og:title", content: "طلب عرض سعر — كتالوج العزب للتشطيبات" },
      {
        property: "og:description",
        content: "راجع البنود المختارة وأرسل طلب عرض سعر مباشر لفريق العزب للتشطيبات المعمارية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { items, total, setQty, remove, clear } = useQuoteCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const message = [
    "طلب عرض سعر — العزب للتشطيبات",
    name && `الاسم: ${name}`,
    phone && `الهاتف: ${phone}`,
    "",
    ...items.map((i, idx) => `${idx + 1}) ${i.name_ar} — ${i.az_code} × ${i.qty}`),
    "",
    total > 0 ? `الإجمالي التقديري: ${total.toLocaleString("ar-EG")} ج.م` : "",
    note && `ملاحظات: ${note}`,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/catalog">
              <ArrowRight className="size-4" /> الكتالوج
            </Link>
          </Button>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
              إفراغ الكل
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-black mb-1">طلب عرض سعر</h1>
        <p className="text-sm text-muted-foreground mb-6">
          راجع البنود وحدد الكميات، ثم أرسل الطلب لفريق المبيعات.
        </p>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <Package className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">لم تضف أي بنود بعد</p>
            <Button asChild>
              <Link to="/catalog">تصفح الكتالوج</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
            <div className="flex flex-col gap-2">
              {items.map((i) => (
                <div
                  key={i.az_code}
                  className="flex items-center gap-3 bg-card rounded-xl border border-border p-3"
                >
                  <div className="size-14 rounded-lg bg-muted overflow-hidden shrink-0 grid place-items-center">
                    {i.image ? (
                      <img src={i.image} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{i.name_ar}</div>
                    <div className="font-mono text-[10px] text-primary">{i.az_code}</div>
                    {i.price ? (
                      <div className="text-xs text-success font-bold mt-0.5">
                        {(i.price * i.qty).toLocaleString("ar-EG")} ج.م
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
                    <button
                      onClick={() => setQty(i.az_code, i.qty - 1)}
                      aria-label="إنقاص"
                      className="size-7 grid place-items-center rounded-md hover:bg-muted"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{i.qty}</span>
                    <button
                      onClick={() => setQty(i.az_code, i.qty + 1)}
                      aria-label="زيادة"
                      className="size-7 grid place-items-center rounded-md hover:bg-muted"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(i.az_code)}
                    aria-label="حذف"
                    className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <aside className="bg-card rounded-2xl border border-border p-5 space-y-3 md:sticky md:top-20">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm text-muted-foreground">الإجمالي التقديري</span>
                <span className="text-lg font-black text-success">
                  {total.toLocaleString("ar-EG")} ج.م
                </span>
              </div>
              <Input placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                placeholder="رقم الهاتف"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Textarea
                placeholder="ملاحظات إضافية..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <Button asChild className="w-full gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="size-4" /> إرسال عبر واتساب
                </a>
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "تم النسخ" : "نسخ تفاصيل الطلب"}
              </Button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                الأسعار المعروضة تقديرية وقابلة للتغيير حسب الكميات والمواصفات النهائية.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
