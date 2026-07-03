import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { CORS, json, requireApiKey, logCall, corsHeaders} from '@/lib/api-auth';
import { generateQuoteFromRequest, generateQuoteId } from '@/lib/ai/quote-generator';
import { z } from 'zod';
import crypto from 'crypto';

const QuoteRequestSchema = z.object({
  products: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().positive(),
      unit: z.string().default('pcs'),
    })
  ),
  customer: z
    .object({
      type: z.enum(['retail', 'wholesale', 'enterprise']).default('retail'),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  special_requirements: z.string().optional(),
  deadline: z.string().datetime().optional(),
});

export const Route = createFileRoute('/api/public/v1/ai/quotes')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const started = Date.now();

        // Check API key
        const authResult = await requireApiKey(request, '/api/public/v1/ai/quotes');
        if (authResult.error) {
          return authResult.error;
        }
        const consumer = authResult.consumer;

        try {
          const body = await request.json();
          const validated = QuoteRequestSchema.parse(body);

          // Fetch product data for pricing
          const productIds = validated.products.map((p) => p.product_id);
          const { data: products, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, name_en, name_ar, category, price')
            .in('id', productIds);

          if (productsError || !products || products.length === 0) {
            return json({ error: 'Products not found' }, 404);
          }

          // Build request data for AI
          const requestData = {
            products: validated.products.map((p) => {
              const product = products.find((pr) => pr.id === p.product_id);
              return {
                product_id: p.product_id,
                name: product?.name_en || product?.name_ar || 'Unknown',
                quantity: p.quantity,
                unit: p.unit,
                base_price: product?.price || 0,
                category: product?.category,
              };
            }),
            customer: validated.customer,
            special_requirements: validated.special_requirements,
            deadline: validated.deadline ? new Date(validated.deadline) : undefined,
          };

          // Fetch pricing rules
          const { data: pricingRules } = await supabaseAdmin
            .from('pricing_rules')
            .select('*')
            .eq('status', 'active')
            .maybeSingle();

          // Generate quote using AI
          const generatedQuote = await generateQuoteFromRequest(requestData as any, (pricingRules || undefined) as any);

          // Generate secure token for external access
          const quoteToken = crypto.randomBytes(32).toString('hex');

          // Store quote in database
          const { data: savedQuote, error: insertError } = await supabaseAdmin
            .from('api_quotes')
            .insert({
              product_id: validated.products[0]?.product_id,
              quote_request_data: {
                products: validated.products,
                customer: validated.customer,
                special_requirements: validated.special_requirements,
              } as never,
              generated_quote: {
                items: generatedQuote.items,
                subtotal: generatedQuote.subtotal,
                tax: generatedQuote.tax,
                discount: generatedQuote.discount,
                total: generatedQuote.total,
                currency: generatedQuote.currency,
                validity_days: generatedQuote.validity_days,
                terms_conditions: generatedQuote.terms_conditions,
                notes: generatedQuote.notes,
              } as never,
              status: 'approved',
              generated_by: 'google/gemini-2.5-flash',
              generated_at: new Date().toISOString(),
              api_endpoint: '/api/public/v1/ai/quotes',
              quote_token: quoteToken,
              consumer_id: consumer?.id ?? null,
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to store quote: ${insertError.message}`);
          }

          // Log the API call
          await logCall({
            consumer,
            request,
            endpoint: '/api/public/v1/ai/quotes',
            status: 200,
            startedAt: started,
            payload: validated,
          });

          return json(
            {
              success: true,
              quote: {
                quote_id: generatedQuote.quote_id,
                quote_token: quoteToken,
                items: generatedQuote.items,
                subtotal: generatedQuote.subtotal,
                tax: generatedQuote.tax,
                discount: generatedQuote.discount,
                total: generatedQuote.total,
                currency: generatedQuote.currency,
                valid_until: generatedQuote.valid_until,
                terms: generatedQuote.terms_conditions,
                notes: generatedQuote.notes,
              },
            },
            200
          );
        } catch (error) {
          console.error('[v0] Quote generation error:', error);

          await logCall({
            consumer: null,
            request,
            endpoint: '/api/public/v1/ai/quotes',
            status: 500,
            startedAt: started,
            error: error instanceof Error ? error.message : String(error),
          });

          return json(
            {
              error: error instanceof Error ? error.message : 'Quote generation failed',
            },
            500
          );
        }
      },
    },
  },
});
