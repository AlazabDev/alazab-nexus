import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  uploadAndLinkAsset,
  deleteAssetLink,
  promoteToMain,
  reorderAssets,
  linkAssetFromUrl,
} from "@/lib/upload-assets";
import { generateProductImages } from "@/lib/product-image-gen.functions";
import { aiEditProductImage } from "@/lib/ai-image-edit.functions";
import { Upload, Star, ImageOff, Maximize2, Link as LinkIcon, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { SortableAssetGrid, type GridItem } from "@/components/sortable-asset-grid";
import { AssetLightbox } from "@/components/asset-lightbox";
import { useAiOps } from "@/hooks/use-ai-ops";
import { AiOpsPanel } from "@/components/ai-ops-panel";

type Row = {
  id: string;
  asset_role: string;
  sort_order: number;
  created_at: string;
  asset: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
  } | null;
};

export function ProductAssetsTab({ productId, azCode }: { productId: string; azCode: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(-1);
  const [urlInput, setUrlInput] = useState("");
  // aiBusy is now derived from aiOps after declaration below
  const [editDialog, setEditDialog] = useState<{ url: string; linkId: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [replaceOriginal, setReplaceOriginal] = useState(false);
  const genFn = useServerFn(generateProductImages);
  const editFn = useServerFn(aiEditProductImage);
  const aiOps = useAiOps();
  const aiBusy = aiOps.ops.some((o) => (o.kind === "ai-generate" || o.kind === "ai-edit") && o.status === "running");

  const { data: rows, isLoading } = useQuery<Row[]>({
    queryKey: ["product-assets", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_assets")
        .select(
          "id, asset_role, sort_order, created_at, asset:assets(id, file_name, file_url, file_type, file_size)",
        )
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const main = useMemo(() => rows?.find((r) => r.asset_role === "main_image") ?? null, [rows]);
  const gallery = useMemo(
    () => (rows ?? []).filter((r) => r.asset_role !== "main_image" && r.asset),
    [rows],
  );

  const gridItems: GridItem[] = useMemo(() => {
    const all = (rows ?? []).filter((r) => r.asset);
    return all.map((r) => ({
      linkId: r.id,
      url: r.asset!.file_url,
      fileName: r.asset!.file_name,
      fileType: r.asset!.file_type,
      role: r.asset_role,
      uploadedAt: r.created_at,
      isMain: r.asset_role === "main_image",
    }));
  }, [rows]);

  const lightboxItems = gridItems.map((g) => ({
    linkId: g.linkId,
    src: g.url,
    alt: g.fileName,
    isMain: g.isMain,
  }));

  const upload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      const existing = rows?.length ?? 0;
      const hasMain = !!main;
      try {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (!f.type.startsWith("image/") && !f.type.startsWith("application/")) continue;
          const isFirst = !hasMain && existing === 0 && i === 0;
          const sortOrder = existing + i;
          await aiOps.start("upload", `رفع: ${f.name}`, async () => {
            await uploadAndLinkAsset({
              file: f,
              productId,
              azCode,
              role: isFirst ? "main_image" : "gallery",
              sortOrder,
              folderPath: azCode,
            });
            qc.invalidateQueries({ queryKey: ["product-assets", productId] });
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [rows, main, productId, azCode, qc, aiOps],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    upload(Array.from(e.dataTransfer.files));
  };

  const onSetMain = async (linkId: string) => {
    try {
      await promoteToMain(productId, linkId);
      qc.invalidateQueries({ queryKey: ["product-assets", productId] });
      toast.success("تم تعيين الصورة الرئيسية");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onUnlink = async (linkId: string) => {
    try {
      await deleteAssetLink(linkId);
      qc.invalidateQueries({ queryKey: ["product-assets", productId] });
      setLightboxIdx(-1);
      toast.success("تم فك ربط الصورة");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onReorder = async (next: GridItem[]) => {
    qc.setQueryData<Row[]>(["product-assets", productId], (old) => {
      if (!old) return old;
      const byId = new Map(old.map((r) => [r.id, r]));
      return next.map((n, idx) => ({ ...(byId.get(n.linkId) as Row), sort_order: idx }));
    });
    try {
      await reorderAssets(next.map((n) => n.linkId));
    } catch (e: any) {
      toast.error("فشل حفظ الترتيب");
      qc.invalidateQueries({ queryKey: ["product-assets", productId] });
    }
  };

  const onAddUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    const role = rows?.length ? "gallery" : "main_image";
    const sortOrder = rows?.length ?? 0;
    setUrlInput("");
    await aiOps.start("url", `رابط: ${url.slice(0, 48)}${url.length > 48 ? "…" : ""}`, async () => {
      await linkAssetFromUrl({ url, productId, azCode, role, sortOrder });
      qc.invalidateQueries({ queryKey: ["product-assets", productId] });
    });
  };

  const onGenerateAI = async () => {
    await aiOps.start("ai-generate", "إنشاء 3 صور بالذكاء الاصطناعي", async () => {
      const res = await genFn({ data: { productIds: [productId] } });
      qc.invalidateQueries({ queryKey: ["product-assets", productId] });
      toast.success(`تم إنشاء ${res.totalGenerated} صورة`);
    });
  };

  const onEditAI = async () => {
    if (!editDialog || !editPrompt.trim()) return;
    const dlg = editDialog;
    const prompt = editPrompt;
    const replace = replaceOriginal;
    setEditDialog(null);
    setEditPrompt("");
    setReplaceOriginal(false);
    await aiOps.start("ai-edit", `تعديل AI: ${prompt.slice(0, 40)}${prompt.length > 40 ? "…" : ""}`, async () => {
      await editFn({
        data: {
          productId,
          sourceUrl: dlg.url,
          prompt,
          replaceLinkId: replace ? dlg.linkId : undefined,
        },
      });
      qc.invalidateQueries({ queryKey: ["product-assets", productId] });
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero: Main image + dropzone */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 surface-elevated border-0 overflow-hidden">
          {main?.asset?.file_url ? (
            <button
              type="button"
              onClick={() => setLightboxIdx(gridItems.findIndex((g) => g.isMain))}
              className="relative block w-full bg-muted group"
            >
              <img
                src={main.asset.file_url}
                alt={main.asset.file_name}
                className="w-full max-h-[480px] object-contain bg-gradient-to-br from-secondary/40 to-background"
              />
              <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground gap-1 shadow-lg">
                <Star className="size-3 fill-current" /> Main Image
              </Badge>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition grid place-items-center">
                <Maximize2 className="size-8 text-white opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="p-3 text-right border-t bg-card">
                <div className="text-sm font-semibold truncate">{main.asset.file_name}</div>
                <div className="text-xs text-muted-foreground num" dir="ltr">
                  {azCode}
                </div>
              </div>
            </button>
          ) : (
            <div className="aspect-[16/9] grid place-items-center text-muted-foreground gap-2 flex-col">
              <ImageOff className="size-10 opacity-50" />
              <div className="text-sm">لا توجد صورة رئيسية بعد</div>
            </div>
          )}
        </Card>

        <Card
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`p-6 surface-elevated border-2 border-dashed transition flex flex-col items-center justify-center text-center gap-3 ${dragOver ? "border-accent bg-accent/5" : "border-border"}`}
        >
          <div className="size-12 rounded-full bg-accent/15 grid place-items-center">
            <Upload className="size-5 text-accent" />
          </div>
          <div>
            <div className="font-semibold">اسحب وأفلت الصور</div>
            <div className="text-xs text-muted-foreground mt-1">أو اختر من الجهاز</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => upload(Array.from(e.target.files ?? []))}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            variant="outline"
            size="sm"
          >
            {busy ? "جاري الرفع..." : "اختر ملفات"}
          </Button>
          <div className="text-[10px] text-muted-foreground num" dir="ltr">
            {gridItems.length} ملف
          </div>
        </Card>
      </div>

      {/* AI tools + URL bar */}
      <Card className="p-4 surface-elevated border-0 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-accent" /> أدوات الذكاء الاصطناعي والروابط
          </div>
          <Button
            onClick={onGenerateAI}
            disabled={aiBusy}
            size="sm"
            className="gap-2"
          >
            <Sparkles className="size-4" />
            {aiBusy ? "جاري الإنشاء..." : "إنشاء صور AI (3)"}
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <LinkIcon className="size-4 text-muted-foreground shrink-0" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            dir="ltr"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && onAddUrl()}
          />
          <Button onClick={onAddUrl} disabled={busy || !urlInput.trim()} variant="outline" size="sm">
            إضافة من رابط
          </Button>
        </div>
        {gridItems.length > 0 && (
          <div className="text-xs text-muted-foreground">
            للتعديل بالذكاء الاصطناعي: اضغط على أي صورة في المعرض، ثم استخدم زر "تعديل بـ AI".
          </div>
        )}
      </Card>

      <AiOpsPanel
        ops={aiOps.ops}
        onRetry={aiOps.retry}
        onDismiss={aiOps.remove}
        onClearDone={aiOps.clearDone}
      />



      {/* Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Gallery</h3>
          <div className="text-xs text-muted-foreground num" dir="ltr">
            {gallery.length} items
          </div>
        </div>
        {!gridItems.length ? (
          <Card className="p-10 surface-elevated border-0 text-center text-muted-foreground">
            <ImageOff className="size-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">لا توجد أصول مرتبطة بهذا المنتج بعد</div>
          </Card>
        ) : (
          <SortableAssetGrid
            items={gridItems}
            onReorder={onReorder}
            onOpen={(i) => setLightboxIdx(i)}
            onEditAI={(it) => {
              setEditDialog({ url: it.url, linkId: it.linkId });
              setEditPrompt("");
              setReplaceOriginal(false);
            }}
          />
        )}
      </div>

      <AssetLightbox
        items={lightboxItems}
        index={lightboxIdx}
        onClose={() => setLightboxIdx(-1)}
        onSetMain={onSetMain}
        onUnlink={onUnlink}
      />

      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="size-4 text-accent" /> تعديل الصورة بالذكاء الاصطناعي
            </DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-3">
              <img
                src={editDialog.url}
                alt=""
                className="w-full max-h-64 object-contain bg-muted rounded-md"
              />
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="مثال: غيّر الخلفية إلى أبيض نقي، أضف إضاءة استوديو، أزل العلامة المائية..."
                rows={4}
                dir="rtl"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replaceOriginal}
                  onChange={(e) => setReplaceOriginal(e.target.checked)}
                />
                استبدال الصورة الأصلية (فك الربط بعد الإنشاء)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)} disabled={aiBusy}>
              إلغاء
            </Button>
            <Button onClick={onEditAI} disabled={aiBusy || editPrompt.trim().length < 3}>
              {aiBusy ? "جاري التنفيذ..." : "تنفيذ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
