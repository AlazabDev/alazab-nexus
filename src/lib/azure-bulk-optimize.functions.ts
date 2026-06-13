/**
 * Bulk product content optimization via Azure OpenAI.
 * Fills missing/weak fields (name_ar/en, description_ar/en, tags, search_keywords, marketing/technical content).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { azureChat } from "./azure.server";

const InputSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(25),
  overwrite: z.boolean().optional().default(false),
  fields: z
    .array(
      z.enum([
        "name_ar",
        "name_en",
        "short_description_ar",
        "short_description_en",
        "description_ar",
        "description_en",
        "marketing_content",
        "technical_content",
        "tags",
        "search_keywords",
      ]),
    )
    .min(1),
});

type OptField = z.infer<typeof InputSchema>["fields"][number];

const SYSTEM_PROMPT = `أنت محرر كتالوج منتجات صناعي محترف لشركة العزب. مهمتك تحسين محتوى المنتجات بدقة فنية ولغة تسويقية واضحة دون اختراع أرقام موديل أو شهادات. أرجع JSON صالحاً فقط بدون أي شرح خارجي.`;

function buildPrompt(p: any, fields: OptField[], overwrite: boolean) {
  const current = {
    az_code: p.az_code,
    name_ar: p.name_ar,
    name_en: p.name_en,
    short_description_ar: p.short_description_ar,
    short_description_en: p.short_description_en,
    description_ar: p.description_ar,
    description_en: p.description_en,
    marketing_content: p.marketing_content,
    technical_content: p.technical_content,
    gpc_family: p.gpc_family,
    sector_ar: p.sector_ar,
    tags: p.tags,
    search_keywords: p.search_keywords,
  };
  return `بيانات المنتج الحالية:\n${JSON.stringify(current, null, 2)}\n\nالحقول المطلوب تحسينها: ${fields.join(", ")}\nسياسة الكتابة: ${overwrite ? "أعد كتابة الحقول حتى لو كانت مكتوبة" : "أكمل فقط الحقول الفارغة أو الضعيفة (أقل من 30 حرفاً) واترك الجيد كما هو"}\n\nأرجع كائن JSON بهذا الشكل بالضبط مع الحقول المطلوبة فقط:\n{\n  "name_ar": "...",\n  "name_en": "...",\n  "short_description_ar": "...",\n  "short_description_en": "...",\n  "description_ar": "...",\n  "description_en": "...",\n  "marketing_content": "...",\n  "technical_content": "...",\n  "tags": ["..."],\n  "search_keywords": ["..."]\n}`;
}

function parseJson(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("لم يُرجع المساعد JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export const azureBulkOptimizeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["editor", "admin"])
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: editor or admin role required");

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, az_code, name_ar, name_en, short_description_ar, short_description_en, description_ar, description_en, marketing_content, technical_content, gpc_family, sector_ar, tags, search_keywords",
      )
      .in("id", data.productIds);
    if (error) throw new Error(error.message);

    const summary: { productId: string; azCode: string; updated: string[]; error?: string }[] = [];

    for (const p of products ?? []) {
      try {
        const prompt = buildPrompt(p, data.fields, data.overwrite);
        const reply = await azureChat(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          { temperature: 0.4, maxTokens: 1800 },
        );
        const parsed = parseJson(reply);

        const patch: Record<string, unknown> = {};
        for (const f of data.fields) {
          const v = (parsed as any)[f];
          if (v == null) continue;
          if (!data.overwrite) {
            const cur = (p as any)[f];
            const len = Array.isArray(cur) ? cur.length : (cur ?? "").toString().length;
            if (len >= 30) continue;
          }
          patch[f] = v;
        }

        if (Object.keys(patch).length === 0) {
          summary.push({ productId: p.id, azCode: p.az_code, updated: [] });
          continue;
        }

        const { error: uErr } = await supabaseAdmin
          .from("products")
          .update(patch as never)
          .eq("id", p.id);
        if (uErr) throw new Error(uErr.message);

        summary.push({ productId: p.id, azCode: p.az_code, updated: Object.keys(patch) });
      } catch (e: any) {
        summary.push({ productId: p.id, azCode: p.az_code, updated: [], error: e?.message ?? String(e) });
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      entity_type: "products",
      entity_id: null,
      action: "AZURE_AI_CONTENT_BULK",
      new_value: { count: products?.length ?? 0, summary, fields: data.fields } as any,
    });

    const totalUpdated = summary.filter((s) => s.updated.length > 0).length;
    const totalFailed = summary.filter((s) => s.error).length;
    return { summary, totalUpdated, totalFailed };
  });
