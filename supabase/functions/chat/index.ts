import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function extractBearerToken(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function createUserClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

async function getPoints(userId: string) {
  const { data, error } = await serviceSupabase.rpc("get_user_points_balance", {
    _user_id: userId,
  });

  if (error) {
    console.error("get_user_points_balance error:", error);
    return 0;
  }

  return data ?? 0;
}

async function getRecentOrders(userId: string) {
  const { data, error } = await serviceSupabase
    .from("orders")
    .select("id,status,total,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("getRecentOrders error:", error);
    return [];
  }

  return data ?? [];
}

async function getCoupons(userId: string) {
  const { data, error } = await serviceSupabase
    .from("coupons")
    .select("code,description,discount_type,discount_value,expires_at,is_active")
    .eq("is_active", true)
    .limit(5);

  if (error) {
    console.error("getCoupons error:", error);
    return [];
  }

  return (data ?? []).map((coupon: any) => ({
    code: coupon.code,
    description: coupon.description ?? undefined,
    discountText:
      coupon.discount_type && coupon.discount_value != null
        ? `${coupon.discount_value}${coupon.discount_type === "percent" ? "%" : " DKK"} off`
        : undefined,
    expiresAt: coupon.expires_at ?? undefined,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    const token = extractBearerToken(req);
    let userId: string | null = null;

    if (token) {
      const userClient = createUserClient(token);
      const {
        data: { user },
        error,
      } = await userClient.auth.getUser();

      if (error) {
        console.error("auth.getUser error:", error);
      }

      userId = user?.id ?? null;
    }

    if (/points|loyalty/i.test(lastUserMsg)) {
      if (!userId) {
        return new Response(
          JSON.stringify({
            payload: {
              text: "Please sign in to see your loyalty points.",
              links: [{ label: "Open account", url: "/account" }],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const points = await getPoints(userId);

      return new Response(
        JSON.stringify({
          payload: {
            text: `You currently have ${points} loyalty points.`,
            points,
            suggestions: ["Show my latest order", "Do I have active coupons?"],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (/latest order|recent orders|my orders|order status/i.test(lastUserMsg)) {
      if (!userId) {
        return new Response(
          JSON.stringify({
            payload: {
              text: "Please sign in to view your orders.",
              links: [{ label: "Open account", url: "/account" }],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const orders = await getRecentOrders(userId);

      return new Response(
        JSON.stringify({
          payload: {
            text: orders.length
              ? "Here are your most recent orders."
              : "I couldn't find any recent orders on your account.",
            orders: orders.map((o: any) => ({
              orderNumber: o.id,
              status: o.status,
              total: o.total,
              createdAt: o.created_at,
              url: "/account",
            })),
            suggestions: ["Check my points", "Do I have active coupons?"],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (/coupon|coupons|discount/i.test(lastUserMsg)) {
      const coupons = await getCoupons(userId ?? "guest");

      return new Response(
        JSON.stringify({
          payload: {
            text: coupons.length
              ? "Here are the currently available coupons."
              : "I couldn't find any active coupons right now.",
            coupons,
            suggestions: ["Check my points", "Show best sellers"],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (/best sellers|bestsellers|best seller/i.test(lastUserMsg)) {
      return new Response(
        JSON.stringify({
          payload: {
            text: "You can browse our best sellers right here.",
            links: [{ label: "Open products", url: "/products", description: "Explore popular LayerLoot items." }],
            suggestions: ["Find gifts under 200 DKK", "Custom print help"],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        payload: {
          text: userId
            ? "I can help with your orders, loyalty points, coupons, products, and custom prints."
            : "I can help with products, custom prints, shipping, and general shop questions. Sign in for points and order help.",
          suggestions: userId
            ? ["Check my points", "Show my latest order", "Do I have active coupons?"]
            : ["Show best sellers", "Shipping information", "Custom print help"],
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("chat function error:", e);

    return new Response(
      JSON.stringify({
        payload: {
          text: "I can chat, but I couldn't access your account details right now.",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
