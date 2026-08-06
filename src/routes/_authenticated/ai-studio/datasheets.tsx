import { createFileRoute } from "@tanstack/react-router";
import { DatasheetBuilder } from "@/components/ai/datasheet-builder";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/ai-studio/datasheets")({
  component: DatasheetPage,
});

function DatasheetPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Datasheet Generator"
        description="Create professional technical datasheets with AI"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Builder */}
        <div className="lg:col-span-2">
          <DatasheetBuilder />
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datasheet Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">PDF</p>
                <p className="text-muted-foreground">Professional printable format</p>
              </div>
              <div>
                <p className="font-medium">HTML</p>
                <p className="text-muted-foreground">Web-ready interactive version</p>
              </div>
              <div>
                <p className="font-medium">JSON</p>
                <p className="text-muted-foreground">Structured data format</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Technical Specifications</li>
                <li>✓ Dimensions & Weight</li>
                <li>✓ Materials & Composition</li>
                <li>✓ Certifications & Standards</li>
                <li>✓ Performance Data</li>
                <li>✓ Usage Guidelines</li>
                <li>✓ Safety Information</li>
                <li>✓ Warranty Terms</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Generate once per product</li>
                <li>• Available in multiple languages</li>
                <li>• Editable after generation</li>
                <li>• Auto-export to storage</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
