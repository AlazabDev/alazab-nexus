import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, logCall, requireApiKey, corsHeaders } from "@/lib/api-auth";

// Public-safe product columns — cost, internal notes, workflow identity fields
// and internal AI metadata are intentionally excluded.
const PUBLIC_PRODUCT_COLUMNS =
  "id, az_code, egs_code, name_ar, name_en, short_description_ar, short_description_en, description_ar, description_en, brand, item_type, unit_label, category, gpc_class, gpc_family, gpc_segment, gpc_brick_title, operational_track, unit_price, estimated_price, main_image_url, image_url_2, image_url_3, tags, status, updated_at";

// azCode is used in a filter — reject anything outside a strict character set
// to prevent PostgREST filter injection via the path parameter.
const AZ_CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const Route = createFileRoute("/api/public/v1/products/$azCode")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request, params }) => {
        const started = Date.now();
        const auth = await requireApiKey(request, "/api/public/v1/products/$azCode");
        const ep = `/api/public/v1/products/${params.azCode}`;
        if ("error" in auth) {
          await logCall({ consumer: null, request, endpoint: ep, status: 401, startedAt: started });
          return auth.error;
        }

        if (!AZ_CODE_RE.test(params.azCode)) {
          await logCall({
            consumer: auth.consumer,
            request,
            endpoint: ep,
            status: 400,
            startedAt: started,
          });
          return json({ error: "Invalid product code" }, 400, { request });
        }

        // Two separate equality filters avoid string interpolation into an `or()` expression.
        let product: Record<string, unknown> | null = null;
        {
          const { data, error } = await supabaseAdmin
            .from("products")
            .select(PUBLIC_PRODUCT_COLUMNS)
            .eq("az_code", params.azCode)
            .maybeSingle();
          if (error) {
            console.error("[public/products/:azCode] az_code lookup failed", error);
            return json({ error: "Internal server error" }, 500, { request });
          }
          product = data as Record<string, unknown> | null;
        }
        if (!product) {
          const { data, error } = await supabaseAdmin
            .from("products")
            .select(PUBLIC_PRODUCT_COLUMNS)
            .eq("egs_code", params.azCode)
            .maybeSingle();
          if (error) {
            console.error("[public/products/:azCode] egs_code lookup failed", error);
            return json({ error: "Internal server error" }, 500, { request });
          }
          product = data as Record<string, unknown> | null;
        }

        if (!product) {
          await logCall({
            consumer: auth.consumer,
            request,
            endpoint: ep,
            status: 404,
            startedAt: started,
          });
          return json({ error: "Not found" }, 404, { request });
        }

        const productId = product.id as string;
        const [{ data: assets }, { data: prices }] = await Promise.all([
          supabaseAdmin
            .from("product_assets")
            .select("asset_role, sort_order, assets(file_url, file_name, file_type)")
            .eq("product_id", productId)
            .order("sort_order"),
          supabaseAdmin
            .from("prices")
            // purchase_price intentionally excluded — cost data must not leak to public API consumers
            .select("selling_price, currency, status, supplier_id, valid_from, valid_to")
            .eq("product_id", productId),
        ]);
        await logCall({
          consumer: auth.consumer,
          request,
          endpoint: ep,
          status: 200,
          startedAt: started,
        });
        return json({ data: { ...product, assets, prices } }, 200, { request });
      },
    },
  },
});
