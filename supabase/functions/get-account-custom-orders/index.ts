import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const normalizedEmail = (user.email || "").trim();

    const [ownedOrdersRes, emailOrdersRes] = await Promise.all([
      serviceClient
        .from("custom_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("request_fee_status", "paid")
        .order("created_at", { ascending: false }),
      normalizedEmail
        ? serviceClient
            .from("custom_orders")
            .select("*")
            .ilike("email", normalizedEmail)
            .eq("request_fee_status", "paid")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (ownedOrdersRes.error) throw ownedOrdersRes.error;
    if (emailOrdersRes.error) throw emailOrdersRes.error;

    const ordersMap = new Map<string, any>();
    [...(ownedOrdersRes.data ?? []), ...(emailOrdersRes.data ?? [])].forEach((order) => {
      ordersMap.set(order.id, order);
    });
    const orders = Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    let messages: any[] = [];

    if (orders.length > 0) {
      const { data: messageRows, error: messageError } = await serviceClient
        .from("custom_order_messages")
        .select("*")
        .in("custom_order_id", orders.map((order) => order.id))
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;
      messages = messageRows ?? [];
    }

    return jsonResponse({ orders, messages });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
