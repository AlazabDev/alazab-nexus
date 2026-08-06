import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPublicHttpUrl } from "./ssrf-guard";

export type IntegrationType = "erpnext" | "daftra" | "supabase" | "rasa" | "ai_agents";

export type TestInput = {
  type: IntegrationType;
  endpoint?: string;
  apiKey?: string;
  extra?: Record<string, string>;
};

async function timedFetch(url: string, init: RequestInit, timeoutMs = 8000) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // SSRF guard: block private/link-local/metadata hosts and non-https schemes.
    const safeUrl = assertPublicHttpUrl(url).toString();
    const res = await fetch(safeUrl, { ...init, signal: ctrl.signal, redirect: "error" });
    return { ok: res.ok, status: res.status, latency: Date.now() - start };
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      latency: Date.now() - start,
      error: e?.message || "network_error",
    };
  } finally {
    clearTimeout(t);
  }
}

export const testIntegrationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TestInput) => d)
  .handler(async ({ data, context }) => {
    // Only admins/editors can test
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = roles?.some((r) => r.role === "admin" || r.role === "editor");
    if (!allowed) throw new Error("forbidden");

    const endpoint = (data.endpoint || "").replace(/\/+$/, "");

    switch (data.type) {
      case "erpnext": {
        if (!endpoint) return { ok: false, message: "أدخل عنوان ERPNext" };
        const headers: Record<string, string> = { Accept: "application/json" };
        if (data.apiKey && data.extra?.apiSecret) {
          headers.Authorization = `token ${data.apiKey}:${data.extra.apiSecret}`;
        }
        const r = await timedFetch(`${endpoint}/api/method/frappe.auth.get_logged_user`, {
          method: "GET",
          headers,
        });
        return {
          ok: r.ok,
          status: r.status,
          latency: r.latency,
          message: r.ok ? "متصل" : r.error || `HTTP ${r.status}`,
        };
      }
      case "daftra": {
        const base = endpoint || "https://api.daftra.com";
        if (!data.apiKey) return { ok: false, message: "أدخل مفتاح API لـ Daftra" };
        const r = await timedFetch(`${base}/v2/api/entity/staff/list/1`, {
          method: "GET",
          headers: { APIKEY: data.apiKey, Accept: "application/json" },
        });
        return {
          ok: r.ok,
          status: r.status,
          latency: r.latency,
          message: r.ok ? "متصل" : r.error || `HTTP ${r.status}`,
        };
      }
      case "supabase": {
        const url = endpoint || process.env.SUPABASE_URL || "";
        const key = data.apiKey || process.env.SUPABASE_PUBLISHABLE_KEY || "";
        if (!url || !key) return { ok: false, message: "أدخل عنوان ومفتاح Supabase" };
        const r = await timedFetch(`${url}/auth/v1/health`, {
          method: "GET",
          headers: { apikey: key },
        });
        return {
          ok: r.ok,
          status: r.status,
          latency: r.latency,
          message: r.ok ? "متصل" : r.error || `HTTP ${r.status}`,
        };
      }
      case "rasa": {
        if (!endpoint) return { ok: false, message: "أدخل عنوان Rasa" };
        const headers: Record<string, string> = { Accept: "application/json" };
        if (data.apiKey) headers.Authorization = `Bearer ${data.apiKey}`;
        const r = await timedFetch(`${endpoint}/status`, { method: "GET", headers });
        return {
          ok: r.ok,
          status: r.status,
          latency: r.latency,
          message: r.ok ? "متصل" : r.error || `HTTP ${r.status}`,
        };
      }
      case "ai_agents": {
        const url = endpoint || process.env.AZURE_OPENAI_ENDPOINT || "";
        const key = data.apiKey || process.env.AZURE_OPENAI_API_KEY || "";
        if (!url) return { ok: false, message: "أدخل عنوان الخدمة" };
        const headers: Record<string, string> = { Accept: "application/json" };
        if (key) headers["api-key"] = key;
        const r = await timedFetch(
          `${url.replace(/\/+$/, "")}/openai/models?api-version=2024-08-01-preview`,
          {
            method: "GET",
            headers,
          },
        );
        return {
          ok: r.ok,
          status: r.status,
          latency: r.latency,
          message: r.ok ? "متصل" : r.error || `HTTP ${r.status}`,
        };
      }
      default:
        return { ok: false, message: "نوع تكامل غير معروف" };
    }
  });
