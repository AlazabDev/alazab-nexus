import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Manufacturing order status state machine — only transitions listed here are allowed.
// Any other transition is rejected server-side, preventing a viewer or malicious client
// from jumping "pending" straight to "delivered" or reopening a cancelled order.
const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["materials_requested", "cancelled"],
  materials_requested: ["in_production", "cancelled"],
  in_production: ["quality_check", "cancelled"],
  quality_check: ["ready", "in_production", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const NEXT_STATUSES = new Set(Object.keys(STATUS_TRANSITIONS));

export const updateManufacturingOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "materials_requested",
          "in_production",
          "quality_check",
          "ready",
          "delivered",
          "cancelled",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Role guard — only editors/admins may mutate order status.
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["editor", "admin"])
      .maybeSingle();
    if (!roleRow) {
      throw new Error("Forbidden: editor or admin role required");
    }

    // Load current status to enforce the state machine.
    const { data: current, error: readErr } = await supabase
      .from("manufacturing_orders")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) {
      console.error("[manufacturing-orders] read failed", readErr);
      throw new Error("Failed to load order");
    }
    if (!current) throw new Error("Order not found");

    const currentStatus = current.status ?? "pending";
    if (!NEXT_STATUSES.has(currentStatus)) {
      throw new Error(`Unknown current status: ${currentStatus}`);
    }
    const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
    if (data.status !== currentStatus && !allowed.includes(data.status)) {
      throw new Error(`Invalid transition: ${currentStatus} → ${data.status}`);
    }

    const updates: {
      status: typeof data.status;
      actual_start_date?: string;
      actual_completion_date?: string;
    } = { status: data.status };
    const today = new Date().toISOString().split("T")[0];
    if (data.status === "in_production") updates.actual_start_date = today;
    if (data.status === "delivered") updates.actual_completion_date = today;

    const { error: updErr } = await supabase
      .from("manufacturing_orders")
      .update(updates)
      .eq("id", data.id);

    if (updErr) {
      console.error("[manufacturing-orders] update failed", updErr);
      throw new Error("Failed to update order");
    }

    return { ok: true, id: data.id, status: data.status };
  });
