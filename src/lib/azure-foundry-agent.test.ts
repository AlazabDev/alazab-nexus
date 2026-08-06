import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callAzureProductAgent, agentConfig } from "./azure-foundry-agent.server";

type Call = { url: string; body: any };

function mockFetch(handler: (call: Call, index: number) => { status: number; json: any }) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: any, init: any) => {
    const call: Call = { url: String(input), body: JSON.parse(init?.body ?? "{}") };
    calls.push(call);
    const { status, json } = handler(call, calls.length - 1);
    return new Response(JSON.stringify(json), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

const USER_SCOPE_ERROR = {
  error: {
    message: "aml-user-token header is required when using {{$userId}} scope",
  },
};

describe("Azure Foundry product agent", () => {
  beforeEach(() => {
    process.env["AZURE_AI_API_KEY"] = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a conversation then calls responses and returns the output text", async () => {
    const cfg = agentConfig();
    const calls = mockFetch((call) => {
      if (call.url.endsWith("/conversations")) {
        return { status: 200, json: { id: "conv_123" } };
      }
      return { status: 200, json: { id: "resp_1", output_text: "مرحباً" } };
    });

    const result = await callAzureProductAgent({ input: "ما هي منتجات الإضاءة؟" });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe(`${cfg.openaiBase}/conversations`);
    expect(calls[0]!.body.items[0]).toMatchObject({
      type: "message",
      role: "user",
      content: "ما هي منتجات الإضاءة؟",
    });

    expect(calls[1]!.url).toBe(`${cfg.openaiBase}/responses`);
    expect(calls[1]!.body.conversation).toBe("conv_123");
    expect(calls[1]!.body.agent_reference).toMatchObject({
      type: "agent_reference",
      name: cfg.agentName,
      version: cfg.agentVersion,
    });

    expect(result.outputText).toBe("مرحباً");
    expect(result.sessionId).toBe("conv_123");
  });

  it("reuses an existing conversation and only sends the newest turn", async () => {
    const calls = mockFetch(() => ({
      status: 200,
      json: { output: [{ content: [{ text: "تم" }] }] },
    }));

    const result = await callAzureProductAgent({
      input: [
        { role: "system", content: "أنت وكيل" },
        { role: "user", content: "أول رسالة" },
        { role: "assistant", content: "رد" },
        { role: "user", content: "آخر رسالة" },
      ],
      sessionId: "conv_existing",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toMatch(/\/responses$/);
    expect(calls[0]!.body.conversation).toBe("conv_existing");
    expect(calls[0]!.body.input).toHaveLength(1);
    expect(calls[0]!.body.input[0].content).toBe("آخر رسالة");
    expect(calls[0]!.body.instructions).toBe("أنت وكيل");
    expect(result.outputText).toBe("تم");
  });

  it("falls back from version 11 to version 5 when the {{$userId}} scope error appears", async () => {
    const cfg = agentConfig();
    const calls = mockFetch((call, i) => {
      if (call.url.endsWith("/conversations")) return { status: 200, json: { id: "conv_fb" } };
      if (i === 1) return { status: 400, json: USER_SCOPE_ERROR };
      return { status: 200, json: { output_text: "من الإصدار البديل" } };
    });

    const result = await callAzureProductAgent({ input: "اختبار" });

    expect(calls).toHaveLength(3);
    expect(calls[1]!.body.agent_reference.version).toBe(cfg.agentVersion);
    expect(calls[2]!.body.agent_reference.version).toBe(cfg.fallbackVersion);
    expect(cfg.fallbackVersion).toBe("5");
    expect(result.outputText).toBe("من الإصدار البديل");
    expect(result.sessionId).toBe("conv_fb");
  });

  it("does not retry on unrelated errors", async () => {
    const calls = mockFetch((call, i) => {
      if (call.url.endsWith("/conversations")) return { status: 200, json: { id: "conv_err" } };
      if (i === 1) return { status: 500, json: { error: { message: "internal error" } } };
      return { status: 200, json: { output_text: "لا يجب الوصول هنا" } };
    });

    await expect(callAzureProductAgent({ input: "اختبار" })).rejects.toThrow(/internal error/);
    expect(calls).toHaveLength(2);
  });

  it("fails when the conversation cannot be created", async () => {
    mockFetch(() => ({ status: 200, json: {} }));
    await expect(callAzureProductAgent({ input: "اختبار" })).rejects.toThrow(
      "تعذر إنشاء محادثة مع الوكيل",
    );
  });

  it("requires an API key", async () => {
    delete process.env["AZURE_AI_API_KEY"];
    delete process.env["AZURE_FOUNDRY_API_KEY"];
    mockFetch(() => ({ status: 200, json: { id: "conv_x" } }));
    await expect(callAzureProductAgent({ input: "اختبار" })).rejects.toThrow(/not configured/);
  });
});
