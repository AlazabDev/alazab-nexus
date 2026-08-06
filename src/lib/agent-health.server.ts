/**
 * Health probes for the AI services the agents depend on:
 * - Azure AI Foundry agent (az-agent-prod) via its A2A agent card
 * - Azure OpenAI deployment
 * - Azure AI Search index
 *
 * Never returns keys or raw upstream bodies — only status, latency and a
 * short, sanitized message.
 */
import { agentConfig, fetchAgentCard } from "@/lib/azure-foundry-agent.server";

export type ServiceHealth = {
  key: "foundry" | "openai" | "search";
  label: string;
  configured: boolean;
  ok: boolean;
  status: number;
  latencyMs: number | null;
  detail: string;
};

export type AgentHealth = {
  checkedAt: string;
  overall: "ok" | "degraded" | "down" | "unconfigured";
  agentName: string;
  agentVersion: string;
  modelDeployment: string;
  services: ServiceHealth[];
};

const TIMEOUT_MS = 8000;

function shortError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "خطأ غير معروف";
  return msg.slice(0, 140);
}

async function timed<T>(
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<{ value?: T; error?: string; ms: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const value = await fn(controller.signal);
    return { value, ms: Date.now() - started };
  } catch (e) {
    return { error: shortError(e), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function checkFoundry(): Promise<ServiceHealth> {
  const cfg = agentConfig();
  const configured = !!(process.env.AZURE_FOUNDRY_API_KEY || process.env.AZURE_AI_API_KEY);
  if (!configured) {
    return {
      key: "foundry",
      label: `وكيل Foundry · ${cfg.agentName}`,
      configured: false,
      ok: false,
      status: 0,
      latencyMs: null,
      detail: "مفتاح AZURE_AI_API_KEY غير مهيأ",
    };
  }
  const res = await timed(() => fetchAgentCard());
  const card = res.value;
  return {
    key: "foundry",
    label: `وكيل Foundry · ${cfg.agentName}`,
    configured: true,
    ok: !!card?.ok,
    status: card?.status ?? 0,
    latencyMs: res.ms,
    detail: card?.ok
      ? "بطاقة الوكيل متاحة"
      : (card?.error?.slice(0, 140) ?? res.error ?? "تعذر الوصول للوكيل"),
  };
}

async function checkOpenAI(): Promise<ServiceHealth> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "alazab-paop-assistant";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-02-01";

  if (!endpoint || !apiKey) {
    return {
      key: "openai",
      label: `Azure OpenAI · ${deployment}`,
      configured: false,
      ok: false,
      status: 0,
      latencyMs: null,
      detail: "AZURE_OPENAI_ENDPOINT أو AZURE_OPENAI_API_KEY غير مهيأ",
    };
  }

  const url = `${endpoint.replace(/\/+$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const res = await timed(async (signal) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
      signal,
    }),
  );

  const status = res.value?.status ?? 0;
  return {
    key: "openai",
    label: `Azure OpenAI · ${deployment}`,
    configured: true,
    ok: !!res.value?.ok,
    status,
    latencyMs: res.ms,
    detail: res.value?.ok ? "النموذج يستجيب" : (res.error ?? `استجابة ${status}`),
  };
}

async function checkSearch(): Promise<ServiceHealth> {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_API_KEY;
  const index =
    process.env.AZURE_SEARCH_INDEX ?? process.env.AZURE_SEARCH_INDEX_NAME ?? "alazab-products";

  if (!endpoint || !apiKey) {
    return {
      key: "search",
      label: `Azure AI Search · ${index}`,
      configured: false,
      ok: false,
      status: 0,
      latencyMs: null,
      detail: "AZURE_SEARCH_ENDPOINT أو AZURE_SEARCH_API_KEY غير مهيأ",
    };
  }

  const url = `${endpoint.replace(/\/+$/, "")}/indexes/${encodeURIComponent(index)}/docs/$count?api-version=2023-11-01`;
  const res = await timed(async (signal) => fetch(url, { headers: { "api-key": apiKey }, signal }));
  const status = res.value?.status ?? 0;
  return {
    key: "search",
    label: `Azure AI Search · ${index}`,
    configured: true,
    ok: !!res.value?.ok,
    status,
    latencyMs: res.ms,
    detail: res.value?.ok ? "الفهرس متاح" : (res.error ?? `استجابة ${status}`),
  };
}

export async function collectAgentHealth(): Promise<AgentHealth> {
  const cfg = agentConfig();
  const services = await Promise.all([checkFoundry(), checkOpenAI(), checkSearch()]);

  const configured = services.filter((s) => s.configured);
  const okCount = services.filter((s) => s.ok).length;

  const overall: AgentHealth["overall"] =
    configured.length === 0
      ? "unconfigured"
      : okCount === services.length
        ? "ok"
        : okCount === 0
          ? "down"
          : "degraded";

  return {
    checkedAt: new Date().toISOString(),
    overall,
    agentName: cfg.agentName,
    agentVersion: cfg.agentVersion,
    modelDeployment: cfg.modelDeployment,
    services,
  };
}
