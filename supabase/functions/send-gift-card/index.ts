import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("GIFT_FROM_EMAIL") || Deno.env.get("FROM_EMAIL") || "LayerLoot <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

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
  if (!token || !SUPABASE_ANON_KEY) {
    return { user: null, authError: "Missing bearer token or anon key" };
  }

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

async function getSenderDisplayName(userId: string, fallbackEmail?: string | null) {
  const { data } = await serviceSupabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

  return (
    data?.full_name ||
    (typeof fallbackEmail === "string" ? fallbackEmail.split("@")[0] : null) ||
    "Someone"
  );
}

async function getVoucherWithDefinition(userVoucherId: string, userId: string) {
  const { data, error } = await serviceSupabase
    .from("user_vouchers")
    .select(`
      id,
      code,
      is_used,
      balance,
      recipient_email,
      recipient_name,
      redeemed_at,
      used_at,
      voucher_id,
      vouchers (
        id,
        name,
        discount_type,
        discount_value
      )
    `)
    .eq("id", userVoucherId)
    .eq("user_id", userId)
    .maybeSingle();

  return { data, error };
}

async function findUserByEmail(email: string) {
  let page = 1;
  const normalized = email.trim().toLowerCase();

  while (true) {
    const { data, error } = await serviceSupabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    const users = data?.users ?? [];
    const match = users.find((u) => (u.email || "").trim().toLowerCase() === normalized) || null;

    if (match) {
      return { user: match, error: null };
    }

    if (users.length < 200) {
      return { user: null, error: null };
    }

    page += 1;
  }
}

async function createRecipientNotification(args: {
  recipientUserId: string;
  userVoucherId: string;
  senderName: string;
  voucherName: string;
  giftValue: number;
}) {
  const message = `${args.senderName} gifted you ${args.voucherName}${args.giftValue ? ` (${Number(args.giftValue).toFixed(0)} kr)` : ""}.`;

  const { error } = await serviceSupabase.from("user_gift_notifications").insert({
    user_id: args.recipientUserId,
    user_voucher_id: args.userVoucherId,
    title: "You received a gift card",
    message,
    is_read: false,
  });

  return error;
}

async function sendResendEmail(args: {
  recipientEmail: string;
  recipientName?: string | null;
  senderName: string;
  voucherName: string;
  code: string;
  giftValue: number;
  giftMessage?: string | null;
}) {
  if (!RESEND_API_KEY) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY is missing" };
  }

  const safeRecipientName = args.recipientName?.trim() || "there";
  const accountUrl = `${SITE_URL.replace(/\/$/, "")}/account?tab=vouchers`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 8px;">You received a gift from LayerLoot</h2>
      <p>Hi ${safeRecipientName},</p>
      <p><strong>${args.senderName}</strong> gifted you <strong>${args.voucherName}</strong>.</p>
      <p><strong>Gift code:</strong> ${args.code}</p>
      <p><strong>Value:</strong> ${Number(args.giftValue).toFixed(2)} kr</p>
      ${
        args.giftMessage
          ? `<p><strong>Message:</strong><br/>${args.giftMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
          : ""
      }
      <p>You can sign in to your account to view the voucher, or use the gift code at checkout if supported.</p>
      <p><a href="${accountUrl}">Open my vouchers</a></p>
      <p>Enjoy,<br/>LayerLoot</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [args.recipientEmail],
      subject: `${args.senderName} sent you a LayerLoot gift card`,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      error: typeof payload?.message === "string" ? payload.message : "Resend request failed",
      payload,
    };
  }

  return { ok: true, skipped: false, payload };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const token = extractBearerToken(req);
    const { user, authError } = await resolveUserFromToken(token);

    if (!user?.id) {
      return jsonResponse({ error: authError || "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const userVoucherId = typeof body?.userVoucherId === "string" ? body.userVoucherId : "";
    const recipientEmail = typeof body?.recipientEmail === "string" ? body.recipientEmail.trim() : "";
    const recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim() : "";
    const giftMessage = typeof body?.giftMessage === "string" ? body.giftMessage.trim() : "";

    if (!userVoucherId) {
      return jsonResponse({ error: "userVoucherId is required" }, 400);
    }

    if (!recipientEmail) {
      return jsonResponse({ error: "recipientEmail is required" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return jsonResponse({ error: "recipientEmail is invalid" }, 400);
    }

    const { data: userVoucher, error: voucherError } = await getVoucherWithDefinition(userVoucherId, user.id);

    if (voucherError || !userVoucher) {
      return jsonResponse({ error: voucherError?.message || "Gift voucher not found" }, 404);
    }

    const voucherDef = Array.isArray(userVoucher.vouchers) ? userVoucher.vouchers[0] : userVoucher.vouchers;

    if (!voucherDef || voucherDef.discount_type !== "gift_card") {
      return jsonResponse({ error: "Only gift cards can be sent to recipients" }, 400);
    }

    if (userVoucher.is_used || (userVoucher.balance !== null && Number(userVoucher.balance) <= 0)) {
      return jsonResponse({ error: "This gift card is already used or has no balance left" }, 400);
    }

    const senderName = await getSenderDisplayName(user.id, user.email);

    const { error: updateError } = await serviceSupabase
      .from("user_vouchers")
      .update({
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        gift_message: giftMessage || null,
        gifted_at: new Date().toISOString(),
        gift_status: "gifted",
      })
      .eq("id", userVoucher.id)
      .eq("user_id", user.id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    const recipientLookup = await findUserByEmail(recipientEmail);
    let notificationCreated = false;

    if (recipientLookup.user?.id) {
      const notificationError = await createRecipientNotification({
        recipientUserId: recipientLookup.user.id,
        userVoucherId: userVoucher.id,
        senderName,
        voucherName: voucherDef.name,
        giftValue: Number(userVoucher.balance ?? voucherDef.discount_value ?? 0),
      });

      if (!notificationError) {
        notificationCreated = true;
      }
    }

    const emailResult = await sendResendEmail({
      recipientEmail,
      recipientName,
      senderName,
      voucherName: voucherDef.name,
      code: userVoucher.code,
      giftValue: Number(userVoucher.balance ?? voucherDef.discount_value ?? 0),
      giftMessage,
    });

    return jsonResponse({
      success: true,
      message: "Gift card sent successfully",
      emailSent: emailResult.ok,
      emailSkipped: emailResult.skipped,
      emailError: emailResult.ok ? null : emailResult.error,
      matchedExistingUser: !!recipientLookup.user?.id,
      notificationCreated,
    });
  } catch (error) {
    console.error("send-gift-card crash:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown crash",
      },
      500,
    );
  }
});
