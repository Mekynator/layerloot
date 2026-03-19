import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const FREE_SHIPPING_THRESHOLD = 500;

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

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveUserFromToken(token: string | null) {
  if (!token) return { user: null, authError: "No bearer token provided" };

  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.getUser();

    if (error || !data.user) {
      return { user: null, authError: error?.message || "auth.getUser returned no user" };
    }

    return { user: data.user, authError: null };
  } catch (error) {
    return { user: null, authError: error instanceof Error ? error.message : "Unknown auth crash" };
  }
}

async function tryProfile(userId: string) {
  try {
    const { data, error } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, display_name, username")
      .eq("id", userId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message, data: null };
    return { ok: true, error: null, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown profile crash", data: null };
  }
}

async function tryPoints(userId: string) {
  const result = {
    ok: true,
    error: null as string | null,
    balance: 0,
    earned_total: 0,
    spent_total: 0,
    recent_activity: [] as any[],
  };

  try {
    const { data: userPoints, error: userPointsError } = await serviceSupabase
      .from("user_points")
      .select("balance, earned_total, spent_total, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (userPointsError) {
      result.ok = false;
      result.error = `user_points: ${userPointsError.message}`;
    } else if (userPoints) {
      result.balance = userPoints.balance ?? 0;
      result.earned_total = userPoints.earned_total ?? 0;
      result.spent_total = userPoints.spent_total ?? 0;
    }

    const { data: loyaltyRows, error: loyaltyError } = await serviceSupabase
      .from("loyalty_points")
      .select("id, points, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (loyaltyError) {
      result.ok = false;
      result.error = result.error
        ? `${result.error} | loyalty_points: ${loyaltyError.message}`
        : `loyalty_points: ${loyaltyError.message}`;
    } else {
      result.recent_activity = loyaltyRows ?? [];
      if (!userPoints) {
        result.balance = (loyaltyRows ?? []).reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0);
        result.earned_total = (loyaltyRows ?? [])
          .filter((row: any) => Number(row.points ?? 0) > 0)
          .reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0);
        result.spent_total = Math.abs(
          (loyaltyRows ?? [])
            .filter((row: any) => Number(row.points ?? 0) < 0)
            .reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0),
        );
      }
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown points crash",
      balance: 0,
      earned_total: 0,
      spent_total: 0,
      recent_activity: [],
    };
  }
}

async function tryOrders(userId: string) {
  try {
    const fields = ["total", "total_amount", "amount_total"];
    for (const field of fields) {
      const { data, error } = await serviceSupabase
        .from("orders")
        .select(`id,status,${field},created_at`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!error) {
        return {
          ok: true,
          error: null,
          data: (data ?? []).map((row: any) => ({
            id: row.id,
            status: row.status,
            total: Number(row[field] ?? 0),
            created_at: row.created_at,
          })),
          detectedTotalField: field,
        };
      }
    }

    return {
      ok: false,
      error: "Could not read any supported total field from orders",
      data: [],
      detectedTotalField: null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown orders crash",
      data: [],
      detectedTotalField: null,
    };
  }
}

async function tryProductViews(userId: string) {
  try {
    const { data, error } = await serviceSupabase
      .from("products_views")
      .select(
        `
        viewed_at,
        product:products (
          id,
          name,
          slug,
          price,
          image_url
        )
      `,
      )
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, error: error.message, data: null };

    return {
      ok: true,
      error: null,
      data: data?.products
        ? {
            ...(data.products as Record<string, unknown>),
            viewed_at: data.viewed_at,
          }
        : null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown products_views crash",
      data: null,
    };
  }
}

async function tryRecommendedProducts(excludeId?: string | null) {
  try {
    let query = serviceSupabase.from("products").select("id,name,slug,price,image_url").limit(4);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data: activeData, error: activeError } = await query
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!activeError) {
      return {
        ok: true,
        error: null,
        usedActiveFilter: true,
        data: (activeData ?? []).map((row: any) => ({
          ...row,
          url: row.slug ? `/products/${row.slug}` : "/products",
        })),
      };
    }

    const { data: fallbackData, error: fallbackError } = await serviceSupabase
      .from("products")
      .select("id,name,slug,price,image_url")
      .limit(4)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      return {
        ok: false,
        error: `${activeError.message} | ${fallbackError.message}`,
        usedActiveFilter: false,
        data: [],
      };
    }

    return {
      ok: true,
      error: null,
      usedActiveFilter: false,
      data: (fallbackData ?? []).map((row: any) => ({
        ...row,
        url: row.slug ? `/products/${row.slug}` : "/products",
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown products crash",
      usedActiveFilter: false,
      data: [],
    };
  }
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
    const { user, authError } = await resolveUserFromToken(token);

    if (!user?.id) {
      return jsonResponse({
        payload: {
          text: "I can help with products, shipping, custom prints, and general shop questions. Sign in for points and order status.",
          suggestions: ["Show best sellers", "Shipping information", "Custom print help"],
        },
        debug: {
          authError,
          hasAuthorizationHeader: !!token,
        },
      });
    }

    const profile = await tryProfile(user.id);
    const points = await tryPoints(user.id);
    const orders = await tryOrders(user.id);
    const lastViewed = await tryProductViewsViews(user.id);
    const recommended = await tryRecommendedProducts((lastViewed.data as any)?.id as string | null);

    const context = {
      user: {
        id: user.id,
        email: user.email ?? null,
        name: getDisplayName(user, profile.data),
        last_sign_in_at: user.last_sign_in_at ?? null,
      },
      cart: {
        total: cartTotal,
        item_count: cartItemCount,
        free_shipping_gap: freeShippingGap,
        qualifies_for_free_shipping: freeShippingGap <= 0 && cartItemCount > 0,
      },
      points: {
        balance: points.balance,
        earned_total: points.earned_total,
        spent_total: points.spent_total,
        recent_activity: points.recent_activity,
      },
      last_order: orders.data[0] ?? null,
      recent_orders: orders.data,
      last_viewed_product: lastViewed.data,
      recommended_products: recommended.data,
      current_page: body?.page ?? null,
    };

    const debug = {
      authError,
      profile,
      points: { ok: points.ok, error: points.error },
      orders: { ok: orders.ok, error: orders.error, detectedTotalField: orders.detectedTotalField },
      productViews: { ok: lastViewed.ok, error: lastViewed.error },
      recommendedProducts: {
        ok: recommended.ok,
        error: recommended.error,
        usedActiveFilter: recommended.usedActiveFilter,
      },
    };

    if (/points|loyalty|balance|reward/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text: `You currently have ${context.points.balance} loyalty points. You have earned ${context.points.earned_total} and spent ${context.points.spent_total}.`,
          points: context.points.balance,
          pointSummary: {
            earnedTotal: context.points.earned_total,
            spentTotal: context.points.spent_total,
          },
          activity: context.points.recent_activity,
          cart: context.cart,
          links: [{ label: "Open points", url: "/account?tab=points" }],
          suggestions: ["Show my latest order", "Recommended products for me", "How far am I from free shipping?"],
          context,
        },
        debug,
      });
    }

    if (/latest order|recent orders|my orders|order status/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text: orders.data.length
            ? `I found ${orders.data.length} recent order${orders.data.length > 1 ? "s" : ""}. Your latest order is ${orders.data[0].status}.`
            : "I could not find recent orders, but your account connection is working.",
          orders: orders.data.map((o: any) => ({
            orderNumber: o.id,
            status: o.status,
            total: o.total,
            createdAt: o.created_at,
            url: "/account?tab=orders",
          })),
          cart: context.cart,
          links: [{ label: "Open my orders", url: "/account?tab=orders" }],
          suggestions: ["Show my points", "Recommended products for me"],
          context,
        },
        debug,
      });
    }

    if (/recommend|suggest|for me|what should i buy|show products/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text: recommended.data.length
            ? `Here are product suggestions for you${lastViewed.data && (lastViewed.data as any).name ? ` based on your recent interest in ${(lastViewed.data as any).name}` : ""}.`
            : "I could not build recommendations from the database right now, but the chat connection is working.",
          products: recommended.data,
          cart: context.cart,
          links: [{ label: "Browse shop", url: "/products" }],
          suggestions: ["Show my points", "Show my latest order"],
          context,
        },
        debug,
      });
    }

    if (/free shipping|cart|checkout/i.test(lastUserMsg)) {
      return jsonResponse({
        payload: {
          text:
            freeShippingGap > 0
              ? `You are ${freeShippingGap} kr away from free shipping. Your cart has ${cartItemCount} item(s).`
              : cartItemCount > 0
                ? "Your cart already qualifies for free shipping."
                : "Your cart is empty right now.",
          cart: context.cart,
          links: [{ label: "Open cart", url: "/cart" }],
          suggestions: ["Show my points", "Recommended products for me"],
          context,
        },
        debug,
      });
    }

    return jsonResponse({
      payload: {
        text: `Welcome back, ${context.user.name}. I can see your account connection is working. You have ${context.points.balance} points${context.last_order ? ` and your latest order is ${context.last_order.status}` : ""}.`,
        cart: context.cart,
        links: [
          { label: "My points", url: "/account?tab=points" },
          { label: "My orders", url: "/account?tab=orders" },
          { label: "Go to cart", url: "/cart" },
        ],
        suggestions: ["Show my points", "Show my latest order", "Recommended products for me"],
        context,
      },
      debug,
    });
  } catch (error) {
    console.error("chat verification crash:", error);

    return jsonResponse(
      {
        payload: {
          text: "The chat function crashed before completing the request.",
        },
        debug: {
          crash: error instanceof Error ? error.message : "Unknown crash",
        },
      },
      200,
    );
  }
});
