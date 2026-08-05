/**
 * Azure AI Foundry — az-agent-prod connector.
 *
 * Non-secret identifiers are hardcoded as defaults (overridable by env),
 * the API key must come from secrets: AZURE_FOUNDRY_API_KEY or AZURE_AI_API_KEY.
 */

const DEFAULTS = {
  resourceEndpoint: "https://az-ai-resource.services.ai.azure.com",
  projectName: "az-ai-gateway",
  projectEndpoint: "https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway",
  agentName: "az-agent-prod",
  agentVersion: "5",
  modelDeployment: "az-model-core",
  responsesEndpoint:
    "https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway/agents/az-agent-prod/endpoint/protocols/openai/responses",
  agentCardEndpoint:
    "https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway/agents/az-agent-prod/endpoint/protocols/a2a/agentCard/v1.0",
} as const;

export function agentConfig() {
  return {
    resourceEndpoint: process.env.FOUNDRY_RESOURCE_ENDPOINT || DEFAULTS.resourceEndpoint,
    projectName: process.env.FOUNDRY_PROJECT_NAME || DEFAULTS.projectName,
    projectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT || DEFAULTS.projectEndpoint,
    agentName: process.env.FOUNDRY_AGENT_NAME || DEFAULTS.agentName,
    agentVersion: process.env.FOUNDRY_AGENT_VERSION || DEFAULTS.agentVersion,
    modelDeployment: process.env.MODEL_DEPLOYMENT_NAME || DEFAULTS.modelDeployment,
    responsesEndpoint:
      process.env.FOUNDRY_RESPONSES_ENDPOINT ||
      process.env.AZURE_FOUNDRY_AGENT_ENDPOINT ||
      DEFAULTS.responsesEndpoint,
    agentCardEndpoint: process.env.FOUNDRY_AGENT_CARD_ENDPOINT || DEFAULTS.agentCardEndpoint,
  };
}

function apiKey() {
  const key = process.env.AZURE_FOUNDRY_API_KEY || process.env.AZURE_AI_API_KEY;
  if (!key) throw new Error("AZURE_AI_API_KEY (or AZURE_FOUNDRY_API_KEY) not configured");
  return key;
}

export type ProductAgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProductAgentRequest = {
  input: string | ProductAgentMessage[];
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

export type ProductAgentResponse = {
  outputText: string;
  sessionId?: string;
  raw: unknown;
};

function normalizeOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
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

export async function callAzureProductAgent({
  input,
  sessionId,
  metadata,
}: ProductAgentRequest): Promise<ProductAgentResponse> {
  const cfg = agentConfig();
  const key = apiKey();

  const body: Record<string, unknown> = {
    input,
    metadata: {
      agent: cfg.agentName,
      source: "alazab-nexus",
      ...(metadata ?? {}),
    },
  };

  if (sessionId) body.extra_body = { agent_session_id: sessionId };

  const response = await fetch(cfg.responsesEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": key },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { text };
  }

  if (!response.ok) {
    throw new Error(`Azure Foundry agent ${response.status}: ${text.slice(0, 500)}`);
  }

  return {
    outputText: normalizeOutputText(payload),
    sessionId:
      payload?.extra_body?.agent_session_id ??
      payload?.agent_session_id ??
      payload?.id ??
      sessionId,
    raw: payload,
  };
}

export async function fetchAgentCard(): Promise<{ ok: boolean; status: number; card?: unknown; error?: string }> {
  const cfg = agentConfig();
  try {
    const res = await fetch(cfg.agentCardEndpoint, { headers: { "api-key": apiKey() } });
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
