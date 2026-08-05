import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Real implementations for the chat productivity helpers
 * (translation + conversation summary) backed by Azure OpenAI,
 * with a Lovable AI Gateway fallback when Azure is not configured.
 */
async function chat(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    const { azureChat } = await import("@/lib/azure.server");
    return azureChat(messages, { temperature: 0.2, maxTokens: 1200 });
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("لا يوجد مزود ذكاء اصطناعي مهيأ (Azure OpenAI أو LOVABLE_API_KEY)");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({ model: "google/gemini-3.6-flash", messages }),
  });
  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export const translateChatText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        text: z.string().min(1).max(20000),
        target: z.enum(["en", "fr", "ar"]).default("en"),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const names = { en: "English", fr: "French", ar: "Arabic" } as const;
    const text = await chat([
      {
        role: "system",
        content: `You are a professional technical translator for an industrial products catalog. Translate the user's text into ${names[data.target]}. Return only the translation, preserving formatting and technical terms.`,
      },
      { role: "user", content: data.text },
    ]);
    return { text: text.trim() || data.text };
  });

export const summarizeConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string().min(1).max(20000),
            }),
          )
          .min(1)
          .max(200),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const transcript = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "المستخدم" : "المساعد"}: ${m.content}`)
      .join("\n");

    const summary = await chat([
      {
        role: "system",
        content:
          "لخص المحادثة التالية بالعربية في 4-6 نقاط موجزة تشمل الطلبات الأساسية والقرارات والخطوات المتبقية.",
      },
      { role: "user", content: transcript },
    ]);

    return { summary: summary.trim() || "تعذر إنشاء ملخص." };
  });
