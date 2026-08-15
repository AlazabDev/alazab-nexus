import { generateText } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { buildProductAgentTools } from "./agent/product-tools.server";

/**
 * Azure AI Foundry / OpenAI Agent Connector.
 * Uses Vercel AI SDK with @ai-sdk/azure to provide tool-calling capabilities.
 */

export function agentConfig() {
  const resourceName =
    process.env.AZURE_RESOURCE_NAME ||
    (process.env.AZURE_OPENAI_ENDPOINT
      ? new URL(process.env.AZURE_OPENAI_ENDPOINT).hostname.split(".")[0]
      : "az-ai-resource");

  return {
    resourceName,
    agentName: "az-agent-prod (AI SDK)",
    agentVersion: "Vercel SDK",
    modelDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.1",
  };
}

function apiKey() {
  const key = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_FOUNDRY_API_KEY || process.env.AZURE_AI_API_KEY;
  if (!key) throw new Error("AZURE_OPENAI_API_KEY not configured");
  return key;
}

export type ProductAgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProductAgentRequest = {
  input: string | ProductAgentMessage[];
  /** SessionId is largely ignored since Vercel AI SDK is stateless, but kept for signature compatibility */
  sessionId?: string;
  metadata?: Record<string, unknown>;
  /** Only true when the entry point verified the caller as editor/admin. */
  canWrite?: boolean;
};

export type ProductAgentResponse = {
  outputText: string;
  sessionId?: string;
  raw: unknown;
};

/**
 * Creates a conversation and generates an agent response with tool calling.
 */
export async function callAzureProductAgent({
  input,
  sessionId,
  metadata,
  canWrite = false,
}: ProductAgentRequest): Promise<ProductAgentResponse> {
  const cfg = agentConfig();
  
  const azure = createAzure({
    resourceName: cfg.resourceName,
    apiKey: apiKey(),
  });

  const model = azure(cfg.modelDeployment);

  const messages: any[] =
    typeof input === "string"
      ? [{ role: "user", content: input }]
      : input;

  if (!messages.length) throw new Error("لا توجد رسالة لإرسالها للوكيل");

  try {
    const result = await generateText({
      // @ts-ignore: Version mismatch between ai and @ai-sdk/azure
      model,
      messages,
      tools: buildProductAgentTools({ canWrite }),
    });

    return {
      outputText: result.text,
      sessionId: sessionId || "local-session",
      raw: result,
    };
  } catch (error) {
    console.error("Agent error:", error);
    throw new Error(error instanceof Error ? error.message : "فشل الوكيل في معالجة الطلب");
  }

}

export async function fetchAgentCard(): Promise<{
  ok: boolean;
  status: number;
  card?: unknown;
  error?: string;
}> {
  return { ok: true, status: 200, card: { type: "vercel-ai-sdk" } };
}

export function azureProductAgentStatus() {
  const cfg = agentConfig();
  return {
    ...cfg,
    apiKey: !!apiKey(),
  };
}
