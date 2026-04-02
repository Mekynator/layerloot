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

async function fetchChatConfig() {
  try {
    const { data } = await serviceSupabase.from("site_settings").select("value").eq("key", "chat_widget").maybeSingle();
    return (data?.value as Record<string, any>) ?? {};
  } catch { return {}; }
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
    ctx.points = { balance: rows.reduce((s: number, r: any) => s + Number(r.points ?? 0), 0), recent: rows };
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

function getStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en ?? Object.values(val)[0] ?? "";
}

function buildSystemPrompt(user: any, ctx: Record<string, any>, cart: any, page: string | null, chatConfig: Record<string, any>) {
  const prompts = chatConfig.prompts ?? {};
  const tone = chatConfig.tone ?? {};
  const behavior = chatConfig.behavior ?? {};
  const pageRules = chatConfig.pageRules ?? [];

  const name = ctx.profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const cartTotal = Number(cart?.total ?? 0);
  const cartCount = Number(cart?.item_count ?? 0);
  const freeShipGap = Math.max(0, (ctx.shipping?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD) - cartTotal);

  const productList = (ctx.products ?? []).slice(0, 12).map((p: any) => `- ${p.name} (${p.price} kr) → ${p.url}`).join("\n");
  const categoryList = (ctx.categories ?? []).map((c: any) => `- ${c.name} → /products?category=${c.slug}`).join("\n");

  // Find matching page rule
  const matchedRule = pageRules.find((r: any) => {
    if (!r.enabled) return false;
    const pattern = r.page.replace(/\*/g, ".*");
    return new RegExp(`^${pattern}$`).test(page ?? "/");
  });
  const focusArea = matchedRule?.focusArea ?? "general";

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

  // Build tone instructions from admin config
  const personalityMap: Record<string, string> = {
    friendly: "Be warm, approachable, and helpful.",
    professional: "Be professional, clear, and authoritative.",
    playful: "Be fun, light-hearted, and engaging.",
    premium: "Use a refined, premium brand voice.",
    warm: "Be warm, empathetic, and conversational.",
    concise: "Be direct and to the point.",
  };

  const lengthMap: Record<string, string> = {
    short: "Keep responses to 2-3 sentences unless asked for detail.",
    medium: "Keep responses to 3-5 sentences.",
    long: "Give thorough, detailed responses.",
  };

  const focusMap: Record<string, string> = {
    product_help: "Focus on helping with product questions, materials, sizing, and comparisons.",
    checkout_assist: "Focus on checkout help, discounts, shipping, and encouraging purchase completion.",
    account_support: "Focus on orders, rewards, vouchers, and account management.",
    custom_order_help: "Focus on the custom order process, file uploads, pricing, and production guidance.",
    general: "Provide general assistance across all topics.",
  };

  const assistantRole = prompts.assistantRole || "You are LayerLoot's AI assistant — a friendly, knowledgeable helper for a 3D printing e-commerce store.";
  const brandDesc = prompts.brandDescription ? `\n## Brand\n${prompts.brandDescription}` : "";
  const toneInst = prompts.toneInstructions || personalityMap[tone.personality ?? "friendly"] || "";
  const lengthInst = lengthMap[tone.responseLength ?? "short"] || "";
  const focusInst = focusMap[focusArea] || "";
  const productGuidance = prompts.productGuidance || "";
  const supportInst = prompts.supportInstructions || "";
  const avoidInst = prompts.thingsToAvoid ? `\n## Things to Avoid\n${prompts.thingsToAvoid}` : "";
  const campaignInst = prompts.campaignInstructions ? `\n## Campaign Instructions\n${prompts.campaignInstructions}` : "";
  const escalation = prompts.escalationRules ? `\n## Escalation\n${prompts.escalationRules}` : "";
  const customSuffix = prompts.customSystemPromptSuffix || "";

  // Behavior flags
  const behaviorNotes: string[] = [];
  if (behavior.autoRecommendProducts) behaviorNotes.push("- Proactively recommend relevant products when appropriate.");
  if (behavior.includeLinks) behaviorNotes.push("- Include markdown links to pages when mentioning them.");
  if (behavior.showLoyaltyPrompts && user) behaviorNotes.push("- Mention loyalty points balance when relevant.");
  if (behavior.showCheckoutEncouragement && cartCount > 0) behaviorNotes.push("- Gently encourage checkout completion.");
  if (behavior.showDeliveryPrompts) behaviorNotes.push("- Mention delivery/shipping info when relevant.");
  if (tone.useEmoji) behaviorNotes.push("- Use emoji sparingly for warmth.");
  else behaviorNotes.push("- Do NOT use emoji.");

  const upsellMap: Record<string, string> = {
    none: "",
    light: "- If natural, suggest complementary products.",
    moderate: "- Actively suggest upgrades and complementary products.",
    aggressive: "- Push upsells and cross-sells in most responses.",
  };
  if (upsellMap[tone.upsellIntensity ?? "light"]) behaviorNotes.push(upsellMap[tone.upsellIntensity ?? "light"]);

  return `${assistantRole}
${brandDesc}

## Tone & Style
${toneInst}
${lengthInst}
${focusInst}
${productGuidance ? `\n## Product Guidance\n${productGuidance}` : ""}
${supportInst ? `\n## Support\n${supportInst}` : ""}

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
- PLA: Most common, biodegradable, good for decorative items.
- PETG: Stronger than PLA, food-safe variants, good chemical resistance.
- Resin (SLA): Ultra-detailed, smooth finish, great for miniatures.
- TPU: Flexible material for phone cases, gaskets, etc.

## Custom Order Process
1. Upload a 3D model file at /create
2. Pay a 100 kr request fee
3. Admin reviews and sends a quote
4. User accepts/declines
5. If accepted, pay quoted amount (minus fee)
6. Production → shipping

## Behavior Rules
${behaviorNotes.join("\n")}
- Current page: ${page || "unknown"}
- Do NOT make up data.
- Use markdown formatting.
${avoidInst}
${campaignInst}
${escalation}
${customSuffix ? `\n## Additional Instructions\n${customSuffix}` : ""}
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

    const [token, chatConfig] = [extractBearerToken(req), await fetchChatConfig()];
    const user = await resolveUser(token);
    const ctx = await fetchContext(user?.id ?? null);

    const systemPrompt = buildSystemPrompt(user, ctx, cart, page, chatConfig);

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
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
