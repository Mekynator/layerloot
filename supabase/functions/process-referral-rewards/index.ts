import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const INVITER_POINTS = 25;
const INVITED_POINTS = 15;
const VALID_ORDER_STATUSES = ["paid", "completed", "processing", "shipped", "delivered"];

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

    // 1. If ref_code provided, link invited user on registration
    if (ref_code && user_id) {
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

        return new Response(JSON.stringify({ linked: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if there's an email-based invite
      const { data: session } = await sb.auth.admin.getUserById(user_id);
      const email = session?.user?.email?.toLowerCase();

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

          return new Response(JSON.stringify({ linked: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ linked: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. If order_id provided, check if this user was invited and grant points
    if (order_id && user_id) {
      // Verify order is valid
      const { data: order } = await sb
        .from("orders")
        .select("id, status, user_id, total")
        .eq("id", order_id)
        .single();

      if (!order || order.user_id !== user_id) {
        return new Response(JSON.stringify({ error: "Invalid order" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!VALID_ORDER_STATUSES.includes(order.status)) {
        return new Response(JSON.stringify({ skipped: true, reason: "Invalid order status" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ skipped: true, reason: "No referral found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let pointsGranted = false;

      // Update status to ordered if first order
      if (invite.status === "registered") {
        await sb.from("referral_invites").update({
          status: "ordered",
          first_order_id: order_id,
          first_order_at: new Date().toISOString(),
        }).eq("id", invite.id);
      }

      // Grant inviter points (once per invited user)
      if (!invite.inviter_points_granted) {
        await sb.from("loyalty_points").insert({
          user_id: invite.inviter_user_id,
          points: INVITER_POINTS,
          reason: `Referral reward: invited user placed first order`,
          order_id: order_id,
        });
        await sb.from("referral_invites").update({
          inviter_points_granted: true,
        }).eq("id", invite.id);
        pointsGranted = true;
      }

      // Grant invited user points (once)
      if (!invite.invited_points_granted) {
        await sb.from("loyalty_points").insert({
          user_id: user_id,
          points: INVITED_POINTS,
          reason: `Welcome reward: first order as invited user`,
          order_id: order_id,
        });
        await sb.from("referral_invites").update({
          invited_points_granted: true,
        }).eq("id", invite.id);
        pointsGranted = true;
      }

      return new Response(JSON.stringify({ processed: true, pointsGranted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
