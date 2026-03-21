import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CheckoutItem = {
  id?: string;
  product_id?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
  material?: string | null;
  color?: string | null;
  size?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeSecretKey === null || stripeSecretKey === undefined || stripeSecretKey.length === 0) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? (body.items as CheckoutItem[]) : [];
    const shippingCost = Math.max(0, Number(body?.shippingCost ?? 0));
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "http://localhost:5173";
    const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;

    const successUrl = typeof body?.success_url === "string" && body.success_url.trim().length > 0
      ? body.success_url
      : normalizedOrigin + "/checkout/success";

    const cancelUrl = typeof body?.cancel_url === "string" && body.cancel_url.trim().length > 0
      ? body.cancel_url
      : normalizedOrigin + "/cart";

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const name = (item.name || "LayerLoot Product").slice(0, 120);
      const qty = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
      const unitAmount = Math.max(0, Math.round(Number(item.price ?? 0) * 100));
      const attrs = [item.material, item.color, item.size].filter(Boolean).join(" - ");

      return {
        quantity: qty,
        price_data: {
          currency: "dkk",
          unit_amount: unitAmount,
          product_data: {
            name,
            description: attrs || undefined,
            images: item.image ? [item.image] : undefined,
            metadata: {
              product_id: String(item.product_id || item.id || ""),
            },
          },
        },
      };
    });

    if (shippingCost > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "dkk",
          unit_amount: Math.round(shippingCost * 100),
          product_data: {
            name: "Shipping",
          },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      metadata: {
        discount_code: String(body?.discountCode || ""),
        source: "cart",
      },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout error:", error);

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
