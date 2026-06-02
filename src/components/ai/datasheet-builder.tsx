'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Eye, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface DatasheetField {
  id: string;
  section: string;
  label: string;
  value: string;
  required: boolean;
}

interface DatasheetBuilderState {
  loading: boolean;
  generated: boolean;
  error?: string;
  datasheetId?: string;
  format: 'json' | 'pdf' | 'html';
  language: 'en' | 'ar' | 'multilingual';
}

export function DatasheetBuilder() {
  const [productId, setProductId] = useState('');
  const [state, setState] = useState<DatasheetBuilderState>({
    loading: false,
    generated: false,
    format: 'pdf',
    language: 'en',
  });

  const sections = [
    { label: 'Technical Specifications', icon: '⚙️' },
    { label: 'Dimensions & Weight', icon: '📏' },
    { label: 'Materials', icon: '🔨' },
    { label: 'Certifications', icon: '✓' },
    { label: 'Usage Guidelines', icon: '📖' },
    { label: 'Safety Information', icon: '⚠️' },
  ];

  const handleGenerate = async () => {
    if (!productId.trim()) {
      setState({ ...state, error: 'Product ID is required' });
      return;
    }

    setState({ ...state, loading: true, error: undefined });

    try {
      const response = await fetch('/api/private/v1/ai/generate-datasheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          format: state.format,
          language: state.language,
        }),
      });

      if (!response.ok) throw new Error('Datasheet generation failed');

      const data = await response.json();
      setState({
        ...state,
        loading: false,
        generated: true,
        datasheetId: data.datasheet?.id,
      });
    } catch (error) {
      setState({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Datasheet</CardTitle>
          <CardDescription>Create professional technical datasheets automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product ID</label>
            <input
              placeholder="Enter product ID or select from list..."
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>

          {/* Format & Language Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Output Format</label>
              <div className="flex gap-2">
                {(['json', 'pdf', 'html'] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    variant={state.format === fmt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setState({ ...state, format: fmt })}
                    className="flex-1"
                  >
                    {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <div className="flex gap-2">
                {(['en', 'ar'] as const).map((lang) => (
                  <Button
                    key={lang}
                    variant={state.language === lang ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setState({ ...state, language: lang })}
                    className="flex-1"
                  >
                    {lang === 'en' ? 'English' : 'العربية'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Sections Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Datasheet Sections</label>
            <div className="grid grid-cols-2 gap-2">
              {sections.map((section) => (
                <div key={section.label} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span>{section.icon}</span>
                  <span className="text-sm">{section.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={state.loading} size="lg" className="w-full">
            {state.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Datasheet'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Success State */}
      {state.generated && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Datasheet Generated</CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Success
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your datasheet has been generated and is ready for download or further editing.
            </p>

            <div className="flex gap-2">
              <Button className="flex-1" size="lg">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button variant="outline" className="flex-1" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">DATASHEET ID</p>
              <p className="font-mono text-sm">{state.datasheetId}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
