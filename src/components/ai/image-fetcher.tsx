'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Download, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FetchedImage {
  url: string;
  source: string;
  confidence: number;
  type: string;
}

interface ImageFetcherState {
  loading: boolean;
  images: FetchedImage[];
  error?: string;
  selectedImages: string[];
}

export function ImageFetcher() {
  const [productName, setProductName] = useState('');
  const [imageCount, setImageCount] = useState(5);
  const [state, setState] = useState<ImageFetcherState>({
    loading: false,
    images: [],
    selectedImages: [],
  });

  const handleFetch = async () => {
    if (!productName.trim()) {
      setState({ ...state, error: 'Product name is required' });
      return;
    }

    setState({ ...state, loading: true, error: undefined, images: [], selectedImages: [] });

    try {
      // Mock data for demo - in production this would call the API
      const mockImages: FetchedImage[] = [
        {
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          source: 'unsplash',
          confidence: 95,
          type: 'product_photo',
        },
        {
          url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
          source: 'unsplash',
          confidence: 88,
          type: 'lifestyle',
        },
        {
          url: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=500',
          source: 'pexels',
          confidence: 82,
          type: 'product_photo',
        },
      ];

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setState({
        ...state,
        loading: false,
        images: mockImages.slice(0, imageCount),
        error: undefined,
      });
    } catch (error) {
      setState({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch images',
      });
    }
  };

  const toggleImage = (url: string) => {
    setState({
      ...state,
      selectedImages: state.selectedImages.includes(url)
        ? state.selectedImages.filter((u) => u !== url)
        : [...state.selectedImages, url],
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle>Fetch Professional Images</CardTitle>
          <CardDescription>Find and match professional images for your products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name</label>
            <input
              placeholder="e.g., Wireless Headphones, LED Monitor..."
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>

          {/* Image Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of Images</label>
            <input
              type="number"
              min="1"
              max="20"
              value={imageCount}
              onChange={(e) => setImageCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>

          {/* Image Types */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Preferred Image Types</label>
            <div className="grid grid-cols-2 gap-2">
              {['Product Photo', 'Lifestyle', 'Technical', '3D Render'].map((type) => (
                <Button key={type} variant="outline" size="sm" className="justify-start">
                  <input type="checkbox" className="mr-2" defaultChecked={type === 'Product Photo'} />
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Search Button */}
          <Button onClick={handleFetch} disabled={state.loading} size="lg" className="w-full">
            {state.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Images
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Grid */}
      {state.images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Found {state.images.length} Images</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Selected ({state.selectedImages.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.images.map((image, idx) => (
                <div
                  key={idx}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    state.selectedImages.includes(image.url)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {/* Image Container */}
                  <div
                    className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden cursor-pointer"
                    onClick={() => toggleImage(image.url)}
                  >
                    <img
                      src={image.url}
                      alt="Product"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />

                    {/* Selected Overlay */}
                    {state.selectedImages.includes(image.url) && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-blue-500 text-white p-2 rounded-full">
                          <Check className="h-5 w-5" />
                        </div>
                      </div>
                    )}

                    {/* Confidence Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={image.confidence >= 85 ? 'default' : 'secondary'}
                        className="bg-black/50 text-white border-0"
                      >
                        {image.confidence}%
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {image.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{image.source}</span>
                    </div>
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
