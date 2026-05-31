/**
 * AI Quote Generator
 * Automatically generates quotes from API requests with AI-powered pricing
 */

import { generateObject, generateText } from 'ai';
import { z } from 'zod';

export interface QuoteLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  discount_percentage?: number;
  notes?: string;
}

export interface GeneratedQuote {
  quote_id: string;
  items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  validity_days: number;
  valid_until: Date;
  terms_conditions: string;
  notes: string;
  generated_at: Date;
  generation_model: string;
}

const QuoteSchema = z.object({
  line_items: z.array(
    z.object({
      product_name: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
      unit_price: z.number().positive(),
      total: z.number().positive(),
      discount_percentage: z.number().optional(),
    })
  ),
  subtotal: z.number(),
  tax_percentage: z.number(),
  tax_amount: z.number(),
  discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  total: z.number(),
  suggested_validity_days: z.number(),
  payment_terms: z.string(),
  delivery_note: z.string(),
  pricing_justification: z.string(),
});

export async function generateQuoteFromRequest(
  requestData: {
    products: Array<{
      product_id: string;
      name: string;
      quantity: number;
      unit: string;
      base_price?: number;
      category?: string;
    }>;
    customer?: {
      type: 'retail' | 'wholesale' | 'enterprise';
      volume?: number;
      loyalty?: 'new' | 'existing';
    };
    special_requirements?: string;
    deadline?: Date;
  },
  pricingRules?: {
    wholesale_discount?: number;
    enterprise_discount?: number;
    volume_thresholds?: Array<{ min: number; discount: number }>;
    tax_rate?: number;
  }
): Promise<GeneratedQuote> {
  try {
    const prompt = buildQuotePrompt(requestData, pricingRules);

    const result = await generateObject({
      model: 'google/gemini-2.5-flash',
      schema: QuoteSchema,
      prompt,
      system: `You are an expert pricing and quote generator.
        Generate professional, accurate quotes that:
        - Consider market rates and base prices
        - Apply appropriate discounts based on volume and customer type
        - Include realistic tax calculations
        - Provide clear payment terms
        - Include appropriate delivery notes
        - Justify pricing decisions
        - Ensure profitability while remaining competitive`,
    });

    const subtotal = result.object.subtotal;
    const taxAmount = result.object.tax_amount;
    const discountAmount = result.object.discount_amount || 0;
    const total = subtotal + taxAmount - discountAmount;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + result.object.suggested_validity_days);

    return {
      quote_id: generateQuoteId(),
      items: result.object.line_items.map((item) => ({
        product_id: requestData.products.find((p) => p.name === item.product_name)?.product_id || '',
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total: item.total,
        discount_percentage: item.discount_percentage,
      })),
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total,
      currency: 'SAR', // Default to SAR, can be parameterized
      validity_days: result.object.suggested_validity_days,
      valid_until: validUntil,
      terms_conditions: result.object.payment_terms,
      notes: result.object.delivery_note,
      generated_at: new Date(),
      generation_model: 'google/gemini-2.5-flash',
    };
  } catch (error) {
    console.error('[v0] Quote generation error:', error);
    throw new Error(`Quote generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function buildQuotePrompt(
  requestData: {
    products: Array<{
      product_id: string;
      name: string;
      quantity: number;
      unit: string;
      base_price?: number;
      category?: string;
    }>;
    customer?: {
      type: 'retail' | 'wholesale' | 'enterprise';
      volume?: number;
      loyalty?: 'new' | 'existing';
    };
    special_requirements?: string;
    deadline?: Date;
  },
  pricingRules?: {
    wholesale_discount?: number;
    enterprise_discount?: number;
    volume_thresholds?: Array<{ min: number; discount: number }>;
    tax_rate?: number;
  }
): string {
  const products = requestData.products
    .map(
      (p) =>
        `- ${p.name} (ID: ${p.product_id}): Quantity ${p.quantity} ${p.unit}, Base Price: ${p.base_price || 'TBD'} SAR`
    )
    .join('\n');

  const customerType = requestData.customer?.type || 'retail';
  const customerInfo =
    customerType === 'enterprise'
      ? `Enterprise customer, Volume: ${requestData.customer?.volume || 'Large'}, Loyalty: ${requestData.customer?.loyalty || 'new'}`
      : customerType === 'wholesale'
        ? 'Wholesale customer'
        : 'Retail customer';

  const taxRate = pricingRules?.tax_rate || 15; // Saudi VAT

  return `Generate a professional quote for the following request:

PRODUCTS REQUESTED:
${products}

CUSTOMER TYPE: ${customerInfo}

PRICING RULES:
- Tax Rate: ${taxRate}%
- Wholesale Discount: ${pricingRules?.wholesale_discount || 10}%
- Enterprise Discount: ${pricingRules?.enterprise_discount || 20}%
${
  pricingRules?.volume_thresholds
    ? `- Volume Thresholds: ${pricingRules.volume_thresholds.map((t) => `${t.min}+ units = ${t.discount}% discount`).join(', ')}`
    : ''
}

SPECIAL REQUIREMENTS: ${requestData.special_requirements || 'None'}

Generate:
1. Line items with unit prices and totals
2. Subtotal calculation
3. Tax calculation
4. Applicable discounts
5. Final total amount
6. Recommended validity period
7. Payment terms (e.g., "Net 30")
8. Delivery note
9. Clear justification for pricing

Ensure the quote is professional, competitive, and includes appropriate margins.`;
}

export function generateQuoteId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `QT-${timestamp}-${random}`;
}

export async function calculateBulkDiscount(
  totalQuantity: number,
  basePrice: number,
  pricingTiers?: Array<{ min: number; discount: number }>
): Promise<{ discount_percentage: number; discounted_price: number }> {
  const defaultTiers = [
    { min: 0, discount: 0 },
    { min: 10, discount: 5 },
    { min: 50, discount: 10 },
    { min: 100, discount: 15 },
    { min: 500, discount: 20 },
  ];

  const tiers = pricingTiers || defaultTiers;
  const applicableTier = tiers.filter((t) => totalQuantity >= t.min).pop() || tiers[0];

  const discount_percentage = applicableTier.discount;
  const discounted_price = basePrice * (1 - discount_percentage / 100);

  return { discount_percentage, discounted_price };
}

export async function validateQuoteData(quoteData: {
  items: QuoteLineItem[];
  customer_type: string;
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!quoteData.items || quoteData.items.length === 0) {
    errors.push('No items in quote');
  }

  quoteData.items.forEach((item, index) => {
    if (!item.product_name) {
      errors.push(`Item ${index}: Missing product name`);
    }
    if (item.quantity <= 0) {
      errors.push(`Item ${index}: Invalid quantity`);
    }
    if (item.unit_price < 0) {
      errors.push(`Item ${index}: Invalid unit price`);
    }
  });

  if (!['retail', 'wholesale', 'enterprise'].includes(quoteData.customer_type)) {
    errors.push('Invalid customer type');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function formatQuoteForPDF(quote: GeneratedQuote): Promise<string> {
  return `
QUOTE ID: ${quote.quote_id}
Generated: ${quote.generated_at.toLocaleDateString()}
Valid Until: ${quote.valid_until.toLocaleDateString()}

========================================
LINE ITEMS
========================================
Product | Qty | Unit | Price | Total
${quote.items.map((item) => `${item.product_name} | ${item.quantity} | ${item.unit} | ${item.unit_price} | ${item.total}`).join('\n')}

========================================
SUMMARY
========================================
Subtotal:    ${quote.subtotal.toFixed(2)} ${quote.currency}
Tax:         ${quote.tax.toFixed(2)} ${quote.currency}
Discount:    -${quote.discount.toFixed(2)} ${quote.currency}
────────────────────────────────────────
TOTAL:       ${quote.total.toFixed(2)} ${quote.currency}

========================================
TERMS & CONDITIONS
========================================
Payment Terms: ${quote.terms_conditions}
Notes: ${quote.notes}

Validity: ${quote.validity_days} days
This quote is valid until ${quote.valid_until.toLocaleDateString()}.
  `;
}
