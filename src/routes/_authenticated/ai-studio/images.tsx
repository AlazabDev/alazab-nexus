import { createFileRoute } from "@tanstack/react-router";
import { ImageFetcher } from "@/components/ai/image-fetcher";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/ai-studio/images")({
  component: ImagesPage,
});

function ImagesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Image Fetcher & Matcher"
        description="Find professional images and match them to your products"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Fetcher */}
        <div className="lg:col-span-2">
          <ImageFetcher />
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Image Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="space-y-2 text-muted-foreground">
                <li>• Unsplash - Professional free images</li>
                <li>• Pexels - Quality image library</li>
                <li>• Custom API - Supplier images</li>
                <li>• User uploads - Your own images</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Image Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Product Photo</p>
                <p className="text-muted-foreground">Direct product shots</p>
              </div>
              <div>
                <p className="font-medium">Lifestyle</p>
                <p className="text-muted-foreground">Product in use context</p>
              </div>
              <div>
                <p className="font-medium">Technical</p>
                <p className="text-muted-foreground">Close-ups and details</p>
              </div>
              <div>
                <p className="font-medium">3D Render</p>
                <p className="text-muted-foreground">Rendered visualizations</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confidence Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>The system analyzes images to determine how well they match your product:</p>
              <ul className="space-y-1 mt-2">
                <li>• 90-100%: Perfect match</li>
                <li>• 75-89%: Good match</li>
                <li>• 60-74%: Acceptable</li>
                <li>• Below 60%: May not be suitable</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
