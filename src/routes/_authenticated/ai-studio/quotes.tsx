import { createFileRoute } from '@tanstack/react-router';
import { QuoteBuilder } from '@/components/ai/quote-builder';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/ai-studio/quotes')({
  component: QuotesPage,
  preload: 'intent',
});

function QuotesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Quote Generator"
        description="Create professional quotes with AI-powered intelligent pricing"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Builder */}
        <div className="lg:col-span-2">
          <QuoteBuilder />
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">1. Select Products</p>
                <p className="text-muted-foreground">Add items with quantities</p>
              </div>
              <div>
                <p className="font-medium">2. Choose Customer Type</p>
                <p className="text-muted-foreground">Retail, Wholesale, or Enterprise</p>
              </div>
              <div>
                <p className="font-medium">3. AI Generates Price</p>
                <p className="text-muted-foreground">Applies discounts automatically</p>
              </div>
              <div>
                <p className="font-medium">4. Send Quote</p>
                <p className="text-muted-foreground">Share with customer directly</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>✓ Automatic discount calculation</li>
                <li>✓ Volume-based pricing</li>
                <li>✓ Customer tier adjustments</li>
                <li>✓ Tax included</li>
                <li>✓ Currency support</li>
                <li>✓ Audit trail</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Retail</p>
                <p className="text-muted-foreground">Standard pricing</p>
              </div>
              <div>
                <p className="font-medium">Wholesale</p>
                <p className="text-muted-foreground">10-15% discount</p>
              </div>
              <div>
                <p className="font-medium">Enterprise</p>
                <p className="text-muted-foreground">20-30% discount</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
