import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SITE_URL = (Deno.env.get("SITE_URL") || "https://layerloot.com").replace(/\/$/, "");

    if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
    if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customOrderId } = await req.json();

    if (!customOrderId) {
      return new Response(JSON.stringify({ error: "Missing customOrderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("custom_orders")
      .select("*")
      .eq("id", customOrderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Custom order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ alreadyPaid: true, message: "This custom order is already paid." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseAmount = Number(order.final_agreed_price ?? order.quoted_price ?? 0);

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return new Response(JSON.stringify({ error: "This custom order has no valid agreed price yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestFeeAmount = Number(order.request_fee_amount ?? 100);
    const shouldDeductFee =
      order.request_fee_status === "paid" && Number.isFinite(requestFeeAmount) && requestFeeAmount > 0;

    const payableAmount = Math.max(0, baseAmount - (shouldDeductFee ? requestFeeAmount : 0));
    const amountInOre = Math.round(payableAmount * 100);

    if (amountInOre <= 0) {
      const { error: paidUpdateError } = await supabase
        .from("custom_orders")
        .update({
          payment_status: "paid",
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (paidUpdateError) throw paidUpdateError;

      return new Response(
        JSON.stringify({
          url: null,
          autoPaid: true,
          message: "No payment required. Request fee covered the full amount.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${SITE_URL}/account?custom_payment_success=1&order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/account?custom_payment_cancelled=1&order_id=${order.id}`,
      customer_email: order.email,
      metadata: {
        custom_order_id: order.id,
        order_id: order.id,
        user_id: order.user_id,
        payment_type: "custom_order_final",
        type: "custom_order_final",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            unit_amount: amountInOre,
            product_data: {
              name: `Custom Order - ${order.model_filename || "3D Print"}`,
              description: shouldDeductFee
                ? `Final payment after ${requestFeeAmount.toFixed(2)} kr request fee deduction`
                : (order.description?.slice(0, 500) || "LayerLoot custom order"),
              metadata: {
                custom_order_id: order.id,
              },
            },
          },
        },
      ],
    });

    const { error: updateError } = await supabase
      .from("custom_orders")
      .update({
        stripe_checkout_session_id: session.id,
        final_agreed_price: order.final_agreed_price ?? order.quoted_price,
        payment_status: "awaiting_payment",
      })
      .eq("id", order.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
      },
    );
  }
});
