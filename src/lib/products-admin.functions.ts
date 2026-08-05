import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DeleteSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500),
});

export const deleteProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Detach references that are not cascade-deleted
    await supabaseAdmin
      .from("supplier_inventory")
      .update({ internal_product_id: null })
      .in("internal_product_id", data.productIds);

    await supabaseAdmin
      .from("products")
      .update({ default_price_id: null })
      .in("id", data.productIds);

    const { data: deleted, error } = await supabaseAdmin
      .from("products")
      .delete()
      .in("id", data.productIds)
      .select("id, az_code");

    if (error) throw new Error(error.message);

    return { deleted: deleted?.length ?? 0, codes: (deleted ?? []).map((d) => d.az_code) };
  });
