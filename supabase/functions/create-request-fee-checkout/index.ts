import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnon);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    const jwt = authHeader.replace("Bearer ", "").trim();
    let userId: string | null = null;

    try {
      const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(jwt);
      if (!claimsErr && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub;
      }
    } catch {
      // fallback below
    }

    if (!userId) {
      const { data: userData, error: userErr } = await supabaseUser.auth.getUser(jwt);
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Invalid or expired JWT" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;
    }

    const body = await req.json();
    const orderId: string | undefined = body?.orderId ?? body?.customOrderId;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId (or customOrderId) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("custom_orders")
      .select("id,user_id,request_fee_amount,request_fee_status,status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.request_fee_status === "paid") {
      return new Response(JSON.stringify({ message: "Already paid", alreadyPaid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const origin = req.headers.get("origin") ?? "https://layerloot.com";
    const fee = Number(order.request_fee_amount ?? 100);
    const amountOre = Math.max(1, Math.round(fee * 100));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "sek",
            unit_amount: amountOre,
            product_data: { name: "Custom 3D Print Request Fee" },
          },
        },
      ],
      metadata: {
        type: "request_fee",
        order_id: order.id,
        user_id: userId,
      },
      success_url: `${origin}/account?requestFee=success&orderId=${order.id}`,
      cancel_url: `${origin}/account?requestFee=cancel&orderId=${order.id}`,
    });

    await supabaseAdmin
      .from("custom_orders")
      .update({
        stripe_checkout_session_id: session.id,
        request_fee_status: "unpaid",
        status: "payment_pending",
      })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
