"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface QuoteState {
  loading: boolean;
  generated: boolean;
  error?: string;
  quoteId?: string;
  items: QuoteItem[];
  total?: number;
  validUntil?: string;
}

export function QuoteBuilder() {
  const [customerType, setCustomerType] = useState<"retail" | "wholesale" | "enterprise">("retail");
  const [state, setState] = useState<QuoteState>({
    loading: false,
    generated: false,
    items: [{ productId: "", productName: "", quantity: 1, unit: "pcs" }],
  });

  const handleAddItem = () => {
    setState({
      ...state,
      items: [...state.items, { productId: "", productName: "", quantity: 1, unit: "pcs" }],
    });
  };

  const handleRemoveItem = (idx: number) => {
    setState({
      ...state,
      items: state.items.filter((_, i) => i !== idx),
    });
  };

  const handleItemChange = (idx: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...state.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setState({ ...state, items: newItems });
  };

  const handleGenerateQuote = async () => {
    if (state.items.length === 0 || state.items.some((item) => !item.productId)) {
      setState({ ...state, error: "Please add at least one product" });
      return;
    }

    setState({ ...state, loading: true, error: undefined });

    try {
      const response = await fetch("/api/public/v1/ai/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: state.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit: item.unit,
          })),
          customer: { type: customerType },
        }),
      });

      if (!response.ok) throw new Error("Quote generation failed");

      const data = await response.json();
      setState({
        ...state,
        loading: false,
        generated: true,
        quoteId: data.quote?.quote_id,
        total: data.quote?.total,
        validUntil: data.quote?.valid_until,
      });
    } catch (error) {
      setState({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to generate quote",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Quote</CardTitle>
          <CardDescription>Create professional quotes with AI-powered pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer Type</label>
            <div className="flex gap-2">
              {(["retail", "wholesale", "enterprise"] as const).map((type) => (
                <Button
                  key={type}
                  variant={customerType === type ? "default" : "outline"}
                  onClick={() => setCustomerType(type)}
                  className="flex-1 capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Products</label>
              <Button onClick={handleAddItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {state.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1 space-y-1">
                    <input
                      placeholder="Product ID or Name"
                      value={item.productName}
                      onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                      className="w-full text-sm px-2 py-1 border rounded bg-background"
                    />
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value))}
                    className="w-16 text-sm px-2 py-1 border rounded bg-background"
                    placeholder="Qty"
                  />

                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                    className="text-sm px-2 py-1 border rounded bg-background"
                  >
                    <option>pcs</option>
                    <option>kg</option>
                    <option>m</option>
                    <option>box</option>
                  </select>

                  <Button
                    onClick={() => handleRemoveItem(idx)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          <Button
            onClick={handleGenerateQuote}
            disabled={state.loading}
            size="lg"
            className="w-full"
          >
            {state.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quote...
              </>
            ) : (
              "Generate Quote"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Success State */}
      {state.generated && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Quote Generated</CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Success
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quote Summary */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quote ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {state.quoteId}
                  </code>
                  <Button
                    onClick={() => navigator.clipboard.writeText(state.quoteId || "")}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-semibold">Total Amount</span>
                <span className="text-xl font-bold">{state.total?.toFixed(2)} SAR</span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Valid Until</span>
                <span>
                  {state.validUntil ? new Date(state.validUntil).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline">
                Preview
              </Button>
              <Button className="flex-1">Send Quote</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
