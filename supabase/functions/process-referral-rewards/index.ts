import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ORDER_STATUSES = ["paid", "completed", "processing", "shipped", "delivered"];
const INVALID_ORDER_STATUSES = ["cancelled", "refunded", "failed"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function isValidRefCode(v: unknown): v is string {
  return typeof v === "string" && v.length >= 4 && v.length <= 20;
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { order_id, user_id, ref_code } = body as {
      order_id?: string;
      user_id?: string;
      ref_code?: string;
    };

    // ── 1. Link invited user on registration ──
    if (ref_code && user_id) {
      if (!isValidRefCode(ref_code)) return jsonRes({ error: "Invalid ref_code format" }, 400);
      if (!isValidUuid(user_id)) return jsonRes({ error: "Invalid user_id format" }, 400);

      // Try code-based invite
      const { data: invite } = await sb
        .from("referral_invites")
        .select("*")
        .eq("invite_code", ref_code)
        .is("invited_user_id", null)
        .limit(1)
        .maybeSingle();

      if (invite && invite.inviter_user_id !== user_id) {
        await sb.from("referral_invites").update({
          invited_user_id: user_id,
          status: "registered",
          account_created_at: new Date().toISOString(),
        }).eq("id", invite.id);

        // Link profile
        await sb.from("profiles").update({
          referred_by_invite_id: invite.id,
        }).eq("user_id", user_id);

        return jsonRes({ linked: true, invite_id: invite.id });
      }

      // Try email-based invite
      const { data: authData } = await sb.auth.admin.getUserById(user_id);
      const email = authData?.user?.email?.toLowerCase();

      if (email) {
        const { data: emailInvite } = await sb
          .from("referral_invites")
          .select("*")
          .eq("invited_email", email)
          .is("invited_user_id", null)
          .limit(1)
          .maybeSingle();

        if (emailInvite && emailInvite.inviter_user_id !== user_id) {
          await sb.from("referral_invites").update({
            invited_user_id: user_id,
            status: "registered",
            account_created_at: new Date().toISOString(),
          }).eq("id", emailInvite.id);

          await sb.from("profiles").update({
            referred_by_invite_id: emailInvite.id,
          }).eq("user_id", user_id);

          return jsonRes({ linked: true, invite_id: emailInvite.id });
        }
      }

      return jsonRes({ linked: false });
    }

    // ── 2. Process order-based referral rewards ──
    if (order_id && user_id) {
      if (!isValidUuid(order_id)) return jsonRes({ error: "Invalid order_id format" }, 400);
      if (!isValidUuid(user_id)) return jsonRes({ error: "Invalid user_id format" }, 400);

      // Verify order
      const { data: order } = await sb
        .from("orders")
        .select("id, status, user_id, total")
        .eq("id", order_id)
        .single();

      if (!order || order.user_id !== user_id) {
        return jsonRes({ error: "Invalid order" }, 400);
      }

      if (INVALID_ORDER_STATUSES.includes(order.status)) {
        return jsonRes({ skipped: true, reason: "Order status is invalid for rewards" });
      }

      if (!VALID_ORDER_STATUSES.includes(order.status)) {
        return jsonRes({ skipped: true, reason: "Order status not qualifying" });
      }

      // Find the referral invite for this user
      const { data: invite } = await sb
        .from("referral_invites")
        .select("*")
        .eq("invited_user_id", user_id)
        .in("status", ["registered", "ordered"])
        .limit(1)
        .maybeSingle();

      if (!invite) {
        return jsonRes({ skipped: true, reason: "No referral found" });
      }

      const inviterPoints = invite.inviter_points_amount ?? 25;
      const invitedPoints = invite.invited_points_amount ?? 15;
      let pointsGranted = false;

      // Update status to ordered if first order
      if (invite.status === "registered") {
        await sb.from("referral_invites").update({
          status: "ordered",
          first_order_id: order_id,
          first_order_at: new Date().toISOString(),
        }).eq("id", invite.id);
      }

      // Grant inviter points (idempotent: check flag AND existing loyalty row)
      if (!invite.inviter_points_granted) {
        const { data: existing } = await sb
          .from("loyalty_points")
          .select("id")
          .eq("user_id", invite.inviter_user_id)
          .eq("order_id", order_id)
          .like("reason", "Referral reward:%")
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await sb.from("loyalty_points").insert({
            user_id: invite.inviter_user_id,
            points: inviterPoints,
            reason: `Referral reward: invited user placed first order`,
            order_id: order_id,
          });
        }
        await sb.from("referral_invites").update({
          inviter_points_granted: true,
        }).eq("id", invite.id);
        pointsGranted = true;
      }

      // Grant invited user points (idempotent)
      if (!invite.invited_points_granted) {
        const { data: existing } = await sb
          .from("loyalty_points")
          .select("id")
          .eq("user_id", user_id)
          .eq("order_id", order_id)
          .like("reason", "Welcome reward:%")
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await sb.from("loyalty_points").insert({
            user_id: user_id,
            points: invitedPoints,
            reason: `Welcome reward: first order as invited user`,
            order_id: order_id,
          });
        }
        await sb.from("referral_invites").update({
          invited_points_granted: true,
        }).eq("id", invite.id);
        pointsGranted = true;
      }

      // Set reward_granted_at when both flags are true
      const { data: updated } = await sb
        .from("referral_invites")
        .select("inviter_points_granted, invited_points_granted, reward_granted_at")
        .eq("id", invite.id)
        .single();

      if (updated && updated.inviter_points_granted && updated.invited_points_granted && !updated.reward_granted_at) {
        await sb.from("referral_invites").update({
          reward_granted_at: new Date().toISOString(),
        }).eq("id", invite.id);
      }

      return jsonRes({ processed: true, pointsGranted, inviterPoints, invitedPoints });
    }

    return jsonRes({ error: "Missing parameters: provide (ref_code + user_id) or (order_id + user_id)" }, 400);
  } catch (err) {
    console.error("process-referral-rewards error:", err);
    return jsonRes({ error: String(err) }, 500);
  }
});
