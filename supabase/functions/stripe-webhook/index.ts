import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing signature", { status: 400 });

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
    } catch (err) {
      return new Response(`Webhook Error: ${String(err)}`, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const type = session.metadata?.type;
      const orderId = session.metadata?.order_id;

      if (type === "request_fee" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            request_fee_status: "paid",
            request_fee_paid_at: new Date().toISOString(),
            status: "pending_review", // ONLY now visible to admin review
            stripe_payment_intent_id: String(session.payment_intent ?? ""),
          })
          .eq("id", orderId);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const type = session.metadata?.type;
      const orderId = session.metadata?.order_id;

      if (type === "request_fee" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            request_fee_status: "failed",
            status: "payment_pending",
          })
          .eq("id", orderId);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
