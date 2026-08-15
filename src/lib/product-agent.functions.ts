import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sanitizeSearchTerm } from "@/lib/utils";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  callAzureProductAgent,
  azureProductAgentStatus,
  fetchAgentCard,
} from "@/lib/azure-foundry-agent.server";
import {
  PRODUCT_AGENT_FIELDS,
  buildAgentSystemPrompt,
  extractJsonBlock,
  type ProductPatch,
} from "@/lib/product-agent.shared";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(20000),
});

export const getProductAgentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const status = azureProductAgentStatus();
    const card = status.apiKey
      ? await fetchAgentCard()
      : { ok: false, status: 0, error: "missing key" };
    return { ...status, reachable: card.ok, cardStatus: card.status, cardError: card.error };
  });

export const searchAgentProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().max(120).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("products")
      .select("id, az_code, name_ar, name_en, status")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (data.q?.trim()) {
      const q = sanitizeSearchTerm(data.q);
      query = query.or(`az_code.ilike.%${q}%,name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const askProductAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(40),
        productId: z.string().uuid().optional(),
        sessionId: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let product: Record<string, unknown> | null = null;

    if (data.productId) {
      const { data: row, error } = await context.supabase
        .from("products")
        .select(`id, az_code, ${PRODUCT_AGENT_FIELDS.join(", ")}`)
        .eq("id", data.productId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      product = (row as Record<string, unknown> | null) ?? null;
    }

    const input = [
      { role: "system" as const, content: buildAgentSystemPrompt(product) },
      ...data.messages.filter((m) => m.role !== "system"),
    ];

    // Write-capable agent tools require an explicit editor/admin role.
    const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "editor" }),
    ]);
    const canWrite = Boolean(isAdmin || isEditor);

    const result = await callAzureProductAgent({
      input,
      sessionId: data.sessionId,
      metadata: { productId: data.productId ?? null, userId: context.userId },
      canWrite,
    });

    const patch = extractJsonBlock(result.outputText);

    return {
      reply: result.outputText || "لم يرد الوكيل بنص.",
      sessionId: result.sessionId,
      suggestion: patch,
    };
  });

export const applyProductAgentPatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        patch: z.record(z.union([z.string(), z.array(z.string())])),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const clean: ProductPatch = {};
    for (const key of PRODUCT_AGENT_FIELDS) {
      const value = data.patch[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "string" && !value.trim()) continue;
      clean[key] = value;
    }

    if (!Object.keys(clean).length) throw new Error("لا توجد حقول صالحة للتطبيق");

    const { error } = await context.supabase
      .from("products")
      .update({ ...clean, ai_optimization_applied_at: new Date().toISOString() } as never)
      .eq("id", data.productId);

    if (error) throw new Error(error.message);
    return { applied: Object.keys(clean) };
  });
