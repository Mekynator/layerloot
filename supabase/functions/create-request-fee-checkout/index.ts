import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SITE_URL = Deno.env.get("SITE_URL");

    if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
    if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    if (!SITE_URL) throw new Error("Missing SITE_URL");

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const requestFee = Number(order.request_fee_amount ?? 100);

    if (requestFee <= 0) {
      return new Response(JSON.stringify({ error: "Invalid request fee amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.request_fee_status === "paid") {
      return new Response(JSON.stringify({ error: "Request fee already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountInOre = Math.round(requestFee * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${SITE_URL}/account?request_fee_success=1&order_id=${order.id}`,
      cancel_url: `${SITE_URL}/create-your-own?request_fee_cancelled=1`,
      customer_email: order.email,
      metadata: {
        custom_order_id: order.id,
        payment_type: "request_fee",
        user_id: order.user_id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            unit_amount: amountInOre,
            product_data: {
              name: "Custom Order Request Fee",
              description: `Request fee for custom order ${order.model_filename || order.id}`,
              metadata: {
                custom_order_id: order.id,
                payment_type: "request_fee",
              },
            },
          },
        },
      ],
    });

    const { error: updateError } = await supabase
      .from("custom_orders")
      .update({
        status: "awaiting_request_fee",
        stripe_checkout_session_id: session.id,
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
      }
    );
  }
});
