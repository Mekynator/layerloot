import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const FREE_SHIPPING_THRESHOLD = 500;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractBearerToken(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function resolveUserFromToken(token: string | null) {
  if (!token) return null;

  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await authClient.auth.getUser();
    if (error || !data.user) {
      console.error("auth.getUser failed:", error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("resolveUserFromToken crashed:", error);
    return null;
  }
}

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getDisplayName(user: any, profile: any) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (typeof user?.email === "string" ? user.email.split("@")[0] : null) ||
    "there"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = extractBearerToken(req);
    const user = await resolveUserFromToken(token);

    if (!user?.id) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const cart = body?.cart ?? {};
    const cartTotal = Number(cart.total ?? 0);
    const cartItemCount = Number(cart.item_count ?? 0);

    const [profileRes, pointsRes, lastOrderRes, lastViewedRes, recommendedRes] = await Promise.all([
      serviceSupabase
        .from("profiles")
        .select("id, full_name, display_name, username")
        .eq("id", user.id)
        .maybeSingle(),

      serviceSupabase
        .from("user_points")
        .select("balance, earned_total, spent_total, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),

      serviceSupabase
        .from("orders")
        .select("id, status, total, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      serviceSupabase
        .from("product_views")
        .select(`
          viewed_at,
          product:products (
            id,
            name,
            slug,
            price,
            image_url,
            category
          )
        `)
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      serviceSupabase
        .from("products")
        .select("id, name, slug, price, image_url, category")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const freeShippingGap = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email ?? null,
        name: getDisplayName(user, profileRes.data),
        last_sign_in_at: user.last_sign_in_at ?? null,
      },
      points: {
        balance: pointsRes.data?.balance ?? 0,
        earned_total: pointsRes.data?.earned_total ?? 0,
        spent_total: pointsRes.data?.spent_total ?? 0,
        updated_at: pointsRes.data?.updated_at ?? null,
      },
      last_order: lastOrderRes.data ?? null,
      last_viewed_product: lastViewedRes.data?.product
        ? {
            ...(lastViewedRes.data.product as Record<string, unknown>),
            viewed_at: lastViewedRes.data.viewed_at,
          }
        : null,
      recommended_products: recommendedRes.data ?? [],
      cart: {
        total: cartTotal,
        item_count: cartItemCount,
        free_shipping_gap: freeShippingGap,
        qualifies_for_free_shipping: freeShippingGap <= 0 && cartItemCount > 0,
      },
    });
  } catch (error) {
    console.error("chat-context crash:", error);
    return jsonResponse({ error: "Failed to build chat context" }, 500);
  }
});
