import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchImageAsDataUrl } from "./ssrf-guard";

const BUCKET = "product-assets";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-image";

async function callGeminiImageEdit(prompt: string, imageDataUrl: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url?.startsWith("data:")) throw new Error("No edited image returned");
  const [meta, b64] = url.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  return { mime, bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) };
}

export const aiEditProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { productId: string; sourceUrl: string; prompt: string; replaceLinkId?: string }) =>
      z
        .object({
          productId: z.string().uuid(),
          sourceUrl: z.string().url(),
          prompt: z.string().min(3).max(2000),
          replaceLinkId: z.string().uuid().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["editor", "admin"])
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden: editor or admin role required");

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, az_code")
      .eq("id", data.productId)
      .single();
    if (pErr || !product) throw new Error("Product not found");

    const dataUrl = await fetchImageAsDataUrl(data.sourceUrl);
    const { mime, bytes } = await callGeminiImageEdit(data.prompt, dataUrl);
    const ext = mime.split("/")[1] ?? "png";
    const path = `${product.az_code}/ai_edit_${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "31536000" });
    if (upErr) throw new Error(`Storage: ${upErr.message}`);
    // Bucket is private: issue a signed URL instead of a public one.
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) throw new Error(`Storage: ${signErr?.message ?? "sign failed"}`);
    const pub = { publicUrl: signed.signedUrl };

    const { data: asset, error: aErr } = await supabaseAdmin
      .from("assets")
      .insert({
        file_name: `ai_edit_${product.az_code}.${ext}`,
        file_url: pub.publicUrl,
        file_size: bytes.byteLength,
        file_type: mime,
        folder_path: product.az_code,
        storage_provider: "supabase",
        source: "ai_edited",
        uploaded_by: context.userId,
        status: "active",
        tags: ["ai", "edited"],
      })
      .select("id")
      .single();
    if (aErr) throw new Error(`Asset: ${aErr.message}`);

    const { count } = await supabaseAdmin
      .from("product_assets")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);

    const { error: lErr } = await supabaseAdmin.from("product_assets").insert({
      product_id: product.id,
      asset_id: asset.id,
      asset_role: "gallery",
      sort_order: count ?? 0,
    });
    if (lErr) throw new Error(`Link: ${lErr.message}`);

    if (data.replaceLinkId) {
      await supabaseAdmin.from("product_assets").delete().eq("id", data.replaceLinkId);
    }

    return { ok: true, url: pub.publicUrl };
  });
