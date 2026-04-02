import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AppliedSavingMeta = {
  code: string;
  category: "discount" | "voucher" | "gift_card" | "free_shipping";
  appliedAmount: number;
  userVoucherId?: string;
  voucherType?: string;
};

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

async function deductGiftCardBalance(supabase: any, userVoucherId: string, amount: number) {
  // Get current balance
  const { data: row } = await supabase
    .from("user_vouchers")
    .select("balance, vouchers(discount_value)")
    .eq("id", userVoucherId)
    .maybeSingle();

  if (!row) return;

  const currentBalance = Number(row.balance ?? row.vouchers?.discount_value ?? 0);
  const newBalance = Math.max(0, currentBalance - amount);

  const updates: Record<string, any> = {
    balance: newBalance,
  };

  // If balance is zero, mark as used
  if (newBalance <= 0) {
    updates.is_used = true;
    updates.used_at = new Date().toISOString();
  }

  await supabase
    .from("user_vouchers")
    .update(updates)
    .eq("id", userVoucherId);
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
      const paymentType = session.metadata?.payment_type;
      const orderId = session.metadata?.order_id;
      const customOrderId = session.metadata?.custom_order_id;
      const source = session.metadata?.source;

      // Handle request fee payment (100 kr)
      if (type === "request_fee" && orderId) {
        await supabase
          .from("custom_orders")
          .update({
            request_fee_status: "paid",
            payment_status: "unpaid",
            status: "pending",
          })
          .eq("id", orderId);
      }

      // Handle custom order final payment (quote amount)
      if (paymentType === "custom_order_final" && customOrderId) {
        await supabase
          .from("custom_orders")
          .update({
            payment_status: "paid",
            status: "paid",
            production_status: "queued",
          })
          .eq("id", customOrderId);
      }

      // Handle cart checkout with multi-savings
      if (source === "cart") {
        // Parse new multi-savings metadata
        let appliedSavings: AppliedSavingMeta[] = [];
        try {
          const raw = session.metadata?.applied_savings;
          if (raw) appliedSavings = JSON.parse(raw);
        } catch {
          // Fallback to legacy single voucher
        }

        if (appliedSavings.length > 0) {
          // Process each applied saving
          for (const saving of appliedSavings) {
            if (!saving.userVoucherId) continue;

            if (saving.category === "gift_card") {
              // Partial deduction for gift cards
              await deductGiftCardBalance(supabase, saving.userVoucherId, saving.appliedAmount);
            } else {
              // Mark discount/voucher/free_shipping as fully used
              await markVoucherUsed(supabase, saving.userVoucherId, saving.voucherType);
            }
          }
        } else {
          // Legacy: single voucher handling
          const userVoucherId = session.metadata?.user_voucher_id;
          const voucherType = session.metadata?.voucher_type;
          if (userVoucherId) {
            await markVoucherUsed(supabase, userVoucherId, voucherType);
          }
        }
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
            payment_status: "failed",
            status: "pending",
          })
          .eq("id", orderId);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
