import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const FREE_SHIPPING_THRESHOLD = 500;

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractBearerToken(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function resolveUser(token: string | null) {
  if (!token) return null;
  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

async function fetchContext(userId: string | null) {
  const ctx: Record<string, any> = {};

  try {
    const { data } = await serviceSupabase.from("products").select("id,name,slug,price,category_id,is_featured").eq("is_active", true).order("created_at", { ascending: false }).limit(20);
    ctx.products = (data ?? []).map((p: any) => ({ ...p, url: `/products/${p.slug}` }));
  } catch { ctx.products = []; }

  try {
    const { data } = await serviceSupabase.from("categories").select("id,name,slug").order("sort_order");
    ctx.categories = data ?? [];
  } catch { ctx.categories = []; }

  try {
    const { data } = await serviceSupabase.from("shipping_config").select("*").limit(1).maybeSingle();
    ctx.shipping = data;
  } catch { ctx.shipping = null; }

  if (!userId) return ctx;

  try {
    const { data } = await serviceSupabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    ctx.profile = data;
  } catch { ctx.profile = null; }

  try {
    const { data } = await serviceSupabase.from("loyalty_points").select("points,reason,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
    const rows = data ?? [];
    ctx.points = {
      balance: rows.reduce((s: number, r: any) => s + Number(r.points ?? 0), 0),
      recent: rows,
    };
  } catch { ctx.points = { balance: 0, recent: [] }; }

  try {
    const { data } = await serviceSupabase.from("orders").select("id,status,total,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
    ctx.orders = data ?? [];
  } catch { ctx.orders = []; }

  try {
    const { data } = await serviceSupabase.from("custom_orders").select("id,status,quoted_price,final_agreed_price,payment_status,production_status,request_fee_status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
    ctx.customOrders = data ?? [];
  } catch { ctx.customOrders = []; }

  try {
    const { data } = await serviceSupabase.from("user_vouchers").select("code,is_used,balance,voucher_id").eq("user_id", userId).eq("is_used", false).limit(5);
    ctx.vouchers = data ?? [];
  } catch { ctx.vouchers = []; }

  return ctx;
}

function buildSystemPrompt(user: any, ctx: Record<string, any>, cart: any, page: string | null) {
  const name = ctx.profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const cartTotal = Number(cart?.total ?? 0);
  const cartCount = Number(cart?.item_count ?? 0);
  const freeShipGap = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

  const productList = (ctx.products ?? []).slice(0, 12).map((p: any) => `- ${p.name} (${p.price} kr) → ${p.url}`).join("\n");
  const categoryList = (ctx.categories ?? []).map((c: any) => `- ${c.name} → /products?category=${c.slug}`).join("\n");

  let userSection = "";
  if (user) {
    userSection = `
## Current User
- Name: ${name}
- Email: ${user.email ?? "unknown"}
- Loyalty Points Balance: ${ctx.points?.balance ?? 0}
- Recent Points Activity: ${JSON.stringify(ctx.points?.recent ?? [])}
- Recent Orders: ${JSON.stringify(ctx.orders ?? [])}
- Custom Orders: ${JSON.stringify(ctx.customOrders ?? [])}
- Active Vouchers: ${JSON.stringify(ctx.vouchers ?? [])}
`;
  }

  return `You are LayerLoot's AI assistant — a friendly, knowledgeable helper for a 3D printing e-commerce store.

## Your Capabilities
- Answer questions about products, materials, shipping, custom orders, loyalty points, and account features
- Provide clickable links to pages when users ask where something is
- Help users understand the custom order process
- Give product recommendations from the catalog
- Help with cart and shipping questions

## Site Navigation
- Home: /
- All Products: /products
- Create Your Own (custom order): /create
- Gallery: /gallery
- Contact: /contact
- My Account: /account
- Cart: /cart
- Sign In/Up: /auth
- Order Tracking: /order-tracking

## Product Categories
${categoryList || "No categories loaded"}

## Products (sample)
${productList || "No products loaded"}

## Shipping
- Free shipping threshold: ${ctx.shipping?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD} kr
- Flat rate: ${ctx.shipping?.flat_rate ?? 49} kr
- Currency: DKK (Danish Kroner)

## Cart Status
- Items: ${cartCount}
- Total: ${cartTotal} kr
${freeShipGap > 0 ? `- ${freeShipGap} kr away from free shipping` : "- Qualifies for free shipping!"}

${userSection}

## Materials Knowledge
- PLA: Most common, biodegradable, good for decorative items. Easy to print.
- PETG: Stronger than PLA, food-safe variants, good chemical resistance.
- Resin (SLA): Ultra-detailed, smooth finish, great for miniatures and jewelry.
- TPU: Flexible material for phone cases, gaskets, etc.

## Print Quality Levels
- Ultra (0.1mm layer height): Maximum detail
- High (0.2mm): Great quality, good speed balance
- Standard (0.4mm): Fast, good for prototypes
- Draft (0.6mm): Fastest, rougher finish

## Custom Order Process
1. User uploads a 3D model file (STL, OBJ, 3MF) at /create
2. Pays a 100 kr request fee
3. Admin reviews and sends a quote
4. User accepts/declines the quote
5. If accepted, user pays the quoted amount (minus the 100 kr fee)
6. Production begins → shipping

## Rules
- Always be helpful, friendly, and concise
- Use DKK as currency, format like "150 kr"
- When mentioning pages, include markdown links like [Products](/products)
- If user asks about their points, orders, or account — use the data above
- Current page: ${page || "unknown"}
- Do NOT make up data. If you don't have info, say so.
- Keep responses short (2-4 sentences) unless user asks for detail.
- Use markdown formatting for better readability.
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const cart = body?.cart ?? {};
    const page = body?.page ?? null;

    const token = extractBearerToken(req);
    const user = await resolveUser(token);
    const ctx = await fetchContext(user?.id ?? null);

    const systemPrompt = buildSystemPrompt(user, ctx, cart, page);

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m: any) => m.role === "user" || m.role === "assistant").slice(-20),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
