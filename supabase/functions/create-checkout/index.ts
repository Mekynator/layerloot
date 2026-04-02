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

type AppliedSavingInput = {
  code: string;
  category: "discount" | "voucher" | "gift_card" | "free_shipping";
  appliedAmount: number;
  userVoucherId?: string;
  voucherType?: string;
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

/** Validate a single applied saving server-side */
async function validateAppliedSaving(
  saving: AppliedSavingInput,
  userId: string,
  userEmail: string | null,
) {
  if (!saving.userVoucherId) return null; // manual code without voucher id - skip for now

  const { data, error } = await serviceSupabase
    .from("user_vouchers")
    .select("id, user_id, code, is_used, balance, recipient_email, vouchers(name, discount_type, discount_value)")
    .eq("id", saving.userVoucherId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Voucher ${saving.code} not found`);

  const row = data as VoucherRow;
  const voucher = normalizeVoucherDefinition(row.vouchers);

  if (!voucher) throw new Error("Voucher definition is missing");
  if (row.is_used) throw new Error(`Voucher ${saving.code} has already been used`);

  // Ownership check
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  const recipientEmail = (row.recipient_email || "").trim().toLowerCase();
  const isRecipient = !!recipientEmail && recipientEmail === normalizedEmail;
  const isOwner = row.user_id === userId;

  if (voucher.discount_type === "gift_card") {
    if (!isRecipient && !(isOwner && !row.recipient_email)) {
      throw new Error("This gift card is not available on your account");
    }
    const balance = Number(row.balance ?? voucher.discount_value ?? 0);
    if (balance <= 0) throw new Error("This gift card has no balance left");
    if (saving.appliedAmount > balance) {
      throw new Error("Applied amount exceeds gift card balance");
    }
  } else if (!isOwner) {
    throw new Error("This voucher is not available on your account");
  }

  return { row, voucher };
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
    const appliedSavings: AppliedSavingInput[] = Array.isArray(body?.appliedSavings) ? body.appliedSavings : [];
    // Legacy single discount code support
    const legacyDiscountCode = typeof body?.discountCode === "string" ? body.discountCode.trim() : "";
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

    // Validate all applied savings server-side
    if (appliedSavings.length > 0 && !authUser) {
      return jsonResponse({ error: "Sign in to use discounts and rewards" }, 401);
    }

    let totalDiscountAmount = 0;
    const validatedSavings: Array<AppliedSavingInput & { name?: string }> = [];

    for (const saving of appliedSavings) {
      await validateAppliedSaving(saving, authUser?.id || "", authUser?.email || null);
      validatedSavings.push(saving);

      if (saving.category !== "gift_card") {
        totalDiscountAmount += saving.appliedAmount;
      }
    }

    // Gift card deductions are handled as discount too for Stripe
    const giftCardSaving = validatedSavings.find((s) => s.category === "gift_card");
    const giftCardAmount = giftCardSaving?.appliedAmount ?? 0;
    totalDiscountAmount += giftCardAmount;

    // Build Stripe line items
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

    // Create Stripe coupon if there are savings
    let couponId: string | undefined;
    if (totalDiscountAmount > 0) {
      const coupon = await stripe.coupons.create({
        duration: "once",
        amount_off: Math.round(totalDiscountAmount * 100),
        currency: "dkk",
        name: validatedSavings.map((s) => s.code).join(" + "),
      });
      couponId = coupon.id;
    }

    // Build metadata for webhook
    const savingsMetadata = JSON.stringify(validatedSavings.map((s) => ({
      code: s.code,
      category: s.category,
      appliedAmount: s.appliedAmount,
      userVoucherId: s.userVoucherId,
      voucherType: s.voucherType,
    })));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      metadata: {
        applied_savings: savingsMetadata,
        // Legacy fields for backward compat
        discount_code: validatedSavings.find((s) => s.category === "voucher" || s.category === "discount")?.code || legacyDiscountCode || "",
        user_voucher_id: validatedSavings.find((s) => s.category === "voucher" || s.category === "discount")?.userVoucherId || "",
        voucher_type: validatedSavings.find((s) => s.category === "voucher" || s.category === "discount")?.voucherType || "",
        gift_card_voucher_id: giftCardSaving?.userVoucherId || "",
        gift_card_amount: String(giftCardAmount),
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
