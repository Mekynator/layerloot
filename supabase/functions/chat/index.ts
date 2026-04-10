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

async function fetchKnowledgeBase() {
  try {
    const { data } = await serviceSupabase.from("chat_knowledge_base").select("question,answer,category").eq("is_active", true).order("priority", { ascending: false }).limit(50);
    return data ?? [];
  } catch { return []; }
}

async function fetchContext(userId: string | null) {
  const ctx: Record<string, any> = {};

  try {
    const { data } = await serviceSupabase.from("products").select("id,name,slug,price,category_id,is_featured,images,stock,is_made_to_order").eq("is_active", true).eq("published", true).order("created_at", { ascending: false }).limit(20);
    ctx.products = (data ?? []).map((p: any) => ({ ...p, url: `/products/${p.slug}`, images: p.images ?? [] }));
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
  const activePreset = chatConfig.activePreset;
  const presets = [...(chatConfig.presets ?? [])];
  const builtInPresets = [
    { id: "support", tone: { personality: "warm", assistantMode: "support", responseLength: "medium" }, behavior: { prioritize: "support" } },
    { id: "sales", tone: { personality: "friendly", assistantMode: "sales", ctaStyle: "direct", upsellIntensity: "moderate" }, behavior: { prioritize: "selling" } },
    { id: "advisor", tone: { personality: "professional", assistantMode: "advisor", responseLength: "long" }, behavior: { prioritize: "balanced" } },
    { id: "custom_orders", tone: { personality: "warm", assistantMode: "guide", responseLength: "long" }, behavior: { prioritize: "support" } },
    { id: "rewards", tone: { personality: "playful", assistantMode: "guide", responseLength: "short" }, behavior: { prioritize: "balanced" } },
    { id: "campaign", tone: { personality: "friendly", assistantMode: "sales", ctaStyle: "urgent", persuasiveStyle: "strong" }, behavior: { prioritize: "selling" } },
    { id: "premium", tone: { personality: "premium", assistantMode: "advisor", formalityLevel: "formal", useEmoji: false }, behavior: { prioritize: "balanced" } },
    { id: "minimal", tone: { personality: "concise", assistantMode: "support", responseLength: "short", useEmoji: false }, behavior: { prioritize: "support" } },
  ];
  const allPresets = [...builtInPresets, ...presets];
  const matchedPreset = activePreset ? allPresets.find((p: any) => p.id === activePreset) : null;

  const prompts = chatConfig.prompts ?? {};
  const tone = { ...(chatConfig.tone ?? {}), ...(matchedPreset?.tone ?? {}) };
  const behavior = { ...(chatConfig.behavior ?? {}), ...(matchedPreset?.behavior ?? {}) };
  const pageRules = chatConfig.pageRules ?? [];

  const name = ctx.profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const cartTotal = Number(cart?.total ?? 0);
  const cartCount = Number(cart?.item_count ?? 0);
  const freeShipGap = Math.max(0, (ctx.shipping?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD) - cartTotal);

  const productList = (ctx.products ?? []).slice(0, 12).map((p: any) => {
    const img = p.images?.[0] || "";
    return `- ${p.name} | ${p.price} kr | id:${p.id} | img:${img} | ${p.url}`;
  }).join("\n");
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

  // Build AI config from admin chat settings
  const aiConfig = {
    max_products: chatConfig.ai_max_products ?? 2,
    enable_upsell: chatConfig.ai_enable_upsell !== false,
    enable_bundle: chatConfig.ai_enable_bundle !== false,
    enable_smart_discount: chatConfig.ai_enable_smart_discount !== false,
    enable_cart_recovery: chatConfig.ai_enable_cart_recovery !== false,
    enable_reengagement: chatConfig.ai_enable_reengagement !== false,
    enable_quick_replies: chatConfig.ai_enable_quick_replies !== false,
    enable_visual_extended: chatConfig.ai_enable_visual_extended !== false,
    enable_ab_testing: chatConfig.ai_enable_ab_testing ?? false,
    funnel_enabled: chatConfig.ai_funnel_enabled !== false,
    one_best_option_mode: chatConfig.ai_one_best_option_mode !== false,
    max_response_lines: chatConfig.ai_max_response_lines ?? 4,
  };

  return `${assistantRole}
${brandDesc}

## COMMUNICATION STYLE
- MAX ${aiConfig.max_response_lines} lines per response
- No paragraphs — use bullet points
- Be direct, helpful, friendly
- Always end with 1 next step
- NO long explanations, NO repeated info

## Tone & Style
${toneInst}
${lengthInst}
${focusInst}
${productGuidance ? `\n## Product Guidance\n${productGuidance}` : ""}
${supportInst ? `\n## Support\n${supportInst}` : ""}

## INTENT DETECTION (PRIORITY)
If user intent is CLEAR → skip explanations → show products immediately with images.
If user shows BUYING INTENT → STOP recommendations → push checkout: "Ready? → Go to checkout"

## SESSION MEMORY
Remember during session: preferred style, budget, previous products viewed. Reuse in recommendations.

## CONTEXT AWARENESS
Use: current page (${page || "unknown"}), cart state (${cartCount} items, ${cartTotal} kr), user history.
Adapt response accordingly.

## Site Navigation
- Home: / | Products: /products | Product: /products/[slug]
- Create Your Own: /create | Gallery: /gallery | Contact: /contact
- Account: /account | Cart: /cart | Rewards: Account → Rewards Store
- Auth: /auth | Order Tracking: /order-tracking

Always reference exact UI actions: → "Go to Products → select → Add to Cart"

## Product Categories
${categoryList || "No categories loaded"}

## Products (live data)
${productList || "No products loaded"}

## Product Display Format (MANDATORY)
When showing a product, ALWAYS use this exact format:
• **{name}**
  - {1 short benefit}
  - {price} kr${aiConfig.enable_visual_extended ? ` | Stock: {in stock / made to order}` : ""}
  - ![{name}]({image_url})
  - → [View product]({product_url})
${aiConfig.enable_visual_extended ? `
If available, also show: color variants, extra angle image, or 3D preview link.` : ""}
\n## HARD GROUNDING RULES (ENFORCED)
- ALWAYS use only products listed in the "Products (live data)" section above. Do NOT invent product names, ids, prices, images, slugs, or stock statuses.
- If you list a product, include its exact id as shown in the Products list (e.g. id:123) so the frontend can validate it.
- Only recommend categories that appear in the "Product Categories" list above and that have active products (do not recommend empty categories).
- Never output raw internal routes or query strings; use the UI action labels provided in "Site Navigation" or render links that match the routes in Site Navigation.
- If you cannot find any real products to recommend, respond honestly and offer only the safe fallback actions: Browse Products, Create Your Own, Contact Us.

Rules:
- Max ${aiConfig.max_products} products per response
- Use REAL data from Products list — NEVER invent products
- If no match → suggest a category link
- Prioritize: featured > best sellers > newest
${aiConfig.one_best_option_mode ? `- If user is indecisive → show ONLY 1 product labeled "Best choice for you"` : ""}
${aiConfig.enable_bundle ? `
## Bundle Mode
After main product, offer +1 complementary: "Pairs well with:" in same format.` : ""}
${aiConfig.enable_upsell ? `
## Upsell
After recommendation, suggest ONE upgrade or complementary product if relevant.` : ""}
${aiConfig.enable_smart_discount ? `
## Smart Discount
If user hesitates, suggest ONE incentive: available discount, free shipping eligibility, or rewards points usage.` : ""}
${aiConfig.enable_cart_recovery && cartCount > 0 ? `
## Cart Recovery
User has ${cartCount} items (${cartTotal} kr) in cart.
- Mention: "You left items in your cart 👇"
- Show max 2 cart items
- Push: → "Checkout now"
${freeShipGap > 0 ? `- "${freeShipGap} kr more for free shipping"` : "- Qualifies for free shipping!"}` : ""}
${aiConfig.enable_reengagement ? `
## Re-engagement
If user seems idle or returns: → "Still looking? I found something for you 👇" then show product.` : ""}
${aiConfig.funnel_enabled ? `
## Smart Funnel (only if user unsure)
Ask max 2-3 quick questions:
1. Gift or for yourself?
2. Style? (fun / decor / custom)
3. Budget? (low / mid / premium)
Then recommend instantly.` : ""}
${aiConfig.enable_quick_replies ? `
## Quick Replies
When helpful, suggest action buttons: [Show more] [Cheaper] [Custom option] [Go to cart]` : ""}

## Gift Mode
If user says "gift": simplify options, suggest safe popular products, avoid complex customization.

## Order Status
If user asks about order: show status + timeline from their order data.

## Shipping
- Free shipping: ${ctx.shipping?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD} kr | Flat rate: ${ctx.shipping?.flat_rate ?? 49} kr | Currency: DKK

## Cart Status
- Items: ${cartCount} | Total: ${cartTotal} kr
${freeShipGap > 0 ? `- ${freeShipGap} kr away from free shipping` : "- ✅ Free shipping!"}

${userSection}

## Materials
- PLA: biodegradable, decorative | PETG: strong, food-safe | Resin: ultra-detail | TPU: flexible

## Custom Orders
Upload 3D model at /create → pay 100 kr fee → get quote → accept → production → shipping

## Rewards
Points from orders/invites → redeem for shipping, discounts, vouchers → Account → Rewards Store
${user ? `- Points balance: ${ctx.points?.balance ?? 0}` : ""}

## Purchase Flow
Choose → Customize → Add to cart → Checkout → Pay. Always simplify.

## Problem Solving
Short fix + next step. Example: "Refresh page" or "Check Orders in Account"
${aiConfig.enable_ab_testing ? `
## A/B Testing
Vary product order, wording style, and trigger timing across sessions to optimize performance.` : ""}

## Behavior Rules
${behaviorNotes.join("\n")}
- Do NOT make up data
- Use markdown formatting
- Always reduce friction
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

    const [token, chatConfig, knowledgeBase] = [extractBearerToken(req), await fetchChatConfig(), await fetchKnowledgeBase()];
    const user = await resolveUser(token);
    const ctx = await fetchContext(user?.id ?? null);

    // Inject knowledge base into context
    const kbSection = knowledgeBase.length > 0
      ? "\n## Preferred Q&A (use these answers when matching)\n" + knowledgeBase.map((kb: any) => `Q: ${kb.question}\nA: ${kb.answer}`).join("\n\n")
      : "";

    const systemPrompt = buildSystemPrompt(user, ctx, cart, page, chatConfig) + kbSection;

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
        stream: false,
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

    // Read full assistant response (non-stream) and sanitize any product blocks / route text
    const json = await response.json().catch(() => null);
    let assistantText = "";
    try {
      assistantText = (json?.choices?.[0]?.message?.content) ?? (json?.choices?.[0]?.text) ?? "";
    } catch {
      assistantText = "";
    }

    // Helper: parse product blocks written by model
    const productBlockRe = /•\s+\*\*([^*\n]+)\*\*[ \t]*\n((?:[ \t]*-[ \t]+[^\n]*\n?)*)/g;

    const ctxProducts: any[] = ctx.products ?? [];

    // Helper: record hallucination events to analytics for monitoring (fire-and-forget)
    function recordHallucination(kind: string, details: Record<string, any>) {
      try {
        const payload = {
          event_type: "ai_hallucination",
          event_data: { kind, details },
          page: page || "/",
          user_id: user?.id ?? null,
        } as any;
        // Fire-and-forget insert to analytics table; do not block the response
        serviceSupabase.from("chat_analytics_events").insert(payload as any).then(() => {}).catch(() => {});
      } catch (e) {
        // swallow errors to avoid breaking chat
        console.warn("hallucination logging failed", e);
      }
    }

    const sanitizeProductBlock = (matchName: string, body: string) => {
      // Strict matching: only accept exact id, exact slug, or exact name (case-insensitive)
      const name = matchName.trim();
      let found = null;

      // exact id
      found = ctxProducts.find((p) => p.id && p.id === name);
      if (!found) {
        // exact slug e.g. '/products/slug' or 'slug'
        const slug = name.startsWith("/products/") ? name.replace(/^\/products\//, "") : name;
        found = ctxProducts.find((p) => p.slug && p.slug === slug);
      }
      if (!found) {
        // exact name (case-insensitive)
        found = ctxProducts.find((p) => p.name && p.name.toLowerCase() === name.toLowerCase());
      }

      if (!found) {
        // record when model referenced a product not present in live context
        try {
          recordHallucination("unknown_product", { mention: matchName, excerpt: (body || "").slice(0, 200) });
        } catch {}
        return null;
      }
      const img = (found.images && found.images[0]) || "";
      const price = found.price != null ? `${Number(found.price)} kr` : "";
      const benefitLine = ""; // avoid inventing benefits here
      const productUrl = `/products/${found.slug}`;
      return `• **${getStr(found.name)}**\n  - ${benefitLine}\n  - ${price}\n  - ![${getStr(found.name)}](${img})\n  - → [View product](${productUrl})\n`;
    };

    // Replace product blocks with sanitized versions; collect replacements
    let sanitized = assistantText;
    let anyProductReplaced = false;
    sanitized = sanitized.replace(productBlockRe, (full, name, body) => {
      const repl = sanitizeProductBlock(name, body);
      if (repl) { anyProductReplaced = true; return repl; }
      // if not found, remove the block
      return "";
    });

    // Replace raw route mentions with friendly buttons for known routes
    const routeMap: Record<string, string> = {
      '/create': '[Create Your Own](/create)',
      '/products': '[Browse Products](/products)',
      '/cart': '[View Cart](/cart)',
      '/contact': '[Contact Us](/contact)',
      '/account': '[Account](/account)',
      '/shipping': '[Shipping Info](/shipping)',
      '/gallery': '[Gallery](/gallery)',
      '/order-tracking': '[Order Tracking](/order-tracking)',
      '/reviews': '[Reviews](/reviews)',
      '/help': '[Help](/help)',
      '/faq': '[FAQ](/faq)'
    };
    // First, handle category query routes like /products?category=slug — only replace if category exists and has active products
    sanitized = sanitized.replace(/\/products\?category=([^\s)]+)/g, (full, slug) => {
      try {
        const decoded = decodeURIComponent(slug);
        const cat = (ctx.categories || []).find((c: any) => c.slug === decoded);
        if (!cat) {
          recordHallucination("unknown_category", { slug: decoded, reason: "not_found" });
          return 'Browse Products';
        }
        // check if products include this category slug
        const has = (ctx.products || []).some((p: any) => (p.category_id === cat.id) || (p.url && p.url.includes(`/products?category=${decoded}`)) || (p.category_slugs && String(p.category_slugs).toLowerCase().includes(decoded.toLowerCase())));
        if (!has) {
          recordHallucination("unknown_category", { slug: decoded, reason: "empty" });
          return 'Browse Products';
        }
        return `[${getStr(cat.name)}](/products?category=${decoded})`;
      } catch {
        return 'Browse Products';
      }
    });

    Object.keys(routeMap).forEach((r) => {
      // replace bare mentions like 'Go to /create' or ' /create ' (avoid replacing inside markdown links)
      const rx = new RegExp(`(?<!\])\\b${r}\\b(?!\()`, 'g');
      sanitized = sanitized.replace(rx, routeMap[r]);
    });

    // If assistant referenced products but we removed all product blocks, add a safe fallback
    const hadProductIntent = /\b(product|best seller|best sellers|recommend|gift|suggest)\b/i.test(assistantText);
    if (hadProductIntent && !anyProductReplaced) {
      sanitized += "\nI couldn't find exact active products matching that right now. → [Browse Products](/products)";
    }

    // Return as a single SSE data chunk so frontend can consume similarly
    const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content: sanitized } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(ssePayload, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
