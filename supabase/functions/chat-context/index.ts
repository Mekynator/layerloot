import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Returns a real, defensive context for the AI chat.
// Every source is queried independently; a failure in one source never breaks the rest.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const results = await Promise.allSettled([
      adminClient
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle(),

      adminClient
        .from("loyalty_points")
        .select("points")
        .eq("user_id", userId),

      adminClient
        .from("orders")
        .select("id, status, total, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      adminClient
        .from("product_views")
        .select(`
          viewed_at,
          product:products (
            id, name, slug, price, images
          )
        `)
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const pickValue = <T>(idx: number): T | null => {
      const r = results[idx];
      if (r.status !== "fulfilled") return null;
      const data = (r.value as { data?: T | null })?.data ?? null;
      return data;
    };

    const profile = pickValue<{ full_name: string | null }>(0);

    const pointsRows = pickValue<Array<{ points: number | null }>>(1) ?? [];
    const pointsBalance = Array.isArray(pointsRows)
      ? pointsRows.reduce((sum, r) => sum + (Number(r?.points) || 0), 0)
      : 0;

    const lastOrder = pickValue<{
      id: string;
      status: string;
      total: number;
      created_at: string;
    }>(2);

    const lastViewedRow = pickValue<{
      viewed_at: string;
      product: { id: string; name: string; slug: string; price: number; images: string[] | null } | null;
    }>(3);
    const lastViewed = lastViewedRow?.product ?? null;

    const safeContext = {
      user: {
        id: user.id,
        email: user.email,
        name:
          profile?.full_name ||
          (user.user_metadata as Record<string, unknown> | null)?.full_name ||
          "there",
      },
      points: { balance: pointsBalance },
      last_order: lastOrder
        ? {
            id: lastOrder.id,
            status: lastOrder.status,
            total: lastOrder.total,
            created_at: lastOrder.created_at,
          }
        : null,
      last_viewed_product: lastViewed,
    };

    return new Response(JSON.stringify(safeContext), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
