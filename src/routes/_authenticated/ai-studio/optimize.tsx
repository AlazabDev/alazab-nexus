import { createFileRoute } from '@tanstack/react-router';
import { ProductContentOptimizer } from '@/components/ai/product-content-optimizer';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/ai-studio/optimize')({
  component: OptimizePage,
  preload: 'intent',
});

function OptimizePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Content Optimization"
        description="Enhance product names, descriptions, and metadata with AI"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Optimizer */}
        <div className="lg:col-span-2">
          <ProductContentOptimizer />
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">1. Enter Content</p>
                <p className="text-muted-foreground">Provide your current product name and description</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">2. Choose Level</p>
                <p className="text-muted-foreground">Select optimization depth (Basic, Standard, Premium)</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">3. Get Results</p>
                <p className="text-muted-foreground">AI generates enhanced versions in English & Arabic</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">4. Review & Apply</p>
                <p className="text-muted-foreground">Preview changes before applying to your products</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Optimization Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-blue-600">Basic</p>
                <p className="text-muted-foreground">Focus on names and descriptions only</p>
              </div>
              <div>
                <p className="font-medium text-purple-600">Standard</p>
                <p className="text-muted-foreground">Includes metadata and SEO keywords</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">Premium</p>
                <p className="text-muted-foreground">Full optimization including marketing copy</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="space-y-2 text-muted-foreground">
                <li>• Provide detailed current descriptions for better results</li>
                <li>• Use Premium for complex products</li>
                <li>• Review Arabic translation quality</li>
                <li>• Test with a few products first</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
