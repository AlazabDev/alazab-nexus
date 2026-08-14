import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STATUSES = ["approved", "needs_review"] as const;

const BulkSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  uncategorized: z.boolean().optional(),
  fromStatus: z.enum(STATUSES),
  toStatus: z.enum(STATUSES),
  note: z.string().max(500).optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

/** Per-category counts of approved / needs_review / other products. */
export const getCategoryApprovalStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data: categories, error: catErr }] = await Promise.all([
      supabase.from("categories").select("id, name_ar, name_en").order("name_ar"),
    ]);
    if (catErr) throw new Error(catErr.message);

    type Row = { category_id: string | null; status: string };
    const rows: Row[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("products")
        .select("category_id, status")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as Row[]));
      if (!data || data.length < PAGE) break;
      if (from > 100000) break;
    }

    const buckets = new Map<string, { approved: number; needs_review: number; other: number }>();
    for (const r of rows) {
      const key = r.category_id ?? "__none__";
      const b = buckets.get(key) ?? { approved: 0, needs_review: 0, other: 0 };
      if (r.status === "approved") b.approved++;
      else if (r.status === "needs_review") b.needs_review++;
      else b.other++;
      buckets.set(key, b);
    }

    const list = (categories ?? []).map((c: any) => ({
      id: c.id as string,
      name: (c.name_ar || c.name_en || "—") as string,
      ...(buckets.get(c.id) ?? { approved: 0, needs_review: 0, other: 0 }),
    }));

    const none = buckets.get("__none__");
    if (none && none.approved + none.needs_review + none.other > 0) {
      list.push({ id: "__none__", name: "بدون فئة", ...none });
    }

    const totals = list.reduce(
      (acc, c) => ({
        approved: acc.approved + c.approved,
        needs_review: acc.needs_review + c.needs_review,
        other: acc.other + c.other,
      }),
      { approved: 0, needs_review: 0, other: 0 },
    );

    return { categories: list, totals };
  });

/** Bulk switch products between approved and needs_review for one category (or all). */
export const bulkSetProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    if (data.fromStatus === data.toStatus) throw new Error("الحالتان متطابقتان");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("products")
      .update({
        status: data.toStatus,
        approved_at: data.toStatus === "approved" ? new Date().toISOString() : null,
        approved_by: data.toStatus === "approved" ? userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", data.fromStatus);

    if (data.uncategorized) q = q.is("category_id", null);
    else if (data.categoryId) q = q.eq("category_id", data.categoryId);

    const { data: updated, error } = await q.select("id");
    if (error) throw new Error(error.message);

    const count = updated?.length ?? 0;

    await supabaseAdmin.from("audit_logs").insert({
      entity_type: "products_bulk_status",
      entity_id: data.categoryId ?? null,
      action: `${data.fromStatus} → ${data.toStatus}`,
      old_value: { status: data.fromStatus },
      new_value: {
        status: data.toStatus,
        count,
        scope: data.uncategorized ? "uncategorized" : (data.categoryId ?? "all"),
        note: data.note ?? null,
      },
      created_by: userId,
    });

    return { count };
  });

/** Recent bulk-approval change log. */
export const getBulkStatusHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, new_value, created_at, created_by, entity_id")
      .eq("entity_type", "products_bulk_status")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
