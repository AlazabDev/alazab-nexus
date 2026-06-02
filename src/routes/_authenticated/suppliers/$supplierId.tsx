import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/suppliers/$supplierId')({
  component: SupplierDetailPage,
  preload: 'intent',
});

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Suppliers
        </Link>
      </div>

      <PageHeader
        title={`Supplier ${supplierId?.slice(0, 8)}`}
        description="View and manage supplier details"
      />

      <main className="flex-1">
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Supplier details loading...</p>
            <p className="text-xs mt-2">Supplier ID: {supplierId}</p>
          </div>
        </Card>
      </main>
    </div>
  );
}
