import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function extractBearerToken(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function resolveUserIdFromToken(token: string | null) {
  if (!token) {
    console.log("No bearer token received");
    return null;
  }

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

    if (error) {
      console.error("auth.getUser failed:", error);
      return null;
    }

    console.log("Resolved user from token:", data.user?.id ?? null);
    return data.user?.id ?? null;
  } catch (err) {
    console.error("resolveUserIdFromToken crashed:", err);
    return null;
  }
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
    console.error("orders query error:", error);
    return [];
  }

  return data ?? [];
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
    const userId = await resolveUserIdFromToken(token);

    console.log("Last user message:", lastUserMsg);
    console.log("Authenticated userId:", userId);

    if (/points|loyalty/i.test(lastUserMsg)) {
      if (!userId) {
        return new Response(
          JSON.stringify({
            payload: {
              text: "I couldn't verify your signed-in account. Please sign in again, then try checking your points.",
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
            suggestions: ["Show my latest order"],
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
              text: "I couldn't verify your signed-in account. Please sign in again, then try viewing your orders.",
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
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        payload: {
          text: userId
            ? "I can help with your account, orders, points, and products."
            : "I can help with products and general shop questions. Sign in for account-specific help.",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("chat function crash:", e);

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
