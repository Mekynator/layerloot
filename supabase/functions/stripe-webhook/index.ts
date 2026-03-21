import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function markVoucherUsed(supabase: any, userVoucherId: string, voucherType: string | undefined) {
  const updates: Record<string, any> = {
    is_used: true,
    used_at: new Date().toISOString(),
  };

  if (voucherType === "gift_card") {
    updates.balance = 0;
  }

  await supabase
    .from("user_vouchers")
    .update(updates)
    .eq("id", userVoucherId)
    .eq("is_used", false);
}

async function ensureCartOrderFromSession(args: {
  stripe: Stripe;
  supabase: any;
  session: Stripe.Checkout.Session;
}) {
  const { stripe, supabase, session } = args;

  const existingOrder = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingOrder.data?.id) {
    return existingOrder.data.id as string;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  let subtotal = 0;
  let shippingCost = 0;
  const orderItems: Array<{
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }> = [];

  for (const item of lineItems.data) {
    const quantity = Math.max(1, item.quantity ?? 1);
    const unitAmount = Number(item.price?.unit_amount ?? 0) / 100;
    const lineTotal = Number(item.amount_total ?? unitAmount * quantity * 100) / 100;
    const expandedProduct = typeof item.price?.product === "object" ? item.price.product : null;
    const productName = item.description || expandedProduct?.name || "LayerLoot Product";
    const productId =
      expandedProduct && typeof expandedProduct.metadata?.product_id === "string" && expandedProduct.metadata.product_id.length > 0
        ? expandedProduct.metadata.product_id
        : null;

    if (productName.toLowerCase() === "shipping") {
      shippingCost += lineTotal;
      continue;
    }

    subtotal += lineTotal;
    orderItems.push({
      product_id: productId,
      product_name: productName,
      quantity,
      unit_price: unitAmount,
      total_price: lineTotal,
    });
  }

  const total = Number(session.amount_total ?? Math.round((subtotal + shippingCost) * 100)) / 100;
  const shippingAddress = session.customer_details?.address
    ? {
        name: session.customer_details?.name ?? null,
        email: session.customer_details?.email ?? null,
        phone: session.customer_details?.phone ?? null,
        address: session.customer_details.address,
      }
    : null;

  const { data: insertedOrder, error: insertError } = await supabase
    .from("orders")
    .insert({
      user_id: session.metadata?.user_id || null,
      status: "pending",
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_address: shippingAddress,
      stripe_checkout_session_id: session.id,
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  const orderId = insertedOrder.id as string;

  if (orderItems.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: orderId,
        ...item,
      })),
    );

    if (itemsError) {
      throw itemsError;
    }
  }

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "pending",
    note: "Stripe checkout completed",
  });

  return orderId;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-02-24.acacia" });
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
      const source = session.metadata?.source;
      const userVoucherId = session.metadata?.user_voucher_id;
      const voucherType = session.metadata?.voucher_type;
      const paymentType = session.metadata?.payment_type;

      if (type === "request_fee" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            request_fee_status: "paid",
            status: "pending_review",
          })
          .eq("id", orderId);
      }

      if (paymentType === "custom_order_final" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            payment_status: "paid",
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
          })
          .eq("id", orderId);
      }

      if (source === "cart") {
        await ensureCartOrderFromSession({ stripe, supabase, session });

        if (userVoucherId) {
          await markVoucherUsed(supabase, userVoucherId, voucherType);
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const type = session.metadata?.type;
      const orderId = session.metadata?.order_id;
      const paymentType = session.metadata?.payment_type;

      if (type === "request_fee" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            request_fee_status: "failed",
            status: "pending",
          })
          .eq("id", orderId);
      }

      if (paymentType === "custom_order_final" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            payment_status: "awaiting_payment",
          })
          .eq("id", orderId);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
