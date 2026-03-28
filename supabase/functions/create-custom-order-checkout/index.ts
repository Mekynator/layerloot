import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SITE_URL = Deno.env.get("SITE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
    if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    if (!SITE_URL) throw new Error("Missing SITE_URL");
    if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return json({ error: "User not authenticated" }, 401);
    }

    const { customOrderId } = await req.json();

    if (!customOrderId) {
      return json({ error: "Missing customOrderId" }, 400);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("custom_orders")
      .select("*")
      .eq("id", customOrderId)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      return json({ error: "Custom order not found" }, 404);
    }

    if (order.user_id && order.user_id !== user.id) {
      return json({ error: "You do not have access to this custom order" }, 403);
    }

    const baseAmount = Number(order.final_agreed_price ?? order.quoted_price ?? 0);

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return json({ error: "This custom order has no valid agreed price yet" }, 400);
    }

    const requestFeeAmount = Number(order.request_fee_amount ?? 100);
    const shouldDeductFee =
      order.request_fee_status === "paid" && Number.isFinite(requestFeeAmount) && requestFeeAmount > 0;

    const payableAmount = Math.max(0, baseAmount - (shouldDeductFee ? requestFeeAmount : 0));
    const amountInOre = Math.round(payableAmount * 100);

    if (!Number.isInteger(amountInOre) || amountInOre < 0) {
      return json({ error: "Calculated payment amount is invalid" }, 400);
    }

    if (amountInOre === 0) {
      const paidUpdatePayload: Record<string, unknown> = {
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (["payment_pending", "pending_review", "quoted", "accepted", "in_progress"].includes(order.status)) {
        paidUpdatePayload.status = "accepted";
      }

      const { error: paidUpdateError } = await supabaseAdmin
        .from("custom_orders")
        .update(paidUpdatePayload)
        .eq("id", order.id);

      if (paidUpdateError) {
        console.error("Auto-paid update error:", paidUpdateError);
        throw paidUpdateError;
      }

      return json({
        url: null,
        autoPaid: true,
        message: "No payment required. Request fee covered the full amount.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${SITE_URL}/account?custom_payment_success=1&order_id=${order.id}`,
      cancel_url: `${SITE_URL}/account?custom_payment_cancelled=1&order_id=${order.id}`,
      customer_email: order.email ?? user.email ?? undefined,
      metadata: {
        custom_order_id: String(order.id),
        user_id: String(order.user_id ?? user.id),
        payment_type: "custom_order_final",
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
                : order.description?.slice(0, 500) || "LayerLoot custom order",
              metadata: {
                custom_order_id: String(order.id),
              },
            },
          },
        },
      ],
    });

    const { error: updateError } = await supabaseAdmin
      .from("custom_orders")
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: "awaiting_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Checkout session update error:", updateError);
      throw updateError;
    }

    return json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("create-custom-order-checkout fatal error:", error);

    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
