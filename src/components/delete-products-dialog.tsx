import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteProducts } from "@/lib/products-admin.functions";

type Props = {
  productIds: string[];
  label?: string;
  size?: "sm" | "default";
  onDeleted?: (count: number) => void;
};

export function DeleteProductsButton({ productIds, label, size = "sm", onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const del = useServerFn(deleteProducts);

  const count = productIds.length;

  const run = async () => {
    setBusy(true);
    try {
      const res = await del({ data: { productIds } });
      toast.success(`تم حذف ${res.deleted} بند نهائياً`);
      setOpen(false);
      setConfirmText("");
      onDeleted?.(res.deleted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        variant="destructive"
        className="gap-1.5"
        disabled={count === 0}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" />
        {label ?? `حذف (${count})`}
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نهائي للبنود</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف <span className="num font-semibold">{count}</span> بند نهائياً من قاعدة
              البيانات، مع الأسعار وسجل الأسعار وروابط الأصول وبطاقات المواصفات المرتبطة. لا يمكن
              التراجع عن هذه العملية. اكتب <span className="font-bold">حذف</span> للتأكيد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="حذف"
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || confirmText.trim() !== "حذف"}
              onClick={(e) => {
                e.preventDefault();
                run();
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
