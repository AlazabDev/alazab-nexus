import { useSyncExternalStore } from "react";

export type QuoteItem = {
  az_code: string;
  name_ar: string;
  image: string | null;
  price: number | null;
  qty: number;
};

const KEY = "alazab_quote_cart_v1";
const listeners = new Set<() => void>();
let cache: QuoteItem[] = [];
let cacheRaw = "";

function read(): QuoteItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY) ?? "[]";
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed = JSON.parse(raw);
      cache = Array.isArray(parsed) ? (parsed as QuoteItem[]) : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(items: QuoteItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

const EMPTY: QuoteItem[] = [];

export function useQuoteCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0),
    has: (code: string) => items.some((i) => i.az_code === code),
    add: (item: Omit<QuoteItem, "qty">, qty = 1) => {
      const current = read();
      const existing = current.find((i) => i.az_code === item.az_code);
      write(
        existing
          ? current.map((i) => (i.az_code === item.az_code ? { ...i, qty: i.qty + qty } : i))
          : [...current, { ...item, qty }],
      );
    },
    setQty: (code: string, qty: number) => {
      const current = read();
      write(
        qty <= 0
          ? current.filter((i) => i.az_code !== code)
          : current.map((i) => (i.az_code === code ? { ...i, qty } : i)),
      );
    },
    remove: (code: string) => write(read().filter((i) => i.az_code !== code)),
    clear: () => write([]),
  };
}
