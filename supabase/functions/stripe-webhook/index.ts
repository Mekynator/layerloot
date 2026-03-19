import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SupabaseAdminClient = ReturnType<typeof createClient>;

async function addPointsForOrder(adminClient: SupabaseAdminClient, userId: string, amountDKK: number, orderId: string) {
  const points = Math.floor(amountDKK / 4);

  if (points <= 0) return;

  const rewardReason = `Order reward (${orderId})`;

  const { data: existingReward, error: existingError } = await adminClient
    .from("loyalty_points")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", rewardReason)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check existing loyalty reward:", existingError);
    throw existingError;
  }

  if (existingReward) {
    console.log(`Points already granted for order ${orderId}`);
    return;
  }

  const { error } = await adminClient.from("loyalty_points").insert({
    user_id: userId,
    points,
    reason: rewardReason,
  });

  if (error) {
    console.error("Failed to insert loyalty points:", error);
    throw error;
  }

  console.log(`Added ${points} points to user ${userId} for order ${orderId}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
    if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customOrderId = session.metadata?.custom_order_id;
        const paymentType = session.metadata?.payment_type;
        const userId = session.metadata?.user_id;
        const amountDKK = Number((session.amount_total ?? 0) / 100);

        if (!customOrderId) {
          console.log("checkout.session.completed without custom_order_id");
          break;
        }

        if (paymentType === "request_fee") {
          const { error } = await supabase
            .from("custom_orders")
            .update({
              request_fee_status: "paid",
              status: "submitted",
              stripe_checkout_session_id: session.id,
            })
            .eq("id", customOrderId);

          if (error) throw error;
          break;
        }

        const { error } = await supabase
          .from("custom_orders")
          .update({
            payment_status: "paid",
            status: "paid",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
            paid_at: new Date().toISOString(),
          })
          .eq("id", customOrderId);

        if (error) throw error;

        if (!userId) {
          console.log(`Paid order ${customOrderId} has no user_id metadata. Skipping loyalty points.`);
          break;
        }

        await addPointsForOrder(supabase, userId, amountDKK, customOrderId);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customOrderId = session.metadata?.custom_order_id;
        const paymentType = session.metadata?.payment_type;

        if (!customOrderId) break;

        if (paymentType === "request_fee") {
          const { error } = await supabase
            .from("custom_orders")
            .update({
              request_fee_status: "unpaid",
              status: "awaiting_request_fee",
              stripe_checkout_session_id: session.id,
            })
            .eq("id", customOrderId);

          if (error) throw error;
          break;
        }

        const { error } = await supabase
          .from("custom_orders")
          .update({
            payment_status: "failed",
            stripe_checkout_session_id: session.id,
          })
          .eq("id", customOrderId);

        if (error) throw error;
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customOrderId = session.metadata?.custom_order_id;
        const paymentType = session.metadata?.payment_type;

        if (!customOrderId) break;

        if (paymentType === "request_fee") {
          const { error } = await supabase
            .from("custom_orders")
            .update({
              request_fee_status: "unpaid",
              status: "awaiting_request_fee",
              stripe_checkout_session_id: session.id,
            })
            .eq("id", customOrderId);

          if (error) throw error;
          break;
        }

        const { error } = await supabase
          .from("custom_orders")
          .update({
            payment_status: "unpaid",
            stripe_checkout_session_id: session.id,
          })
          .eq("id", customOrderId);

        if (error) throw error;
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stripe-webhook error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown webhook error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
