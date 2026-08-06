import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// We use the admin client here for tools to bypass RLS, assuming the agent is a trusted server-side entity.
// If the user wants to enforce RLS per user, we would need to pass a regular user client.

export const searchProductsTool = tool({
  description: "ابحث عن المنتجات في قاعدة البيانات باستخدام الاسم أو الكود أو الوصف. استخدم هذا للبحث عن منتج معين للتعرف على سعره أو مخزونه.",
  parameters: z.object({
    query: z.string().describe("كلمة البحث مثل اسم المنتج أو كوده"),
    limit: z.number().optional().default(5).describe("الحد الأقصى لعدد النتائج المرجعة"),
  }),
  execute: async (args: any) => {
    const { query, limit } = args;
    try {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, az_code, name_ar, name_en, price, category, item_type")
        .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%,az_code.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        console.error("Error searching products:", error);
        return { success: false, error: error.message };
      }
      return { success: true, products: data || [] };
    } catch (e) {
      return { success: false, error: String(e) };
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
    item_type: z.enum(["product", "service", "raw_material"]).default("product").describe("نوع العنصر"),
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

export const productAgentTools = {
  searchProducts: searchProductsTool,
  updateProductPrice: updateProductPriceTool,
  createProduct: createProductTool,
};
