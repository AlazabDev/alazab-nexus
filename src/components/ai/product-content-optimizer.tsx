"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OptimizationState {
  loading: boolean;
  optimized: boolean;
  error?: string;
  result?: {
    optimized_name_en: string;
    optimized_name_ar: string;
    optimized_description_en: string;
    optimized_description_ar: string;
    contentQualityScore: number;
  };
}

export function ProductContentOptimizer() {
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [optimizationLevel, setOptimizationLevel] = useState<"basic" | "standard" | "premium">(
    "standard",
  );
  const [state, setState] = useState<OptimizationState>({ loading: false, optimized: false });

  const handleOptimize = async () => {
    if (!productName.trim()) {
      setState({ ...state, error: "Product name is required" });
      return;
    }

    setState({ loading: true, optimized: false, error: undefined });

    try {
      const response = await fetch("/api/private/v1/ai/optimize-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDesc,
          optimizationLevel,
        }),
      });

      if (!response.ok) throw new Error("Optimization failed");

      const data = await response.json();
      setState({
        loading: false,
        optimized: true,
        result: data.optimization,
      });
    } catch (error) {
      setState({
        loading: false,
        optimized: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Optimize Product Content</CardTitle>
          <CardDescription>Enhance your product information with AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <input
                id="product-name"
                placeholder="e.g., Wireless Bluetooth Headphones"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-desc">Product Description</Label>
              <Textarea
                id="product-desc"
                placeholder="Current product description..."
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="optimization-level">Optimization Level</Label>
              <Select
                value={optimizationLevel}
                onValueChange={(v) => setOptimizationLevel(v as any)}
              >
                <SelectTrigger id="optimization-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic - Name & Description</SelectItem>
                  <SelectItem value="standard">Standard - Metadata & Keywords</SelectItem>
                  <SelectItem value="premium">Premium - Full Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Alert */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          <Button onClick={handleOptimize} disabled={state.loading} size="lg" className="w-full">
            {state.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              "Optimize Content"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {state.optimized && state.result && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Optimization Complete
            </CardTitle>
            <div className="text-2xl font-bold">
              {Math.round(state.result.contentQualityScore)}/100
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* English Content */}
            <div className="space-y-2">
              <h3 className="font-semibold">English Content</h3>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Optimized Name</p>
                  <p className="text-base">{state.result.optimized_name_en}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Optimized Description</p>
                  <p className="text-sm leading-relaxed">{state.result.optimized_description_en}</p>
                </div>
              </div>
            </div>

            {/* Arabic Content */}
            <div className="space-y-2" dir="rtl">
              <h3 className="font-semibold">المحتوى العربي</h3>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">الاسم المحسّن</p>
                  <p className="text-base">{state.result.optimized_name_ar}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">الوصف المحسّن</p>
                  <p className="text-sm leading-relaxed">{state.result.optimized_description_ar}</p>
                </div>
              </div>
            </div>

            <Button className="w-full" variant="outline">
              Apply Optimizations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
