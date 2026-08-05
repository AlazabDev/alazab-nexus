/**
 * Azure AI Foundry — az-agent-prod connector.
 *
 * Uses the Foundry project OpenAI-compatible v1 surface:
 *   POST {project}/openai/v1/conversations           -> stateful conversation
 *   POST {project}/openai/v1/responses  { conversation, agent: { type: "agent_reference" } }
 *
 * Non-secret identifiers are hardcoded as defaults (overridable by env),
 * the API key must come from secrets: AZURE_FOUNDRY_API_KEY or AZURE_AI_API_KEY.
 */

const DEFAULTS = {
  resourceEndpoint: "https://az-ai-resource.services.ai.azure.com",
  projectName: "az-ai-gateway",
  projectEndpoint: "https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway",
  agentName: "az-agent-prod",
  agentVersion: "11",
  modelDeployment: "az-model-core",
  agentCardEndpoint:
    "https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway/agents/az-agent-prod/endpoint/protocols/a2a/agentCard/v1.0",
} as const;

export function agentConfig() {
  const projectEndpoint = (
    process.env.FOUNDRY_PROJECT_ENDPOINT || DEFAULTS.projectEndpoint
  ).replace(/\/+$/, "");

  return {
    resourceEndpoint: process.env.FOUNDRY_RESOURCE_ENDPOINT || DEFAULTS.resourceEndpoint,
    projectName: process.env.FOUNDRY_PROJECT_NAME || DEFAULTS.projectName,
    projectEndpoint,
    agentName: process.env.FOUNDRY_AGENT_NAME || DEFAULTS.agentName,
    agentVersion: process.env.FOUNDRY_AGENT_VERSION || DEFAULTS.agentVersion,
    modelDeployment: process.env.MODEL_DEPLOYMENT_NAME || DEFAULTS.modelDeployment,
    /** OpenAI-compatible base for conversations/responses */
    openaiBase: process.env.FOUNDRY_OPENAI_BASE || `${projectEndpoint}/openai/v1`,
    agentCardEndpoint: process.env.FOUNDRY_AGENT_CARD_ENDPOINT || DEFAULTS.agentCardEndpoint,
  };
}

function apiKey() {
  const key = process.env.AZURE_FOUNDRY_API_KEY || process.env.AZURE_AI_API_KEY;
  if (!key) throw new Error("AZURE_AI_API_KEY (or AZURE_FOUNDRY_API_KEY) not configured");
  return key;
}

function headers() {
  const key = apiKey();
  return {
    "Content-Type": "application/json",
    "api-key": key,
    Authorization: `Bearer ${key}`,
  };
}

export type ProductAgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProductAgentRequest = {
  input: string | ProductAgentMessage[];
  /** Foundry conversation id (conv_...) carried between turns */
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

export type ProductAgentResponse = {
  outputText: string;
  sessionId?: string;
  raw: unknown;
};

function normalizeOutputText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }
  if (typeof payload?.outputText === "string") return payload.outputText;
  if (typeof payload?.text === "string") return payload.text;

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    if (typeof item?.content === "string") textParts.push(item.content);
    if (Array.isArray(item?.content)) {
      for (const part of item.content) {
        if (typeof part?.text === "string") textParts.push(part.text);
        else if (typeof part?.content === "string") textParts.push(part.content);
      }
    }
  }

  // Fallback: chat-completions style
  if (!textParts.length && typeof payload?.choices?.[0]?.message?.content === "string") {
    textParts.push(payload.choices[0].message.content);
  }

  return textParts.filter(Boolean).join("\n").trim();
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { text };
  }
  if (!res.ok) {
    const detail = payload?.error?.message ?? text.slice(0, 400);
    throw new Error(`Azure Foundry ${res.status}: ${detail}`);
  }
  return payload;
}

function toItems(messages: ProductAgentMessage[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ type: "message", role: m.role, content: m.content }));
}

/**
 * Creates (or reuses) a conversation and generates an agent response.
 */
export async function callAzureProductAgent({
  input,
  sessionId,
  metadata,
}: ProductAgentRequest): Promise<ProductAgentResponse> {
  const cfg = agentConfig();

  const messages: ProductAgentMessage[] =
    typeof input === "string" ? [{ role: "user", content: input }] : input;

  const instructions = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();

  const items = toItems(messages);
  if (!items.length) throw new Error("لا توجد رسالة لإرسالها للوكيل");

  let conversationId = sessionId;

  if (!conversationId) {
    const conversation = await postJson(`${cfg.openaiBase}/conversations`, { items });
    conversationId = conversation?.id;
    if (!conversationId) throw new Error("تعذر إنشاء محادثة مع الوكيل");
  }

  const body: Record<string, unknown> = {
    conversation: conversationId,
    agent: { name: cfg.agentName, version: cfg.agentVersion, type: "agent_reference" },
    metadata: {
      source: "alazab-nexus",
      ...(metadata ?? {}),
    },
  };

  // On a reused conversation, only send the newest turn.
  if (sessionId) body.input = items.slice(-1);
  if (instructions) body.instructions = instructions;

  const payload = await postJson(`${cfg.openaiBase}/responses`, body);

  return {
    outputText: normalizeOutputText(payload),
    sessionId: conversationId,
    raw: payload,
  };
}

export async function fetchAgentCard(): Promise<{ ok: boolean; status: number; card?: unknown; error?: string }> {
  const cfg = agentConfig();
  try {
    const res = await fetch(cfg.agentCardEndpoint, { headers: headers() });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, error: text.slice(0, 300) };
    try {
      return { ok: true, status: res.status, card: JSON.parse(text) };
    } catch {
      return { ok: true, status: res.status, card: { text } };
    }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export function azureProductAgentStatus() {
  const cfg = agentConfig();
  return {
    ...cfg,
    apiKey: !!(process.env.AZURE_FOUNDRY_API_KEY || process.env.AZURE_AI_API_KEY),
  };
}
