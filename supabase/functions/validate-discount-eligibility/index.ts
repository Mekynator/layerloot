import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AudienceConfig {
  mode?: string;
  groups?: string[];
  specific_ids?: string[];
  new_registered_days?: number;
  newcomer_days?: number;
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
    const discountCode = typeof body.discount_code === "string" ? body.discount_code.trim() : "";
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";

    if (!discountCode) return jsonRes({ error: "discount_code required" }, 400);
    if (!userId) return jsonRes({ error: "user_id required" }, 400);

    // Fetch discount
    const { data: discount, error: discErr } = await sb
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode)
      .eq("is_active", true)
      .maybeSingle();

    if (discErr || !discount) {
      return jsonRes({ eligible: false, reason: "Discount not found or inactive" });
    }

    // Check validity dates
    const now = new Date();
    if (discount.starts_at && new Date(discount.starts_at) > now) {
      return jsonRes({ eligible: false, reason: "Discount not yet active" });
    }
    if (discount.expires_at && new Date(discount.expires_at) < now) {
      return jsonRes({ eligible: false, reason: "Discount expired" });
    }

    // Check usage limits
    if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
      return jsonRes({ eligible: false, reason: "Discount usage limit reached" });
    }

    // Check min order amount (caller should pass this if needed)
    // For now we focus on audience targeting

    // Parse audience config from scope_target_user_id
    let audience: AudienceConfig = {};
    if (discount.scope_target_user_id) {
      try {
        const raw = discount.scope_target_user_id;
        audience = typeof raw === "string" ? JSON.parse(raw) : {};
      } catch {
        // If it's a plain UUID, treat as specific user
        audience = { mode: "specific", specific_ids: [discount.scope_target_user_id] };
      }
    }

    // If no audience config, discount is available to all
    if (!audience.mode && (!audience.groups || audience.groups.length === 0)) {
      return jsonRes({
        eligible: true,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
      });
    }

    const groups = audience.groups || [];
    if (groups.length === 0 && audience.mode === "specific") {
      groups.push("specific");
    }

    let eligible = false;

    for (const group of groups) {
      if (eligible) break;

      switch (group) {
        case "all_existing":
          eligible = true;
          break;

        case "specific": {
          const ids = audience.specific_ids || [];
          eligible = ids.includes(userId);
          break;
        }

        case "invited": {
          const { data: ref } = await sb
            .from("referral_invites")
            .select("id")
            .eq("invited_user_id", userId)
            .limit(1)
            .maybeSingle();
          eligible = !!ref;
          break;
        }

        case "new_registered": {
          const days = audience.new_registered_days || 30;
          const { data: authData } = await sb.auth.admin.getUserById(userId);
          if (authData?.user?.created_at) {
            const created = new Date(authData.user.created_at);
            const diffMs = now.getTime() - created.getTime();
            eligible = diffMs <= days * 86400000;
          }
          break;
        }

        case "newcomer": {
          const days = audience.newcomer_days || 14;
          const { data: authData } = await sb.auth.admin.getUserById(userId);
          if (authData?.user?.created_at) {
            const created = new Date(authData.user.created_at);
            const diffMs = now.getTime() - created.getTime();
            if (diffMs <= days * 86400000) {
              // Also check no orders
              const { count } = await sb
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId);
              eligible = (count ?? 0) === 0;
            }
          }
          break;
        }
      }
    }

    return jsonRes({
      eligible,
      discount_type: eligible ? discount.discount_type : undefined,
      discount_value: eligible ? discount.discount_value : undefined,
      reason: eligible ? undefined : "User does not match target audience",
    });
  } catch (err) {
    console.error("validate-discount-eligibility error:", err);
    return jsonRes({ error: String(err) }, 500);
  }
});
