/**
 * Server-side proxy for Azure OpenAI chat completions used by the
 * in-app AI assistant. Keeps the AZURE_OPENAI_API_KEY off the client
 * bundle (the previous VITE_AZURE_OPENAI_API_KEY usage exposed the
 * key in browser code).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().max(20000).optional().nullable(),
  tool_call_id: z.string().optional(),
  tool_calls: z.any().optional(),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  tools: z.any().optional(),
  tool_choice: z.any().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(4000).optional(),
});

export const azureChatCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RequestSchema.parse(input))
  .handler(async ({ data }) => {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT ?? "alazab-paop-assistant";
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";

    if (!endpoint || !apiKey) {
      return { error: "Azure OpenAI is not configured" };
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: data.messages,
        ...(data.tools ? { tools: data.tools, tool_choice: data.tool_choice ?? "auto" } : {}),
        temperature: data.temperature ?? 0.7,
        max_tokens: data.max_tokens ?? 2000,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("[azureChatCompletion] upstream error", res.status, t.slice(0, 500));
      return { error: `Upstream error: ${res.status}` };
    }
    return await res.json();
  });
