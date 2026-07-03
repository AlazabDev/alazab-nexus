import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CORS, corsHeaders} from "@/lib/api-auth";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const PriceUpdate = z.object({
  az_code: z.string().min(1).max(64).optional(),
  product_id: z.string().uuid().optional(),
  purchase_price: z.number().nonnegative().optional(),
  selling_price: z.number().nonnegative().optional(),
  currency: z.string().min(2).max(8).optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
});

const InventoryUpdate = z.object({
  az_code: z.string().min(1).max(64).optional(),
  product_id: z.string().uuid().optional(),
  quantity: z.number().int().nonnegative(),
  warehouse: z.string().max(64).optional(),
});

const Payload = z.object({
  event: z.enum(["price.update", "inventory.update", "ping"]),
  prices: z.array(PriceUpdate).max(1000).optional(),
  inventory: z.array(InventoryUpdate).max(1000).optional(),
});

function verifySig(secret: string, body: string, signature: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function resolveProductId(azCode?: string, productId?: string) {
  if (productId) return productId;
  if (!azCode) return null;
  const { data } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("az_code", azCode)
    .maybeSingle();
  return data?.id ?? null;
}

export const Route = createFileRoute("/api/public/v1/suppliers/webhook")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const supplierId = request.headers.get("x-supplier-id");
        const signature = request.headers.get("x-webhook-signature");
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

        if (!supplierId || !signature) {
          return json({ error: "Missing x-supplier-id or x-webhook-signature" }, 401);
        }

        const { data: supplier, error: sErr } = await supabaseAdmin
          .from("suppliers")
          .select("id, webhook_enabled, status")
          .eq("id", supplierId)
          .maybeSingle();

        if (sErr || !supplier) return json({ error: "Supplier not found" }, 404);
        if (!supplier.webhook_enabled) {
          return json({ error: "Webhook not enabled for supplier" }, 403);
        }

        const { data: secretRow } = await supabaseAdmin
          .from("supplier_secrets")
          .select("webhook_secret")
          .eq("supplier_id", supplier.id)
          .maybeSingle();
        const webhookSecret = secretRow?.webhook_secret;
        if (!webhookSecret) {
          return json({ error: "Webhook not enabled for supplier" }, 403);
        }

        const body = await request.text();
        if (!verifySig(webhookSecret, body, signature)) {
          await supabaseAdmin.from("supplier_sync_logs").insert({
            supplier_id: supplier.id,
            event_type: "unknown",
            status: "error",
            error_message: "Invalid signature",
            ip_address: ip,
          });
          return json({ error: "Invalid signature" }, 401);
        }


        let parsed: z.infer<typeof Payload>;
        try {
          parsed = Payload.parse(JSON.parse(body));
        } catch (e) {
          return json({ error: "Invalid payload", details: String(e) }, 400);
        }

        if (parsed.event === "ping") {
          await supabaseAdmin.from("supplier_sync_logs").insert({
            supplier_id: supplier.id,
            event_type: "ping",
            status: "success",
            ip_address: ip,
          });
          return json({ ok: true, pong: true });
        }

        let processed = 0;
        let updated = 0;
        let failed = 0;
        const errors: string[] = [];

        if (parsed.event === "price.update" && parsed.prices) {
          for (const row of parsed.prices) {
            processed++;
            const pid = await resolveProductId(row.az_code, row.product_id);
            if (!pid) {
              failed++;
              errors.push(`Product not found: ${row.az_code ?? row.product_id}`);
              continue;
            }
            const { error } = await supabaseAdmin.from("prices").upsert(
              {
                product_id: pid,
                supplier_id: supplier.id,
                purchase_price: row.purchase_price,
                selling_price: row.selling_price,
                currency: row.currency ?? "EGP",
                valid_from: row.valid_from,
                valid_to: row.valid_to,
                source: "webhook",
                status: "pending",
              } as never,
              { onConflict: "product_id,supplier_id" } as never,
            );
            if (error) {
              failed++;
              errors.push(error.message);
            } else {
              updated++;
            }
          }
        }

        if (parsed.event === "inventory.update" && parsed.inventory) {
          for (const row of parsed.inventory) {
            processed++;
            const pid = await resolveProductId(row.az_code, row.product_id);
            if (!pid) {
              failed++;
              errors.push(`Product not found: ${row.az_code ?? row.product_id}`);
              continue;
            }
            const { error } = await supabaseAdmin.from("supplier_inventory").upsert(
              {
                product_id: pid,
                supplier_id: supplier.id,
                quantity_available: row.quantity,
                warehouse_location: row.warehouse,
                last_updated_at: new Date().toISOString(),
              } as never,
              { onConflict: "product_id,supplier_id" } as never,
            );
            if (error) {
              failed++;
              errors.push(error.message);
            } else {
              updated++;
            }
          }
        }

        await supabaseAdmin
          .from("suppliers")
          .update({ last_sync_at: new Date().toISOString() } as never)
          .eq("id", supplier.id);

        await supabaseAdmin.from("supplier_sync_logs").insert({
          supplier_id: supplier.id,
          event_type: parsed.event,
          status: failed === 0 ? "success" : failed === processed ? "error" : "partial",
          records_processed: processed,
          records_updated: updated,
          records_failed: failed,
          payload: parsed as never,
          error_message: errors.slice(0, 5).join("; ") || null,
          ip_address: ip,
        });

        return json({
          ok: true,
          processed,
          updated,
          failed,
          errors: errors.slice(0, 10),
        });
      },
    },
  },
});
