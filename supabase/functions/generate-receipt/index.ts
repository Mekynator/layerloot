import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order with items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    // Fetch user profile
    let customerName = "Customer";
    let customerEmail = "";
    if (order.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", order.user_id)
        .single();
      if (profile?.full_name) customerName = profile.full_name;

      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      if (authUser?.user?.email) customerEmail = authUser.user.email;
    }

    // Fetch store settings
    const { data: storeSettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "store")
      .single();
    const storeName = (storeSettings?.value as any)?.name || "LayerLoot";
    const currency = (storeSettings?.value as any)?.currency_symbol || "kr";

    const { data: contactSettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "contact")
      .single();
    const contact = contactSettings?.value as any || {};

    // Build HTML receipt
    const items = order.order_items || [];
    const itemRows = items.map((item: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.product_name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${Number(item.unit_price).toFixed(2)} ${currency}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${Number(item.total_price).toFixed(2)} ${currency}</td>
      </tr>
    `).join("");

    const shippingAddr = order.shipping_address as any;
    const addressHtml = shippingAddr ? `
      <p style="margin:4px 0;">${shippingAddr.name || customerName}</p>
      <p style="margin:4px 0;">${shippingAddr.address || ""}</p>
      <p style="margin:4px 0;">${shippingAddr.city || ""} ${shippingAddr.zip || ""}</p>
      <p style="margin:4px 0;">${shippingAddr.country || ""}</p>
    ` : "";

    const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
      <div style="text-align:center;padding:20px 0;border-bottom:3px solid #f97316;">
        <h1 style="margin:0;font-size:28px;color:#1a1a1a;">${storeName}</h1>
        <p style="color:#666;margin:4px 0;">Order Confirmation & Receipt</p>
      </div>
      
      <div style="padding:20px 0;">
        <p>Dear ${customerName},</p>
        <p>Thank you for your order! Here's your receipt:</p>
      </div>

      <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin-bottom:20px;">
        <table style="width:100%;">
          <tr><td style="color:#666;">Order #</td><td style="text-align:right;font-weight:bold;">${order.id.slice(0, 8).toUpperCase()}</td></tr>
          <tr><td style="color:#666;">Date</td><td style="text-align:right;">${new Date(order.created_at).toLocaleDateString("en-GB")}</td></tr>
          <tr><td style="color:#666;">Status</td><td style="text-align:right;text-transform:capitalize;">${order.status}</td></tr>
        </table>
      </div>

      ${addressHtml ? `<div style="margin-bottom:20px;"><h3 style="margin:0 0 8px;color:#1a1a1a;">Shipping Address</h3>${addressHtml}</div>` : ""}

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f97316;color:#fff;">
            <th style="padding:10px;text-align:left;">Item</th>
            <th style="padding:10px;text-align:center;">Qty</th>
            <th style="padding:10px;text-align:right;">Price</th>
            <th style="padding:10px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;padding:16px;background:#f9f9f9;border-radius:8px;">
        <table style="width:100%;">
          <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="text-align:right;">${Number(order.subtotal).toFixed(2)} ${currency}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Shipping</td><td style="text-align:right;">${Number(order.shipping_cost).toFixed(2)} ${currency}</td></tr>
          <tr style="font-size:18px;font-weight:bold;"><td style="padding:8px 0;border-top:2px solid #ddd;">Total</td><td style="text-align:right;padding:8px 0;border-top:2px solid #ddd;color:#f97316;">${Number(order.total).toFixed(2)} ${currency}</td></tr>
        </table>
      </div>

      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
        <p>${storeName} ${contact.address ? "| " + contact.address : ""}</p>
        <p>${contact.email ? contact.email : ""} ${contact.phone ? "| " + contact.phone : ""}</p>
      </div>
    </body>
    </html>`;

    // Award loyalty points (1 point per kr spent)
    if (order.user_id) {
      const pointsEarned = Math.floor(Number(order.total));
      if (pointsEarned > 0) {
        await supabase.from("loyalty_points").insert({
          user_id: order.user_id,
          points: pointsEarned,
          reason: `Order #${order.id.slice(0, 8)}`,
          order_id: order.id,
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      receipt_html: receiptHtml,
      customer_email: customerEmail,
      customer_name: customerName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Receipt generation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
