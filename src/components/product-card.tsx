import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { Package } from "lucide-react";

export interface ProductCardData {
  id: string;
  az_code: string | null;
  name_ar: string | null;
  name_en: string | null;
  gpc_family: string | null;
  sector_ar: string | null;
  confidence_level: string | null;
  status: string;
  cover_url?: string | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  approved: { label: "معتمد", cls: "bg-success/15 text-success" },
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  needs_review: { label: "مراجعة", cls: "bg-warning/20 text-foreground" },
  rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive" },
  archived: { label: "مؤرشف", cls: "bg-muted text-muted-foreground" },
};

const CONF_MAP: Record<string, { label: string; cls: string }> = {
  high: { label: "ثقة عالية", cls: "bg-success/15 text-success" },
  medium: { label: "متوسط", cls: "bg-warning/20 text-foreground" },
  low: { label: "منخفض", cls: "bg-destructive/15 text-destructive" },
};

export function ProductCard({
  p,
  selected,
  onToggle,
}: {
  p: ProductCardData;
  selected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const status = STATUS_MAP[p.status] ?? { label: p.status, cls: "bg-secondary" };
  const conf = p.confidence_level ? CONF_MAP[p.confidence_level] : null;

  return (
    <div
      className={`product-card group relative ${selected ? "ring-2 ring-accent border-accent" : ""}`}
    >
      <div className="absolute top-3 right-3 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onToggle(!!c)}
          className="bg-card/90 backdrop-blur shadow-sm"
        />
      </div>
      <div className="absolute top-3 left-3 z-10">
        <span className={`text-[10px] px-2 py-0.5 rounded ${status.cls}`}>{status.label}</span>
      </div>

      <Link
        to="/products/$id"
        params={{ id: p.id }}
        className="block thumb aspect-[4/3] grid place-items-center overflow-hidden"
      >
        {p.cover_url ? (
          <img
            src={p.cover_url}
            alt={p.name_ar ?? ""}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Package className="size-10 opacity-40" />
            <span className="text-[10px] mt-2 opacity-60">لا توجد صورة</span>
          </div>
        )}
      </Link>

      <div className="p-4 space-y-2">
        <div className="num text-[11px] text-accent font-semibold tracking-wide" dir="ltr">
          {p.az_code}
        </div>
        <Link to="/products/$id" params={{ id: p.id }}>
          <h3 className="font-display text-[15px] font-semibold leading-snug line-clamp-2 hover:text-primary transition-colors">
            {p.name_ar || p.name_en || "بدون اسم"}
          </h3>
        </Link>
        {p.name_en && (
          <div className="text-[11px] text-muted-foreground line-clamp-1" dir="ltr">
            {p.name_en}
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {p.gpc_family && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary">{p.gpc_family}</span>
          )}
          {conf && (
            <span className={`text-[10px] px-2 py-0.5 rounded ${conf.cls}`}>{conf.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
