import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { CORS, json, requireApiKey, logCall } from '@/lib/api-auth';
import { optimizeProductContent, scoreContentQuality } from '@/lib/ai/product-content-optimizer';
import { z } from 'zod';

const OptimizeRequestSchema = z.object({
  productId: z.string().uuid(),
  optimizationLevel: z.enum(['basic', 'standard', 'premium']).default('standard'),
  focusAreas: z.array(z.string()).optional(),
  applyAutomatically: z.boolean().default(false),
});

export const Route = createFileRoute('/api/private/v1/ai/optimize-product')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const started = Date.now();

        // Verify authentication
        const auth = await requireAuth(request);
        if (!auth.success) {
          return json({ error: 'Unauthorized' }, 401);
        }

        try {
          const body = await request.json();
          const validated = OptimizeRequestSchema.parse(body);

          // Fetch product data
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('id, name_en, name_ar, short_description_en, short_description_ar, category, specifications')
            .eq('id', validated.productId)
            .single();

          if (productError || !product) {
            return json({ error: 'Product not found' }, 404);
          }

          // Run optimization
          const optimizationResult = await optimizeProductContent(
            {
              id: product.id,
              name: product.name_en || product.name_ar,
              description: product.short_description_en || product.short_description_ar,
              category: product.category,
              specifications: product.specifications,
            },
            validated.optimizationLevel
          );

          // Store optimization result
          const { error: insertError } = await supabaseAdmin
            .from('ai_optimization_logs')
            .insert({
              user_id: auth.userId,
              action: 'optimize_content',
              entity_type: 'product',
              entity_id: validated.productId,
              details: {
                optimized_name_en: optimizationResult.optimized_name_en,
                optimized_name_ar: optimizationResult.optimized_name_ar,
                score: optimizationResult.contentQualityScore,
              },
              status: 'success',
              duration_ms: Date.now() - started,
            });

          // Update product if automatic application is enabled
          if (validated.applyAutomatically) {
            await supabaseAdmin
              .from('products')
              .update({
                name_en: optimizationResult.optimized_name_en,
                name_ar: optimizationResult.optimized_name_ar,
                short_description_en: optimizationResult.optimized_description_en,
                short_description_ar: optimizationResult.optimized_description_ar,
                content_optimization_score: optimizationResult.contentQualityScore,
                ai_optimization_applied_at: new Date().toISOString(),
              })
              .eq('id', validated.productId);
          }

          return json(
            {
              success: true,
              optimization: optimizationResult,
              applied: validated.applyAutomatically,
            },
            200,
            { headers: CORS }
          );
        } catch (error) {
          console.error('[v0] API error:', error);

          await supabaseAdmin.from('ai_audit_logs').insert({
            action: 'optimize_content',
            entity_type: 'product',
            status: 'error',
            error_message: error instanceof Error ? error.message : String(error),
            duration_ms: Date.now() - started,
          });

          return json(
            {
              error: error instanceof Error ? error.message : 'Optimization failed',
            },
            500,
            { headers: CORS }
          );
        }
      },
    },
  },
});
