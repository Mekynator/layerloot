import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function lookupOrder(orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, tracking_number, tracking_url, total, created_at, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, quantity, unit_price")
    .eq("order_id", orderId);
  const { data: history } = await supabase
    .from("order_status_history")
    .select("status, created_at, note")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return { ...order, items, history };
}

async function searchProducts(query: string) {
  const { data } = await supabase
    .from("products")
    .select("name, slug, price, description, is_active, stock")
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .limit(5);
  return data || [];
}

async function getCategories() {
  const { data } = await supabase
    .from("categories")
    .select("name, slug, description")
    .order("sort_order");
  return data || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract context from the latest user message
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    let contextInfo = "";

    // Check for order ID pattern (UUID)
    const uuidMatch = lastUserMsg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch || /order|tracking|status|shipment|delivery/i.test(lastUserMsg)) {
      if (uuidMatch) {
        const order = await lookupOrder(uuidMatch[0]);
        if (order) {
          contextInfo += `\n\n[ORDER DATA] Order ${order.id}: Status=${order.status}, Total=${order.total} DKK, Created=${order.created_at}`;
          if (order.tracking_number) contextInfo += `, Tracking=${order.tracking_number}`;
          if (order.tracking_url) contextInfo += `, TrackingURL=${order.tracking_url}`;
          if (order.items?.length) contextInfo += `\nItems: ${order.items.map((i: any) => `${i.product_name} x${i.quantity}`).join(", ")}`;
          if (order.history?.length) contextInfo += `\nHistory: ${order.history.map((h: any) => `${h.status} (${h.created_at})`).join(" → ")}`;
        } else {
          contextInfo += `\n\n[ORDER DATA] No order found with ID ${uuidMatch[0]}.`;
        }
      } else {
        contextInfo += `\n\n[INFO] The customer is asking about an order but didn't provide an order ID. Ask them for their order ID (found in their account page or confirmation email).`;
      }
    }

    // Check for product/article searches
    if (/product|filament|pla|abs|petg|resin|nozzle|tool|miniature|print|material|article|item|buy|shop|find/i.test(lastUserMsg)) {
      const searchTerms = lastUserMsg.replace(/(?:do you have|can i find|looking for|search for|show me|what|where|is there)/gi, "").trim();
      const products = await searchProducts(searchTerms.slice(0, 50));
      if (products.length) {
        contextInfo += `\n\n[PRODUCT RESULTS] Found products: ${products.map((p: any) => `${p.name} (${p.price} DKK, ${p.stock > 0 ? "in stock" : "out of stock"}, /products/${p.slug})`).join("; ")}`;
      }
      const categories = await getCategories();
      if (categories.length) {
        contextInfo += `\n[CATEGORIES] ${categories.map((c: any) => `${c.name} (/products?category=${c.slug})`).join(", ")}`;
      }
    }

    const systemPrompt = `You are a helpful customer support assistant for LayerLoot, a 3D printing supplies store. You help customers with:
- Product questions about filaments, tools, miniatures, and custom prints
- Order status and tracking inquiries — when you have [ORDER DATA], share the details clearly
- Product search — when you have [PRODUCT RESULTS], recommend matching products with links
- Shipping and delivery information
- Returns and refund policies
- Loyalty points and rewards program questions
- Gift card usage and balance inquiries

Use DKK/kr as the currency. Be friendly, concise, and helpful.
When sharing product links, format them as relative URLs like /products/slug-name.
If a customer asks about their order without providing an ID, ask them to share it.
For issues you can't resolve, suggest emailing support@layerloot.lovable.app.${contextInfo}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
