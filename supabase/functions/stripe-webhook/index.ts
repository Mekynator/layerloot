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
  const { data: row } = await supabase
    .from("user_vouchers")
    .select("balance, vouchers(discount_value)")
    .eq("id", userVoucherId)
    .maybeSingle();
  if (!row) return;
  const currentBalance = Number(row.balance ?? row.vouchers?.discount_value ?? 0);
  const newBalance = Math.max(0, currentBalance - amount);
  const updates: Record<string, any> = { balance: newBalance };
  if (newBalance <= 0) {
    updates.is_used = true;
    updates.used_at = new Date().toISOString();
  }
  await supabase
    .from("user_vouchers")
    .update(updates)
    .eq("id", userVoucherId);
}

async function triggerEmail(supabase: any, templateName: string, recipientEmail: string, idempotencyKey: string, templateData?: Record<string, any>) {
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail,
        idempotencyKey,
        templateData: templateData || {},
      },
    });
    console.log(`Email triggered: ${templateName} → ${recipientEmail}`);
  } catch (err) {
    console.error(`Failed to trigger email ${templateName}:`, err);
  }
}

async function getCustomerEmail(supabase: any, userId: string): Promise<{ email: string; name: string } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

  // Get email from auth — use admin API via service role
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  if (!authData?.user?.email) return null;
  return { email: authData.user.email, name: data?.full_name || '' };
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

        // Send custom order confirmation email
        const { data: co } = await supabase.from("custom_orders").select("email, name").eq("id", orderId).maybeSingle();
        if (co?.email) {
          await triggerEmail(supabase, 'custom-order-confirmation', co.email, `custom-order-confirm-${orderId}`, {
            name: co.name,
            requestNumber: orderId.slice(0, 8),
          });
        }
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

        // Send payment confirmation email
        const { data: co } = await supabase.from("custom_orders").select("email, name, quoted_price").eq("id", customOrderId).maybeSingle();
        if (co?.email) {
          await triggerEmail(supabase, 'payment-confirmation', co.email, `payment-confirm-custom-${customOrderId}`, {
            name: co.name,
            orderNumber: customOrderId.slice(0, 8),
            totalPaid: co.quoted_price ? `${co.quoted_price} kr` : undefined,
          });
        }
      }

      // Handle cart checkout with multi-savings
      if (source === "cart") {
        // Parse new multi-savings metadata
        let appliedSavings: AppliedSavingMeta[] = [];
        try {
          const raw = session.metadata?.applied_savings;
          if (raw) appliedSavings = JSON.parse(raw);
        } catch { /* Fallback to legacy single voucher */ }

        if (appliedSavings.length > 0) {
          for (const saving of appliedSavings) {
            if (!saving.userVoucherId) continue;
            if (saving.category === "gift_card") {
              await deductGiftCardBalance(supabase, saving.userVoucherId, saving.appliedAmount);
            } else {
              await markVoucherUsed(supabase, saving.userVoucherId, saving.voucherType);
            }
          }
        } else {
          const userVoucherId = session.metadata?.user_voucher_id;
          const voucherType = session.metadata?.voucher_type;
          if (userVoucherId) {
            await markVoucherUsed(supabase, userVoucherId, voucherType);
          }
        }

        // Send order confirmation + receipt emails
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerName = session.customer_details?.name || '';
        const sessionId = session.id;

        if (customerEmail) {
          // Generate invoice PDF
          let invoiceUrl: string | undefined;
          try {
            const invoiceRes = await supabase.functions.invoke('generate-invoice', {
              body: { order_id: sessionId },
            });
            invoiceUrl = invoiceRes.data?.invoice_url;
          } catch (err) {
            console.error('Invoice generation failed:', err);
          }

          await triggerEmail(supabase, 'order-confirmation', customerEmail, `order-confirm-${sessionId}`, {
            name: customerName,
            orderNumber: sessionId.slice(-8).toUpperCase(),
          });
          await triggerEmail(supabase, 'order-receipt', customerEmail, `order-receipt-${sessionId}`, {
            name: customerName,
            orderNumber: sessionId.slice(-8).toUpperCase(),
            grandTotal: session.amount_total ? `${(session.amount_total / 100).toFixed(2)} kr` : undefined,
            invoiceDownloadUrl: invoiceUrl,
          });
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
