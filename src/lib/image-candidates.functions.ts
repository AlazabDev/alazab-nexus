import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-image";

const STYLES: Record<string, string> = {
  product_photo:
    "Professional product photography, seamless white background, studio lighting, centered, ultra sharp, 1:1",
  lifestyle:
    "Lifestyle photograph of the product in a realistic industrial work context, natural lighting, photorealistic",
  technical:
    "Close-up technical detail photograph, neutral background, sharp focus on materials and finish, photorealistic",
  render_3d: "Clean 3D product render, soft shadows, neutral studio background, high fidelity",
};

async function generateOne(prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY غير مهيأ");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url?.startsWith("data:")) throw new Error("لم يتم إرجاع صورة من النموذج");
  return url;
}

export const generateImageCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        productName: z.string().min(2).max(200),
        context: z.string().max(1000).optional(),
        types: z.array(z.enum(["product_photo", "lifestyle", "technical", "render_3d"])).min(1).max(4),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const images: { url: string; type: string }[] = [];
    const errors: string[] = [];

    for (const type of data.types) {
      try {
        const prompt = `${STYLES[type]}. Product: ${data.productName}.${
          data.context ? ` Context: ${data.context}.` : ""
        } No text, no watermarks, no logos.`;
        images.push({ url: await generateOne(prompt), type });
      } catch (e) {
        errors.push(`${type}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!images.length) throw new Error(errors[0] ?? "تعذر توليد الصور");
    return { images, errors };
  });
