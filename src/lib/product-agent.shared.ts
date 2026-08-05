export const PRODUCT_AGENT_FIELDS = [
  "name_ar",
  "name_en",
  "short_description_ar",
  "short_description_en",
  "description_ar",
  "description_en",
  "marketing_content",
  "technical_content",
  "installation_notes",
  "maintenance_notes",
  "warranty_info",
  "brand",
  "tags",
  "search_keywords",
] as const;

export type ProductAgentField = (typeof PRODUCT_AGENT_FIELDS)[number];
export type ProductPatch = Partial<Record<ProductAgentField, unknown>>;

export const FIELD_LABELS_AR: Record<string, string> = {
  name_ar: "الاسم (عربي)",
  name_en: "الاسم (إنجليزي)",
  short_description_ar: "وصف مختصر (عربي)",
  short_description_en: "وصف مختصر (إنجليزي)",
  description_ar: "الوصف (عربي)",
  description_en: "الوصف (إنجليزي)",
  marketing_content: "المحتوى التسويقي",
  technical_content: "المحتوى الفني",
  installation_notes: "ملاحظات التركيب",
  maintenance_notes: "ملاحظات الصيانة",
  warranty_info: "معلومات الضمان",
  brand: "العلامة التجارية",
  tags: "الوسوم",
  search_keywords: "كلمات البحث",
};

export function buildAgentSystemPrompt(product: Record<string, unknown> | null): string {
  const base = `أنت "وكيل المنتجات" لشركة العزب (Alazab PAOP). مهمتك مساعدة فريق الكتالوج على ضبط بيانات المنتجات الصناعية: تحسين الأسماء والأوصاف والمحتوى التسويقي والفني والوسوم بالعربية والإنجليزية.
قواعد:
- أجب بالعربية بشكل موجز ومهني.
- عندما تقترح تعديلات على حقول المنتج، اختم ردك بكتلة JSON داخل \`\`\`json ... \`\`\` تحتوي فقط على الحقول المقترح تغييرها.
- الحقول المسموح بها: ${PRODUCT_AGENT_FIELDS.join(", ")}.
- الحقول tags و search_keywords عبارة عن مصفوفات نصية.
- لا تخترع مواصفات تقنية غير مؤكدة؛ اذكر أنها تحتاج تأكيد.`;

  if (!product) return `${base}\n\nلم يتم اختيار منتج بعد.`;
  return `${base}\n\nبيانات المنتج الحالي:\n${JSON.stringify(product, null, 2)}`;
}

export type AgentSuggestion = Record<string, string | string[]>;

export function extractJsonBlock(text: string): AgentSuggestion | null {
  if (!text) return null;
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*(\{[\s\S]*?\})\s*```/);
  const candidate = fenced?.[1];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate.trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: AgentSuggestion = {};
      for (const key of PRODUCT_AGENT_FIELDS) {
        const v = (parsed as Record<string, unknown>)[key];
        if (typeof v === "string") out[key] = v;
        else if (Array.isArray(v)) out[key] = v.map((x) => String(x));
      }
      return Object.keys(out).length ? out : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function stripJsonBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/gi, "").trim();
}
