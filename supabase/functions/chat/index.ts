import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const FREE_SHIPPING_THRESHOLD = 500;

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractBearerToken(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function resolveUserFromToken(token: string | null) {
  if (!token) {
    return null;
  }

  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

    const { data, error } = await authClient.auth.getUser();

    if (error || !data.user) {
      console.error("auth.getUser failed:", error);
      return null;
    }

    return data.user;
  } catch (err) {
    console.error("resolveUserFromToken crashed:", err);
    return null;
  }
}

async function getProfile(userId: string) {
  const { data, error } = await serviceSupabase
    .from("profiles")
    .select("id, full_name, display_name, username, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("profiles query error:", error);
    return null;
  }

  return data;
}

async function getPointsSummary(userId: string) {
  const [balanceRes, ledgerRes] = await Promise.all([
    serviceSupabase
      .from("user_points")
      .select("balance, earned_total, spent_total, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    serviceSupabase
      .from("loyalty_points")
      .select("id, points, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (balanceRes.error) {
    console.error("user_points query error:", balanceRes.error);
  }

  if (ledgerRes.error) {
    console.error("loyalty_points query error:", ledgerRes.error);
  }

  const balance = balanceRes.data?.balance ?? 0;
  const earnedTotal =
    balanceRes.data?.earned_total ??
    (ledgerRes.data ?? [])
      .filter((row) => (row.points ?? 0) > 0)
      .reduce((sum, row) => sum + (row.points ?? 0), 0);

  const spentTotal =
    balanceRes.data?.spent_total ??
    Math.abs(
      (ledgerRes.data ?? [])
        .filter((row) => (row.points ?? 0) < 0)
        .reduce((sum, row) => sum + (row.points ?? 0), 0),
    );

  return {
    balance,
    earned_total: earnedTotal,
    spent_total: spentTotal,
    updated_at: balanceRes.data?.updated_at ?? null,
    recent_activity: (ledgerRes.data ?? []).map((row) => ({
      id: row.id,
      points: row.points,
      reason: row.reason,
      created_at: row.created_at,
    })),
  };
}

async function getRecentOrders(userId: string) {
  const { data, error } = await serviceSupabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("orders query error:", error);
    return [];
  }

  return data ?? [];
}

async function getRecommendedProducts(lastViewedProductId?: string | null) {
  let query = serviceSupabase
    .from("products")
    .select("id, name, slug, price, image_url, category")
    .eq("is_active", true)
    .limit(4);

  if (lastViewedProductId) {
    query = query.neq("id", lastViewedProductId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("products query error:", error);
    return [];
  }

  return data ?? [];
}

async function getLastViewedProduct(userId: string) {
  const { data, error } = await serviceSupabase
    .from("product_views")
    .select(`
      viewed_at,
      product:products (
        id,
        name,
        slug,
        price,
        image_url,
        category
      )
    `)
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("product_views query error:", error);
    return null;
  }

  return data?.product
    ? {
        ...(data.product as Record<string, unknown>),
        viewed_at: data.viewed_at,
      }
    : null;
}

function getDisplayName(user: any, profile: any) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (typeof user?.email === "string" ? user.email.split("@")[0] : null) ||
    "there"
  );
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} kr`;
  }
}

function buildGreetingText(name: string, context: any) {
  const parts: string[] = [`Welcome back, ${name}.`];

  if (typeof context.points?.balance === "number") {
    parts.push(`You currently have ${context.points.balance} loyalty points.`);
  }

  if (context.last_order) {
    parts.push(
      `Your latest order is ${context.last_order.status ?? "in progress"} and totals ${formatCurrency(
        Number(context.last_order.total ?? 0),
      )}.`,
    );
  }

  if (
    typeof context.cart?.free_shipping_gap === "number" &&
    context.cart.free_shipping_gap > 0
  ) {
    parts.push(
      `You are ${formatCurrency(context.cart.free_shipping_gap)} away from free shipping.`,
    );
  } else if (context.cart?.item_count > 0) {
    parts.push("You already qualify for free shipping.");
  }

  if (context.last_viewed_product?.name) {
    parts.push(`You recently viewed ${context.last_viewed_product.name}.`);
  }

  return parts.join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const cart = body?.cart ?? {};
    const cartTotal = Number(cart.total ?? 0);
    const cartItemCount = Number(cart.item_count ?? 0);
    const freeShippingGap = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

    const token = extractBearerToken(req);
    const user = await resolveUserFromToken(token);
    const userId = user?.id ?? null;

    const signedOutFallback = jsonResponse({
      payload: {
        text: "I can help with products and general shop questions. Sign in for account-specific help.",
        suggestions: ["Show featured products", "Help me choose a gift", "Go to cart"],
      },
    });

    if (!userId) {
      if (/points|loyalty|balance|voucher|reward/i.test(lastUserMsg)) {
        return jsonResponse({
          payload: {
            text: "I couldn't verify your signed-in account. Please sign in again, then try checking your points.",
            links: [{ label: "Open account", url: "/account" }],
          },
        });
      }

      if (/latest order|recent orders|my orders|order status/i.test(lastUserMsg)) {
        return jsonResponse({
          payload: {
            text: "I couldn't verify your signed-in account. Please sign in again, then try viewing your orders.",
            links: [{ label: "Open account", url: "/account" }],
          },
        });
      }

      return signedOutFallback;
    }

    const [profile, points, orders, lastViewed] = await Promise.all([
      getProfile(userId),
      getPointsSummary(userId),
      getRecentOrders(userId),
      getLastViewedProduct(userId),
    ]);

    const recommended = await getRecommendedProducts((lastViewed as any)?.id as string | null);

    const context = {
      user: {
        id: userId,
        email: user.email ?? null,
        name: getDisplayName(user, profile),
        last_sign_in_at: user.last_sign_in_at ?? null,
      },
      cart: {
        total: cartTotal,
        item_count: cartItemCount,
        free_shipping_gap: freeShippingGap,
        qualifies_for_free_shipping: freeShippingGap <= 0 && cartItemCount > 0,
      },
      points,
      last_order: orders[0] ?? null,
      recent_orders: orders,
      last_viewed_product: lastViewed,
      recommended_products: recommended,
      current_page: body?.page ?? null,
    };

    if (/points|loyalty|balance|reward/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text: `You currently have ${context.points.balance} loyalty points.`,
          points: context.points.balance,
          pointSummary: {
            earnedTotal: context.points.earned_total,
            spentTotal: context.points.spent_total,
          },
          activity: context.points.recent_activity,
          links: [{ label: "Open points", url: "/account?tab=points" }],
          suggestions: ["Show my latest order", "Recommended products for me"],
          context,
        },
      });
    }

    if (/latest order|recent orders|my orders|order status/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text: orders.length
            ? "Here are your most recent orders."
            : "I couldn't find any recent orders on your account.",
          orders: orders.map((o: any) => ({
            orderNumber: o.id,
            status: o.status,
            total: o.total,
            createdAt: o.created_at,
            url: "/account?tab=orders",
          })),
          links: [{ label: "Open my orders", url: "/account?tab=orders" }],
          suggestions: [
            context.points.balance > 0 ? "Show my points" : "Recommended products for me",
          ].filter(Boolean),
          context,
        },
      });
    }

    if (/recommend|suggest|for me|what should i buy|show products/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text: recommended.length
            ? `Here are some product suggestions for you${lastViewed?.name ? ` based on your recent interest in ${lastViewed.name}` : ""}.`
            : "I couldn't find product recommendations right now.",
          products: recommended.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image_url: p.image_url,
            url: p.slug ? `/product/${p.slug}` : "/shop",
          })),
          links: [{ label: "Browse shop", url: "/shop" }],
          context,
        },
      });
    }

    if (/free shipping|cart|checkout/i.test(lastUserMsg)) {
      const text =
        freeShippingGap > 0
          ? `You are ${formatCurrency(freeShippingGap)} away from free shipping.`
          : cartItemCount > 0
            ? "Great news — your cart already qualifies for free shipping."
            : "Your cart is empty right now.";

      return jsonResponse({
        payload: {
          text,
          cart: context.cart,
          links: [{ label: "Open cart", url: "/cart" }],
          suggestions: ["Recommended products for me", "Show my latest order"],
          context,
        },
      });
    }

    return jsonResponse({
      payload: {
        text: buildGreetingText(context.user.name, context),
        links: [
          context.last_order ? { label: "Continue last order", url: "/account?tab=orders" } : null,
          { label: "My points", url: "/account?tab=points" },
          { label: "Go to cart", url: "/cart" },
          lastViewed?.slug ? { label: `Back to ${lastViewed.name}`, url: `/product/${lastViewed.slug}` } : null,
        ].filter(Boolean),
        suggestions: [
          "Show my points",
          "Show my latest order",
          "Recommended products for me",
          freeShippingGap > 0 ? "How far am I from free shipping?" : "Open my cart",
        ],
        context,
      },
    });
  } catch (e) {
    console.error("chat function crash:", e);

    return jsonResponse({
      payload: {
        text: "I can chat, but I couldn't access your account details right now.",
      },
    });
  }
});
