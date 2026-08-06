"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Download, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { generateImageCandidates } from "@/lib/image-candidates.functions";

type ImageType = "product_photo" | "lifestyle" | "technical" | "render_3d";

const TYPE_LABELS: Record<ImageType, string> = {
  product_photo: "صورة منتج",
  lifestyle: "سياق استخدام",
  technical: "تفاصيل فنية",
  render_3d: "رندر ثلاثي الأبعاد",
};

export function ImageFetcher() {
  const [productName, setProductName] = useState("");
  const [context, setContext] = useState("");
  const [types, setTypes] = useState<ImageType[]>(["product_photo", "lifestyle"]);
  const [selected, setSelected] = useState<string[]>([]);

  const generateFn = useServerFn(generateImageCandidates);

  const generate = useMutation({
    mutationFn: async () =>
      generateFn({
        data: { productName: productName.trim(), context: context.trim() || undefined, types },
      }),
    onSuccess: () => setSelected([]),
  });

  const toggleType = (t: ImageType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const toggleImage = (url: string) =>
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

  const downloadSelected = () => {
    selected.forEach((url, i) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${productName.replace(/\s+/g, "-") || "product"}-${i + 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const images = generate.data?.images ?? [];
  const canRun = productName.trim().length > 1 && types.length > 0 && !generate.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>توليد صور احترافية للمنتج</CardTitle>
          <CardDescription>
            أنشئ صوراً واقعية للمنتج بزوايا وأنماط مختلفة، ثم حمّل ما يناسبك.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم المنتج</label>
            <Input
              placeholder="مثال: ماكينة لحام ميج 250 أمبير"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">سياق إضافي (اختياري)</label>
            <Textarea
              placeholder="الخامات، الاستخدام، البيئة الصناعية..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">أنماط الصور</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_LABELS) as ImageType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={types.includes(t) ? "default" : "outline"}
                  size="sm"
                  className="justify-start"
                  onClick={() => toggleType(t)}
                >
                  {types.includes(t) && <Check className="ml-2 h-4 w-4" />}
                  {TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>

          {generate.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {(generate.error as Error)?.message ?? "تعذر توليد الصور"}
              </AlertDescription>
            </Alert>
          )}

          {!!generate.data?.errors?.length && (
            <Alert>
              <AlertDescription className="text-xs">
                {generate.data.errors.join(" · ")}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => generate.mutate()}
            disabled={!canRun}
            size="lg"
            className="w-full gap-2"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التوليد…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> توليد الصور
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{images.length} صورة</CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled={!selected.length}
                onClick={downloadSelected}
              >
                <Download className="ml-2 h-4 w-4" /> تحميل المحدد ({selected.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image, idx) => (
                <div
                  key={idx}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    selected.includes(image.url)
                      ? "border-accent"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <div
                    className="aspect-square bg-muted relative overflow-hidden cursor-pointer"
                    onClick={() => toggleImage(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={`${productName} — ${TYPE_LABELS[image.type as ImageType] ?? image.type}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    {selected.includes(image.url) && (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                        <div className="bg-accent text-accent-foreground p-2 rounded-full">
                          <Check className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[image.type as ImageType] ?? image.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
