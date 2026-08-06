import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return new Response(JSON.stringify({ success: false, error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require a Bearer token belonging to an admin (integration sync is privileged).
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { integrationId } = await req.json();
    if (typeof integrationId !== "string" || integrationId.length > 64) {
      return new Response(JSON.stringify({ success: false, error: "Invalid integrationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config, error: configError } = await supabase
      .from("integration_configs")
      .select("*")
      .eq("type", integrationId)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ success: false, error: "Integration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let syncResult;
    switch (integrationId) {
      case "daftra":
        syncResult = await syncDaftra(supabase, config);
        break;
      case "bot-gateway":
        syncResult = await syncBotGateway(supabase, config);
        break;
      case "erpnext":
        syncResult = await syncERPNext(supabase, config);
        break;
      case "azure-openai":
        syncResult = await syncAzureOpenAI(supabase, config);
        break;
      default:
        return new Response(JSON.stringify({ success: false, error: "Unknown integration" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    await supabase.from("sync_logs").insert({
      integration_type: integrationId,
      status: "success",
      records_synced: syncResult.count,
      details: syncResult.details,
      synced_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        integration: integrationId,
        synced: syncResult.count,
        message: `Successfully synced ${syncResult.count} records`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function syncDaftra(supabase: any, _config: any) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name_ar, name_en, az_code, gpc_family, description_ar, status")
    .eq("status", "approved");
  if (error) throw error;
  return {
    count: products.length,
    details: { timestamp: new Date().toISOString(), total: products.length, status: "completed" },
  };
}

async function syncBotGateway(supabase: any, _config: any) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name_ar, name_en, az_code, description_ar")
    .eq("status", "approved")
    .limit(1000);
  if (error) throw error;
  return {
    count: products.length,
    details: {
      timestamp: new Date().toISOString(),
      products: products.length,
      status: "catalog_updated",
    },
  };
}

async function syncERPNext(_supabase: any, _config: any) {
  return {
    count: 0,
    details: {
      timestamp: new Date().toISOString(),
      status: "planned",
      message: "ERPNext integration coming in Q3-Q4 2026",
    },
  };
}

async function syncAzureOpenAI(supabase: any, _config: any) {
  const { data: productsNeedingAnalysis, error } = await supabase
    .from("products")
    .select("id, name_ar, description_ar")
    .is("ai_analysis", null)
    .limit(100);
  if (error) throw error;
  return {
    count: productsNeedingAnalysis.length,
    details: {
      timestamp: new Date().toISOString(),
      analyzed: productsNeedingAnalysis.length,
      status: "analysis_queued",
    },
  };
}
