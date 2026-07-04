const AZURE_FOUNDRY_AGENT_ENDPOINT =
  "https://az-ai-resource.services.ai.azure.com/api/projects/az-ai-gateway/agents/az-agent-prod/endpoint/protocols/openai/responses";

const DEFAULT_AGENT_NAME = "az-agent-prod";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not configured`);
  return value;
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
        if (typeof part?.content === "string") textParts.push(part.content);
      }
    }
  }

  return textParts.filter(Boolean).join("\n").trim();
}

export async function callAzureProductAgent({
  input,
  sessionId,
  metadata,
}: ProductAgentRequest): Promise<ProductAgentResponse> {
  const apiKey = requiredEnv("AZURE_FOUNDRY_API_KEY");
  const endpoint = process.env.AZURE_FOUNDRY_AGENT_ENDPOINT || AZURE_FOUNDRY_AGENT_ENDPOINT;

  const body: Record<string, unknown> = {
    input,
    metadata: {
      agent: DEFAULT_AGENT_NAME,
      source: "alazab-nexus",
      ...(metadata ?? {}),
    },
  };

  if (sessionId) {
    body.extra_body = {
      agent_session_id: sessionId,
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown;
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
    raw: payload,
  };
}

export function azureProductAgentStatus() {
  return {
    endpoint: !!(process.env.AZURE_FOUNDRY_AGENT_ENDPOINT || AZURE_FOUNDRY_AGENT_ENDPOINT),
    apiKey: !!process.env.AZURE_FOUNDRY_API_KEY,
    agent: DEFAULT_AGENT_NAME,
  };
}
