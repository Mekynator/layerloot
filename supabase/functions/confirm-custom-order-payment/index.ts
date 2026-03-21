import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
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

async function awardLoyaltyPointsOnce(args: {
  supabase: any;
  userId: string | null | undefined;
  points: number;
  reason: string;
}) {
  const { supabase, userId, points, reason } = args;

  if (!userId || points <= 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("loyalty_points")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", reason)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return;

  const { error: insertError } = await supabase.from("loyalty_points").insert({
    user_id: userId,
    points,
    reason,
  });

  if (insertError) throw insertError;
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-02-24.acacia" });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId : null;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    const paymentKind = body?.paymentKind === "final" ? "final" : "request_fee";

    if (!orderId) {
      return jsonResponse({ error: "orderId is required" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("custom_orders")
      .select("id, user_id, stripe_checkout_session_id, request_fee_status, payment_status, request_fee_amount")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    if (order.user_id !== user.id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const checkoutSessionId = sessionId || order.stripe_checkout_session_id;
    if (!checkoutSessionId) {
      return jsonResponse({ error: "Missing checkout session" }, 400);
    }

    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const isPaid = session.payment_status === "paid" || session.status === "complete";

    if (!isPaid) {
      return jsonResponse({ verified: false, status: session.status, payment_status: session.payment_status }, 200);
    }

    if (paymentKind === "request_fee") {
      const { error: updateError } = await supabase
        .from("custom_orders")
        .update({
          request_fee_status: "paid",
          status: "pending_review",
          stripe_checkout_session_id: checkoutSessionId,
        })
        .eq("id", orderId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      const requestFeePaid = Number(order.request_fee_amount ?? (Number(session.amount_total ?? 0) / 100));
      const pointsEarned = Math.floor(requestFeePaid / 4);
      await awardLoyaltyPointsOnce({
        supabase,
        userId: user.id,
        points: pointsEarned,
        reason: `Custom request fee #${orderId.slice(0, 8)}`,
      });
    } else {
      const { error: updateError } = await supabase
        .from("custom_orders")
        .update({
          payment_status: "paid",
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: checkoutSessionId,
        })
        .eq("id", orderId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      const pointsEarned = Math.floor(Number(session.amount_total ?? 0) / 100 / 4);
      await awardLoyaltyPointsOnce({
        supabase,
        userId: user.id,
        points: pointsEarned,
        reason: `Custom order payment #${orderId.slice(0, 8)}`,
      });
    }

    return jsonResponse({ verified: true, paymentKind, orderId, sessionId: checkoutSessionId });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
