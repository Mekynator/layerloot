import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

type CheckoutItem = {
  id?: string;
  product_id?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
  material?: string | null;
  color?: string | null;
  size?: string | null;
};

type VoucherRow = {
  id: string;
  user_id: string;
  code: string;
  is_used: boolean;
  balance: number | null;
  recipient_email: string | null;
  vouchers: {
    name: string;
    discount_type: string;
    discount_value: number;
  } | {
    name: string;
    discount_type: string;
    discount_value: number;
  }[] | null;
};

type ResolvedVoucher = {
  id: string;
  code: string;
  name: string;
  voucherType: string;
  discountAmount: number;
  percentOff: number | null;
};

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractBearerToken(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function resolveUserFromToken(token: string | null) {
  if (!token || !SUPABASE_ANON_KEY) return null;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function normalizeVoucherDefinition(voucher: VoucherRow["vouchers"]) {
  return Array.isArray(voucher) ? voucher[0] ?? null : voucher;
}

async function resolveVoucher(args: {
  code: string;
  userId: string;
  userEmail: string | null;
  shippingCost: number;
  itemsSubtotal: number;
}) {
  const { data, error } = await serviceSupabase
    .from("user_vouchers")
    .select("id, user_id, code, is_used, balance, recipient_email, vouchers(name, discount_type, discount_value)")
    .eq("code", args.code)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Voucher not found");

  const row = data as VoucherRow;
  const voucher = normalizeVoucherDefinition(row.vouchers);

  if (!voucher) throw new Error("Voucher definition is missing");
  if (row.is_used) throw new Error("This voucher has already been used");

  const normalizedEmail = (args.userEmail || "").trim().toLowerCase();
  const recipientEmail = (row.recipient_email || "").trim().toLowerCase();
  const isRecipient = !!recipientEmail && recipientEmail === normalizedEmail;
  const isOwnerWithUngiftedCard = row.user_id === args.userId && !row.recipient_email;
  const isOwnerVoucher = row.user_id === args.userId;

  if (voucher.discount_type === "gift_card") {
    if (!isRecipient && !isOwnerWithUngiftedCard) {
      throw new Error("This gift card is not available on your account");
    }
  } else if (!isOwnerVoucher) {
    throw new Error("This voucher is not available on your account");
  }

  let discountAmount = 0;
  let percentOff: number | null = null;

  if (voucher.discount_type === "percent_discount") {
    percentOff = Math.max(0, Math.min(100, Number(voucher.discount_value ?? 0)));
  } else if (voucher.discount_type === "free_shipping") {
    if (args.shippingCost <= 0) {
      throw new Error("Free delivery can only be used when shipping is charged");
    }
    discountAmount = Math.min(args.shippingCost, Math.max(0, Number(voucher.discount_value ?? args.shippingCost || 0)) || args.shippingCost);
  } else if (voucher.discount_type === "gift_card") {
    const availableBalance = Number(row.balance ?? voucher.discount_value ?? 0);
    if (availableBalance <= 0) throw new Error("This gift card has no balance left");
    discountAmount = Math.min(availableBalance, Math.max(args.itemsSubtotal + args.shippingCost, 0));
  } else {
    discountAmount = Math.min(Number(voucher.discount_value ?? 0), Math.max(args.itemsSubtotal + args.shippingCost, 0));
  }

  if (percentOff === null && discountAmount <= 0) {
    throw new Error("This voucher cannot be applied to the current checkout");
  }

  return {
    id: row.id,
    code: row.code,
    name: voucher.name,
    voucherType: voucher.discount_type,
    discountAmount,
    percentOff,
  } satisfies ResolvedVoucher;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? (body.items as CheckoutItem[]) : [];
    const shippingCost = Math.max(0, Number(body?.shippingCost ?? 0));
    const discountCode = typeof body?.discountCode === "string" ? body.discountCode.trim() : "";
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "http://localhost:5173";
    const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;

    const successUrl = typeof body?.success_url === "string" && body.success_url.trim().length > 0
      ? body.success_url
      : normalizedOrigin + "/checkout/success";

    const cancelUrl = typeof body?.cancel_url === "string" && body.cancel_url.trim().length > 0
      ? body.cancel_url
      : normalizedOrigin + "/cart";

    if (items.length === 0) {
      return jsonResponse({ error: "Cart is empty" }, 400);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
    const token = extractBearerToken(req);
    const authUser = await resolveUserFromToken(token);

    const itemsSubtotal = items.reduce((sum, item) => {
      const qty = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
      const unit = Math.max(0, Number(item.price ?? 0));
      return sum + qty * unit;
    }, 0);

    let resolvedVoucher: ResolvedVoucher | null = null;
    if (discountCode) {
      if (!authUser) {
        return jsonResponse({ error: "Sign in to use a voucher or gift card" }, 401);
      }

      resolvedVoucher = await resolveVoucher({
        code: discountCode,
        userId: authUser.id,
        userEmail: authUser.email || null,
        shippingCost,
        itemsSubtotal,
      });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const name = (item.name || "LayerLoot Product").slice(0, 120);
      const qty = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
      const unitAmount = Math.max(0, Math.round(Number(item.price ?? 0) * 100));
      const attrs = [item.material, item.color, item.size].filter(Boolean).join(" - ");

      return {
        quantity: qty,
        price_data: {
          currency: "dkk",
          unit_amount: unitAmount,
          product_data: {
            name,
            description: attrs || undefined,
            images: item.image ? [item.image] : undefined,
            metadata: {
              product_id: String(item.product_id || item.id || ""),
            },
          },
        },
      };
    });

    if (shippingCost > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "dkk",
          unit_amount: Math.round(shippingCost * 100),
          product_data: { name: "Shipping" },
        },
      });
    }

    let couponId: string | undefined;
    if (resolvedVoucher) {
      const coupon = await stripe.coupons.create(
        resolvedVoucher.percentOff !== null
          ? {
              duration: "once",
              percent_off: resolvedVoucher.percentOff,
              name: resolvedVoucher.name,
            }
          : {
              duration: "once",
              amount_off: Math.round(resolvedVoucher.discountAmount * 100),
              currency: "dkk",
              name: resolvedVoucher.name,
            },
      );
      couponId = coupon.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      metadata: {
        discount_code: resolvedVoucher?.code || "",
        user_voucher_id: resolvedVoucher?.id || "",
        voucher_type: resolvedVoucher?.voucherType || "",
        source: "cart",
        user_id: authUser?.id || "",
      },
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("create-checkout error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
