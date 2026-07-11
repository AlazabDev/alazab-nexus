import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-daftra-signature",
};

// HMAC-SHA256 verification for the Daftra webhook.
// Configure DAFTRA_WEBHOOK_SECRET in the edge function secrets and set the same
// value on the Daftra webhook so it signs each payload with x-daftra-signature.
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const provided = signature.replace(/^sha256=/, "").toLowerCase();
  if (provided.length !== hex.length) return false;
  // constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) mismatch |= hex.charCodeAt(i) ^ provided.charCodeAt(i);
  return mismatch === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = Deno.env.get("DAFTRA_WEBHOOK_SECRET");
  if (!secret) {
    console.error("DAFTRA_WEBHOOK_SECRET not configured — webhook disabled");
    return new Response(JSON.stringify({ success: false, error: "Webhook not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-daftra-signature") ?? "";
  if (!signature || !(await verifySignature(rawBody, signature, secret))) {
    return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = JSON.parse(rawBody);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event, data } = body ?? {};
    switch (event) {
      case "invoice.created":
        await handleInvoiceCreated(supabase, data);
        break;
      case "invoice.paid":
        await handleInvoicePaid(supabase, data);
        break;
      case "item.updated":
        await handleItemUpdated(supabase, data);
        break;
      default:
        console.log("Unknown event:", event);
    }

    await supabase.from("webhook_logs").insert({
      source: "daftra",
      event_type: event,
      payload: body,
      processed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleInvoiceCreated(supabase: any, data: any) {
  const { error } = await supabase.from("orders").insert({
    daftra_invoice_id: data.invoice_id,
    customer_name: data.customer_name,
    total_amount: data.total,
    currency: data.currency || "SAR",
    status: "pending",
    source: "daftra",
    raw_data: data,
  });
  if (error) console.error("Error creating order:", error);
}

async function handleInvoicePaid(supabase: any, data: any) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("daftra_invoice_id", data.invoice_id);
  if (error) console.error("Error updating order:", error);
}

async function handleItemUpdated(supabase: any, data: any) {
  const { error } = await supabase
    .from("products")
    .update({
      daftra_price: data.price,
      daftra_cost: data.cost,
      daftra_updated_at: new Date().toISOString(),
    })
    .eq("az_code", data.sku);
  if (error) console.error("Error updating product:", error);
}
