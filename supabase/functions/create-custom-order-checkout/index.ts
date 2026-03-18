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

    if (!STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    if (!SUPABASE_URL) {
      throw new Error("Missing SUPABASE_URL");
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }
    if (!SITE_URL) {
      throw new Error("Missing SITE_URL");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { customOrderId } = await req.json();

    if (!customOrderId) {
      return new Response(
        JSON.stringify({ error: "Missing customOrderId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("custom_orders")
      .select("*")
      .eq("id", customOrderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Custom order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!order.price_dkk || Number(order.price_dkk) <= 0) {
      return new Response(
        JSON.stringify({ error: "This custom order has no valid price yet" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const amountInOre = Math.round(Number(order.price_dkk) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${SITE_URL}/custom-order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/custom-order/${order.id}`,
      customer_email: order.email,
      metadata: {
        custom_order_id: order.id,
        user_id: order.user_id,
        type: "custom_order",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            unit_amount: amountInOre,
            product_data: {
              name: `Custom Order - ${order.model_filename || "3D Print"}`,
              description: order.description?.slice(0, 500) || "LayerLoot custom order",
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
        payment_status: "pending",
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
