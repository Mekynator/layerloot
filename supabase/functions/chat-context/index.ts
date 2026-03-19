import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const [
      profileRes,
      pointsRes,
      lastOrderRes,
      lastViewedRes,
      recommendedRes,
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("full_name, display_name, last_login_at")
        .eq("id", userId)
        .maybeSingle(),

      adminClient
        .from("loyalty_points")
        .select("balance, earned_total, spent_total")
        .eq("user_id", userId)
        .maybeSingle(),

      adminClient
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      adminClient
        .from("product_views")
        .select(`
          viewed_at,
          product:products (
            id, name, slug, price, image_url
          )
        `)
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      adminClient
        .from("products")
        .select("id, name, slug, price, image_url, category")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const profile = profileRes.data;
    const points = pointsRes.data;
    const lastOrder = lastOrderRes.data;
    const lastViewed = lastViewedRes.data?.product ?? null;
    const recommendedProducts = recommendedRes.data ?? [];

    const safeContext = {
      user: {
        id: user.id,
        email: user.email,
        name:
          profile?.display_name ||
          profile?.full_name ||
          user.user_metadata?.full_name ||
          "there",
        last_login_at: profile?.last_login_at ?? null,
      },
     points: {
  balance,
  earned_total,
  spent_total
}
      last_order: lastOrder
        ? {
            id: lastOrder.id,
            status: lastOrder.status,
            total_amount: lastOrder.total_amount,
            created_at: lastOrder.created_at,
          }
        : null,
      last_viewed_product: lastViewed,
      recommended_products: recommendedProducts,
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
