import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sanitizeSearchTerm } from "@/lib/utils";

// Read tools are safe for any authenticated caller.
// Write tools (price update / product creation) are only exposed when the
// caller has been verified as an editor/admin (see buildProductAgentTools).

export const searchProductsTool = tool({
  description:
    "ابحث عن المنتجات في قاعدة البيانات باستخدام الاسم أو الكود أو الوصف. استخدم هذا للبحث عن منتج معين للتعرف على سعره أو مخزونه.",
  parameters: z.object({
    query: z.string().describe("كلمة البحث مثل اسم المنتج أو كوده"),
    limit: z.number().optional().default(5).describe("الحد الأقصى لعدد النتائج المرجعة"),
  }),
  execute: async (args: any) => {
    const { query, limit } = args;
    try {
      const q = sanitizeSearchTerm(String(query ?? ""));
      if (!q) return { success: true, products: [] };
      const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 25);

      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, az_code, name_ar, name_en, price, category, item_type")
        .or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%,az_code.ilike.%${q}%`)
        .limit(safeLimit);

      if (error) {
        console.error("Error searching products:", error);
        return { success: false, error: "تعذر تنفيذ البحث" };
      }
      return { success: true, products: data || [] };
    } catch (e) {
      console.error("searchProductsTool failed:", e);
      return { success: false, error: "تعذر تنفيذ البحث" };
    }
  },
} as any);

export const updateProductPriceTool = tool({
  description: "تحديث سعر منتج موجود في قاعدة البيانات.",
  parameters: z.object({
    productId: z.string().describe("المعرف الفريد للمنتج (id) وليس الكود (az_code)"),
    newPrice: z.number().describe("السعر الجديد للمنتج"),
  }),
  execute: async (args: any) => {
    const { productId, newPrice } = args;
    try {
      const { data, error } = await supabaseAdmin
        .from("products")
        .update({ price: newPrice })
        .eq("id", productId)
        .select("id, az_code, name_ar, price")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, product: data };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
} as any);

export const createProductTool = tool({
  description: "إنشاء منتج جديد في قاعدة البيانات.",
  parameters: z.object({
    name_ar: z.string().describe("اسم المنتج باللغة العربية"),
    name_en: z.string().optional().describe("اسم المنتج باللغة الإنجليزية"),
    az_code: z.string().describe("كود المنتج المميز (AZ Code)"),
    price: z.number().describe("سعر المنتج"),
    category: z.string().optional().describe("تصنيف المنتج"),
    item_type: z
      .enum(["product", "service", "raw_material"])
      .default("product")
      .describe("نوع العنصر"),
  }),
  execute: async (args: any) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("products")
        .insert([args as any])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, product: data };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
} as any);

/**
 * Build the tool set for an agent call.
 * Write-capable tools are only included when the caller was verified
 * as an editor/admin by the entry point.
 */
export function buildProductAgentTools({ canWrite = false }: { canWrite?: boolean } = {}) {
  const tools: Record<string, any> = { searchProducts: searchProductsTool };
  if (canWrite) {
    tools.updateProductPrice = updateProductPriceTool;
    tools.createProduct = createProductTool;
  }
  return tools;
}

/** Read-only default tool set. */
export const productAgentTools = buildProductAgentTools();
