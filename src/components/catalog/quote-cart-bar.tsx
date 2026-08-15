import { Link } from "@tanstack/react-router";
import { ShoppingCart, X } from "lucide-react";
import { useQuoteCart } from "@/lib/quote-cart";
import { Button } from "@/components/ui/button";

export function QuoteCartBar() {
  const { count, total, clear } = useQuoteCart();
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 print:hidden" dir="rtl">
      <div className="mx-auto max-w-3xl m-3 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
        <div className="relative">
          <ShoppingCart className="size-5 text-primary" />
          <span className="absolute -top-2 -left-2 min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
            {count}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">طلب عرض سعر</div>
          {total > 0 && (
            <div className="text-xs text-muted-foreground">
              تقديري: {total.toLocaleString("ar-EG")} ج.م
            </div>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/catalog/quote">مراجعة الطلب</Link>
        </Button>
        <button
          onClick={clear}
          aria-label="إفراغ الطلب"
          className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
