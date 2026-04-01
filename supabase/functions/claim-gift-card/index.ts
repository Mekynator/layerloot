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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = req.headers.get("Authorization");
    const token = auth?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    const { user, authError } = await resolveUserFromToken(token);

    if (!user?.id) {
      return jsonResponse({ error: authError || "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const notificationId = typeof body?.notificationId === "string" ? body.notificationId : "";
    const userVoucherId = typeof body?.userVoucherId === "string" ? body.userVoucherId : "";

    if (!notificationId || !userVoucherId) {
      return jsonResponse({ error: "notificationId and userVoucherId are required" }, 400);
    }

    // Load notification
    const { data: notification, error: notifError } = await serviceSupabase
      .from("user_gift_notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (notifError || !notification) {
      return jsonResponse({ error: "Notification not found" }, 404);
    }

    if (notification.gift_status !== "pending") {
      return jsonResponse({ error: "This gift has already been claimed or is not pending" }, 400);
    }

    // Load voucher
    const { data: voucher, error: voucherError } = await serviceSupabase
      .from("user_vouchers")
      .select("*")
      .eq("id", userVoucherId)
      .maybeSingle();

    if (voucherError || !voucher) {
      return jsonResponse({ error: "Voucher not found" }, 404);
    }

    if (voucher.gift_status !== "pending_claim") {
      return jsonResponse({ error: "This voucher is not pending claim" }, 400);
    }

    // Transfer ownership
    const now = new Date().toISOString();

    const { error: transferError } = await serviceSupabase
      .from("user_vouchers")
      .update({
        user_id: user.id,
        recipient_user_id: user.id,
        gift_status: "claimed",
        claimed_at: now,
      })
      .eq("id", voucher.id)
      .eq("gift_status", "pending_claim");

    if (transferError) {
      return jsonResponse({ error: transferError.message }, 500);
    }

    // Mark notification as claimed
    const { error: notifUpdateError } = await serviceSupabase
      .from("user_gift_notifications")
      .update({
        is_read: true,
        gift_status: "claimed",
        claimed_at: now,
      })
      .eq("id", notification.id)
      .eq("user_id", user.id);

    if (notifUpdateError) {
      console.error("Failed to update notification:", notifUpdateError);
    }

    return jsonResponse({
      success: true,
      message: "Gift card claimed successfully",
    });
  } catch (error) {
    console.error("claim-gift-card crash:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unknown crash",
    }, 500);
  }
});
