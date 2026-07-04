import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callAzureProductAgent } from "@/lib/azure-foundry-agent.server";
import { json, corsHeaders } from "@/lib/api-auth";

const BodySchema = z.object({
  input: z.union([
    z.string().min(1),
    z.array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1),
      }),
    ),
  ]),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/agent/v1/product-agent")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),

      POST: async ({ request }) => {
        try {
          const body = BodySchema.parse(await request.json());
          const result = await callAzureProductAgent({
            input: body.input,
            sessionId: body.sessionId,
            metadata: body.metadata,
          });

          return json(
            {
              success: true,
              agent: "az-agent-prod",
              output_text: result.outputText,
              raw: result.raw,
            },
            200,
            { request },
          );
        } catch (error) {
          return json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Product agent failed",
            },
            500,
            { request },
          );
        }
      },
    },
  },
});
