import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callAzureProductAgent, agentConfig } from "./azure-foundry-agent.server";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/azure", () => ({
  createAzure: vi.fn(() => vi.fn(() => ({})),
}));

import { generateText } from "ai";
import { createAzure } from "@ai-sdk/azure";

describe("Azure Foundry product agent", () => {
  beforeEach(() => {
    process.env["AZURE_AI_API_KEY"] = "test-key";
    vi.mocked(generateText).mockReset();
    vi.mocked(createAzure).mockReset().mockReturnValue(vi.fn(() => ({})));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns agent config with resource and deployment info", () => {
    const cfg = agentConfig();
    expect(cfg.resourceName).toBeTruthy();
    expect(cfg.agentName).toContain("AI SDK");
    expect(cfg.modelDeployment).toBeTruthy();
  });

  it("calls generateText and returns the output text", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "مرحباً",
      toolCalls: [],
      toolResults: [],
    } as any);

    const result = await callAzureProductAgent({ input: "ما هي منتجات الإضاءة؟" });

    expect(createAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceName: expect.any(String),
        apiKey: "test-key",
      }),
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "ما هي منتجات الإضاءة؟" }],
      }),
    );
    expect(result.outputText).toBe("مرحباً");
    expect(result.sessionId).toBe("local-session");
  });

  it("preserves sessionId when provided", async () => {
    vi.mocked(generateText).mockResolvedValue({ text: "تم" } as any);

    const result = await callAzureProductAgent({
      input: "اختبار",
      sessionId: "session_123",
    });

    expect(result.sessionId).toBe("session_123");
  });

  it("converts message array into SDK messages", async () => {
    vi.mocked(generateText).mockResolvedValue({ text: "تم" } as any);

    await callAzureProductAgent({
      input: [
        { role: "system", content: "أنت وكيل" },
        { role: "user", content: "سؤال" },
      ],
    });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "system", content: "أنت وكيل" },
          { role: "user", content: "سؤال" },
        ],
      }),
    );
  });

  it("throws on empty input array", async () => {
    await expect(callAzureProductAgent({ input: [] })).rejects.toThrow(
      /لا توجد رسالة/,
    );
  });

  it("throws when generateText fails", async () => {
    vi.mocked(generateText).mockRejectedValue(new Error("model error"));

    await expect(callAzureProductAgent({ input: "اختبار" })).rejects.toThrow(
      /model error/,
    );
  });

  it("requires an API key", async () => {
    delete process.env["AZURE_AI_API_KEY"];
    delete process.env["AZURE_FOUNDRY_API_KEY"];
    delete process.env["AZURE_OPENAI_API_KEY"];

    await expect(callAzureProductAgent({ input: "اختبار" })).rejects.toThrow(
      /not configured/,
    );
  });
});
