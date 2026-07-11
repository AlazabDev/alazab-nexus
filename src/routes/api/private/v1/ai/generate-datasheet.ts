import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { json, requireApiKey, corsHeaders } from '@/lib/api-auth';
import { generateProductDatasheet, generatePDFDatasheet } from '@/lib/ai/datasheet-generator';
import { z } from 'zod';

const DatasheetRequestSchema = z.object({
  productId: z.string().uuid(),
  format: z.enum(['json', 'pdf', 'html']).default('json'),
  language: z.enum(['en', 'ar', 'multilingual']).default('en'),
  template: z.string().optional(),
});

export const Route = createFileRoute('/api/private/v1/ai/generate-datasheet')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const started = Date.now();

        const authResult = await requireApiKey(request, '/api/private/v1/ai/generate-datasheet');
        if ('error' in authResult) return authResult.error;
        const auth = { success: true, userId: authResult.consumer?.id ?? null };

        try {
          const body = await request.json();
          const validated = DatasheetRequestSchema.parse(body);

          const { data: existingDatasheet } = await supabaseAdmin
            .from('product_datasheets')
            .select('id')
            .eq('product_id', validated.productId)
            .eq('status', 'generated')
            .maybeSingle();

          if (existingDatasheet) {
            return json(
              {
                success: true,
                message: 'Datasheet already generated',
                datasheet_id: existingDatasheet.id,
              },
              200,
              { request },
            );
          }

          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select(
              'id, name_en, name_ar, short_description_en, short_description_ar, category, specifications, materials',
            )
            .eq('id', validated.productId)
            .single();

          if (productError || !product) {
            return json({ error: 'Product not found' }, 404, { request });
          }

          const datasheetContent = await generateProductDatasheet({
            id: product.id,
            name: product.name_en || product.name_ar || '',
            description: product.short_description_en || product.short_description_ar || '',
            category: product.category ?? '',
            specifications: (product.specifications as Record<string, any> | null) ?? undefined,
            materials: (product.materials as unknown as string[] | null) ?? undefined,
          });

          const { data: savedDatasheet, error: insertError } = await supabaseAdmin
            .from('product_datasheets')
            .insert({
              product_id: validated.productId,
              content: datasheetContent as never,
              status: 'generated',
              language: validated.language,
              format: validated.format,
              generator_model: 'google/gemini-2.5-flash',
              generated_at: new Date().toISOString(),
              created_by: auth.userId,
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to store datasheet: ${insertError.message}`);
          }

          let pdfUrl: string | null = null;
          if (validated.format === 'pdf' || validated.format === 'html') {
            const fileFormat: 'pdf' | 'html' = validated.format === 'pdf' ? 'html' : 'html';
            const fileContent = await generatePDFDatasheet(datasheetContent, fileFormat);
            const filename = `datasheets/${validated.productId}/${savedDatasheet!.id}.${fileFormat}`;
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from('product-assets')
              .upload(filename, Buffer.from(fileContent), {
                contentType: 'text/html',
              });

            if (!uploadError && uploadData) {
              const { data: publicUrl } = supabaseAdmin.storage.from('product-assets').getPublicUrl(filename);
              pdfUrl = publicUrl.publicUrl;
              await supabaseAdmin
                .from('product_datasheets')
                .update({ file_url: pdfUrl })
                .eq('id', savedDatasheet!.id);
            }
          }

          await supabaseAdmin
            .from('products')
            .update({ datasheet_generated: true })
            .eq('id', validated.productId);

          await supabaseAdmin.from('ai_audit_logs').insert({
            user_id: auth.userId,
            action: 'generate_datasheet',
            entity_type: 'datasheet',
            entity_id: savedDatasheet!.id,
            status: 'success',
            duration_ms: Date.now() - started,
          });

          return json(
            {
              success: true,
              datasheet: {
                id: savedDatasheet!.id,
                product_id: validated.productId,
                content: datasheetContent,
                file_url: pdfUrl,
                status: 'generated',
                format: validated.format,
                language: validated.language,
              },
            },
            200,
            { request },
          );
        } catch (error) {
          console.error('[v0] Datasheet generation error:', error);

          await supabaseAdmin.from('ai_audit_logs').insert({
            action: 'generate_datasheet',
            entity_type: 'datasheet',
            status: 'error',
            metadata: { error: error instanceof Error ? error.message : String(error) },
            duration_ms: Date.now() - started,
          });

          return json(
            {
              error: 'Datasheet generation failed',
            },
            500,
            { request },
          );

        }
      },
    },
  },
});
