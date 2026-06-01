import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { ProductForm } from "@/components/product-form";

export const Route = createFileRoute("/_authenticated/products/create")({
  head: () => ({ meta: [{ title: "إنشاء بند جديد — Alazab PAOP" }] }),
  component: CreateProduct,
});

function CreateProduct() {
  const navigate = useNavigate();

  const handleSuccess = (id: string) => {
    navigate({ to: "/products/$id", params: { id } });
  };

  const handleCancel = () => {
    navigate({ to: "/products" });
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <button
        onClick={handleCancel}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
      >
        <ArrowRight className="size-3" /> العودة للقائمة
      </button>

      <Card className="p-8 surface-elevated border-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">إنشاء بند جديد</h1>
          <p className="text-sm text-muted-foreground mt-1">أنشئ بند جديد مع المعلومات الأساسية</p>
        </div>

        <ProductForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Card>
    </div>
  );
}
