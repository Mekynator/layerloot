import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
  const { data } = await serviceSupabase.rpc("get_user_points_balance", {
    _user_id: userId,
  });
  return data ?? 0;
}

async function getRecentOrders(userId: string) {
  const { data } = await serviceSupabase
    .from("orders")
    .select("id,status,total,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  return data ?? [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    const token = extractBearerToken(req);
    let userId: string | null = null;

    if (token) {
      const userClient = createUserClient(token);
      const {
        data: { user },
      } = await userClient.auth.getUser();
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
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (/latest order|recent orders|my orders/i.test(lastUserMsg)) {
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
            text: "Here are your most recent orders.",
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
          text: "I can help with your orders, loyalty points, products, and custom prints.",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
