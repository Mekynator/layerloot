import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatContext = {
  page?: {
    path?: string;
    url?: string;
    title?: string;
  };
  cart?: {
    itemCount?: number;
    subtotal?: number;
    items?: Array<{
      id?: string;
      name?: string;
      qty?: number;
      price?: number;
    }>;
  };
  user?: {
    loggedIn?: boolean;
    id?: string | null;
    email?: string | null;
  };
  geo?: {
    lat?: number;
    lng?: number;
  } | null;
  locale?: {
    language?: string;
    timezone?: string;
    currency?: string;
  };
};

type ChatLink = {
  label: string;
  url: string;
  description?: string;
};

type ChatOrder = {
  orderNumber: string;
  status: string;
  total: number;
  createdAt?: string;
  url?: string;
};

type ChatCoupon = {
  code: string;
  description?: string;
  discountText?: string;
  expiresAt?: string;
};

type FinalPayload = {
  text: string;
  suggestions?: string[];
  links?: ChatLink[];
  orders?: ChatOrder[];
  coupons?: ChatCoupon[];
  points?: number | null;
};

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function createUserSupabase(token: string) {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function escapeLike(input: string) {
  return input.replace(/[%_]/g, "");
}

function isPointsIntent(text: string) {
  return /\b(points?|loyalty|reward\s*points?|reward\s*balance)\b/i.test(text);
}

function isCouponsIntent(text: string) {
  return /\b(coupons?|voucher|vouchers|discount\s*codes?|promo\s*codes?)\b/i.test(text);
}

function isRecentOrdersIntent(text: string) {
  return /\b(my\s+(latest|last|recent)\s+orders?|show\s+my\s+orders?|recent\s+orders?)\b/i.test(text);
}

function isLatestOrderIntent(text: string) {
  return /\b(my\s+(latest|last)\s+order|show\s+my\s+(latest|last)\s+order)\b/i.test(text);
}

function isAccountIntent(text: string) {
  return /\b(account|profile|my\s+email|account\s+info|account\s+information)\b/i.test(text);
}

function isOrderHelpIntent(text: string) {
  return /\b(order|tracking|status|shipment|delivery)\b/i.test(text);
}

function isAccountRestrictedIntent(text: string) {
  return (
    isPointsIntent(text) ||
    isCouponsIntent(text) ||
    isRecentOrdersIntent(text) ||
    isLatestOrderIntent(text) ||
    isAccountIntent(text) ||
    /\bmy\s+order\b/i.test(text)
  );
}

function formatDate(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildDiscountText(discountType: string | null | undefined, discountValue: number | string | null | undefined) {
  if (discountValue == null) return undefined;
  const value = Number(discountValue);
  if (Number.isNaN(value)) return undefined;
  if (discountType === "percentage") return `${value}% off`;
  return `${value} DKK off`;
}

async function lookupOrder(orderId: string) {
  const { data: order } = await serviceSupabase
    .from("orders")
    .select("id, status, total, created_at, shipping_address")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await serviceSupabase
    .from("order_items")
    .select("product_name, quantity, unit_price")
    .eq("order_id", orderId);

  return { ...order, items };
}

async function searchProducts(query: string) {
  const cleanQuery = escapeLike(query);
  if (!cleanQuery) return [];

  const { data } = await serviceSupabase
    .from("products")
    .select("id, name, slug, price, description, is_active, stock, images")
    .eq("is_active", true)
    .ilike("name", `%${cleanQuery}%`)
    .limit(5);

  return data || [];
}

async function getCategories() {
  const { data } = await serviceSupabase.from("categories").select("name, slug, description").order("sort_order");

  return data || [];
}

async function getUserPointsBalance(userId: string) {
  const { data, error } = await serviceSupabase.rpc("get_user_points_balance", {
    _user_id: userId,
  });

  if (error) throw error;
  return typeof data === "number" ? data : Number(data || 0);
}

async function getUserRecentOrders(userId: string, limit = 3) {
  const { data, error } = await serviceSupabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((order) => ({
    orderNumber: order.id,
    status: order.status,
    total: Number(order.total || 0),
    createdAt: formatDate(order.created_at),
    url: "/account",
  })) as ChatOrder[];
}

async function getUserActiveCoupons(userId: string) {
  const { data, error } = await serviceSupabase
    .from("user_vouchers")
    .select(
      `
      code,
      is_used,
      voucher:vouchers (
        name,
        description,
        discount_type,
        discount_value,
        is_active
      )
    `,
    )
    .eq("user_id", userId)
    .eq("is_used", false);

  if (error) throw error;

  return (data || [])
    .filter((row: any) => row.voucher?.is_active)
    .map((row: any) => ({
      code: row.code,
      description: row.voucher?.description || row.voucher?.name || undefined,
      discountText: buildDiscountText(row.voucher?.discount_type, row.voucher?.discount_value),
    })) as ChatCoupon[];
}

async function getProfileSummary(userId: string) {
  const { data } = await serviceSupabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();

  return data || null;
}

function streamSingleFinalResponse(payload: FinalPayload) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ type: "status", status: "Checking your account..." });
      send({ type: "final", payload });
      send("[DONE]");
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildLoginRequiredPayload(text: string): FinalPayload {
  return {
    text,
    links: [
      {
        label: "Open my account",
        url: "/account",
        description: "Sign in to access your orders, points, and vouchers.",
      },
    ],
    suggestions: ["Show best sellers", "Shipping information", "Custom print help"],
  };
}

async function tryHandleAccountIntent(
  req: Request,
  lastUserMsg: string,
  context: ChatContext | undefined,
): Promise<Response | null> {
  if (!isAccountRestrictedIntent(lastUserMsg)) return null;

  const token = extractBearerToken(req);
  if (!token) {
    return streamSingleFinalResponse(
      buildLoginRequiredPayload(
        "I can help with your account, orders, points, and vouchers, but you need to sign in first.",
      ),
    );
  }

  const userSupabase = createUserSupabase(token);
  const {
    data: { user },
    error: userError,
  } = await userSupabase.auth.getUser();

  if (userError || !user) {
    return streamSingleFinalResponse(
      buildLoginRequiredPayload(
        "I couldn't verify your account session just now. Please sign in again and try once more.",
      ),
    );
  }

  const userId = user.id;
  const profile = await getProfileSummary(userId);
  const displayName = profile?.full_name?.trim() || user.email || "there";

  if (isPointsIntent(lastUserMsg)) {
    const points = await getUserPointsBalance(userId);

    return streamSingleFinalResponse({
      text: `You currently have ${points} loyalty points, ${displayName}.`,
      points,
      links: [
        {
          label: "Open my account",
          url: "/account",
          description: "Check your profile, vouchers, and order history.",
        },
      ],
      suggestions: ["Do I have active coupons?", "Show my latest order", "Show my recent orders"],
    });
  }

  if (isLatestOrderIntent(lastUserMsg)) {
    const orders = await getUserRecentOrders(userId, 1);

    if (!orders.length) {
      return streamSingleFinalResponse({
        text: "I couldn't find any orders on your account yet.",
        links: [
          {
            label: "Browse products",
            url: "/products",
            description: "Explore the latest items in the shop.",
          },
        ],
        suggestions: ["Show best sellers", "Custom print help", "Shipping information"],
      });
    }

    return streamSingleFinalResponse({
      text: `Here is your latest order. It is currently marked as ${orders[0].status}.`,
      orders,
      links: [
        {
          label: "Open my account",
          url: "/account",
          description: "See full order history and account details.",
        },
      ],
      suggestions: ["Show my recent orders", "How many points do I have?", "Do I have active coupons?"],
    });
  }

  if (isRecentOrdersIntent(lastUserMsg) || /\bmy\s+orders\b/i.test(lastUserMsg)) {
    const orders = await getUserRecentOrders(userId, 3);

    if (!orders.length) {
      return streamSingleFinalResponse({
        text: "I couldn't find any orders on your account yet.",
        links: [
          {
            label: "Browse products",
            url: "/products",
            description: "Explore the latest items in the shop.",
          },
        ],
        suggestions: ["Show best sellers", "Shipping information", "Custom print help"],
      });
    }

    return streamSingleFinalResponse({
      text: `I found your ${orders.length === 1 ? "most recent order" : `${orders.length} most recent orders`}.`,
      orders,
      links: [
        {
          label: "Open my account",
          url: "/account",
          description: "See your full order history.",
        },
      ],
      suggestions: ["Show my latest order", "Do I have active coupons?", "How many points do I have?"],
    });
  }

  if (isCouponsIntent(lastUserMsg)) {
    const coupons = await getUserActiveCoupons(userId);

    if (!coupons.length) {
      return streamSingleFinalResponse({
        text: "You do not have any active unused vouchers on your account right now.",
        links: [
          {
            label: "Open rewards area",
            url: "/account",
            description: "Check your points and redeemed rewards.",
          },
        ],
        suggestions: ["How many points do I have?", "Show my latest order", "Show best sellers"],
      });
    }

    return streamSingleFinalResponse({
      text: `You currently have ${coupons.length} active ${coupons.length === 1 ? "voucher" : "vouchers"} ready to use.`,
      coupons,
      links: [
        {
          label: "Open my account",
          url: "/account",
          description: "Review your rewards and account details.",
        },
      ],
      suggestions: ["How many points do I have?", "Show my latest order", "Show my recent orders"],
    });
  }

  if (isAccountIntent(lastUserMsg)) {
    const [points, orders, coupons] = await Promise.all([
      getUserPointsBalance(userId),
      getUserRecentOrders(userId, 1),
      getUserActiveCoupons(userId),
    ]);

    const latestOrderText = orders.length
      ? `Your latest order is currently ${orders[0].status}.`
      : "You do not have any orders yet.";

    return streamSingleFinalResponse({
      text: `You are signed in as ${user.email}. ${points} loyalty points available. ${coupons.length} active ${
        coupons.length === 1 ? "voucher" : "vouchers"
      }. ${latestOrderText}`,
      points,
      orders,
      coupons,
      links: [
        {
          label: "Open my account",
          url: "/account",
          description: "Manage your profile, points, vouchers, and orders.",
        },
      ],
      suggestions: ["Show my latest order", "How many points do I have?", "Do I have active coupons?"],
    });
  }

  // fallback for account-ish order help
  if (isOrderHelpIntent(lastUserMsg)) {
    const orders = await getUserRecentOrders(userId, 1);

    if (orders.length) {
      return streamSingleFinalResponse({
        text: `Your latest order is currently marked as ${orders[0].status}.`,
        orders,
        links: [
          {
            label: "Open my account",
            url: "/account",
            description: "Check order details and account history.",
          },
        ],
        suggestions: ["Show my recent orders", "Do I have active coupons?", "How many points do I have?"],
      });
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const messages = (body.messages || []) as ChatMessage[];
    const context = (body.context || {}) as ChatContext;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    const accountResponse = await tryHandleAccountIntent(req, lastUserMsg, context);
    if (accountResponse) return accountResponse;

    let contextInfo = "";

    const uuidMatch = lastUserMsg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch || isOrderHelpIntent(lastUserMsg)) {
      if (uuidMatch) {
        const order = await lookupOrder(uuidMatch[0]);
        if (order) {
          contextInfo += `\n\n[ORDER DATA] Order ${order.id}: Status=${order.status}, Total=${order.total} DKK, Created=${order.created_at}`;
          if (order.items?.length) {
            contextInfo += `\nItems: ${order.items.map((i: any) => `${i.product_name} x${i.quantity}`).join(", ")}`;
          }
        } else {
          contextInfo += `\n\n[ORDER DATA] No order found with ID ${uuidMatch[0]}.`;
        }
      } else {
        contextInfo +=
          `\n\n[INFO] The customer is asking about an order but didn't provide an order ID. ` +
          `Ask them for their order ID, or tell them they can sign in and ask for their latest order.`;
      }
    }

    if (
      /\b(product|filament|pla|abs|petg|resin|nozzle|tool|miniature|print|material|article|item|buy|shop|find)\b/i.test(
        lastUserMsg,
      )
    ) {
      const searchTerms = lastUserMsg
        .replace(/(?:do you have|can i find|looking for|search for|show me|what|where|is there)/gi, "")
        .trim();

      const products = await searchProducts(searchTerms.slice(0, 50));
      if (products.length) {
        contextInfo +=
          `\n\n[PRODUCT RESULTS] Found products: ` +
          products
            .map(
              (p: any) =>
                `${p.name} (${p.price} DKK, ${p.stock > 0 ? "in stock" : "out of stock"}, /products/${p.slug})`,
            )
            .join("; ");
      }

      const categories = await getCategories();
      if (categories.length) {
        contextInfo += `\n[CATEGORIES] ${categories.map((c: any) => `${c.name} (/products?category=${c.slug})`).join(", ")}`;
      }
    }

    const systemPrompt = `You are LayerLoot's creative AI assistant for a 3D printing store. You help customers with:

CREATIVE DESIGN HELP:
- Suggest ideas for 3D printed gifts, decorations, figurines, desk items, and more
- Generate detailed product concepts based on user descriptions
- Help users design custom text signs, nameplates, and decorations
- Create creative prompts for AI 3D model generators (describe geometry, style, details)
- Suggest customization options: materials, colors, finishes, and sizes
- Help refine ideas before submitting a custom order at /custom-order

MATERIAL EXPERTISE:
- PLA: Standard, biodegradable, great for decorative items. Silk PLA for metallic sheen.
- PETG: Durable, flexible, good for functional parts and outdoor use.
- Resin: Ultra-high detail, smooth surface, ideal for miniatures and jewelry.
- ABS: Heat-resistant, strong, good for mechanical parts.
- TPU: Flexible, rubber-like, great for phone cases and grips.

SIZE & SCALING GUIDANCE:
- Miniatures: typically 25-32mm scale
- Desk items: 8-15cm range
- Signs: 15-30cm width recommended
- Always consider wall thickness (minimum 2 mm for PLA)

STORE FEATURES:
- Product questions, order status/tracking (use [ORDER DATA] when available)
- Product search (use [PRODUCT RESULTS] when available)
- Direct users to /create for design tools (Custom 3D Print, lithophanes, gift finder)
- Direct users to /gallery to see community prints
- Shipping, returns, loyalty points, gift cards

IMPORTANT ACCOUNT RULES:
- If the user asks for points, vouchers, or their own recent orders and that data is not already present, tell them to sign in or visit /account.
- Never invent account balances, personal order history, or voucher codes.
- Use DKK/kr as currency.
- Format product links as relative URLs like /products/slug-name.
- For unresolvable issues, suggest emailing support@layerloot.lovable.app.
- When suggesting gift ideas, be specific and creative with descriptions.${contextInfo}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
