import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface DiscountRules {
  groups?: string[];
  specific_ids?: string[];
  new_registered_days?: number;
  newcomer_logic?: string;
  newcomer_days?: number;
  min_points?: number;
  min_orders?: number;
  achievement_keys?: string[];
  referral_requirements?: {
    min_successful_invites?: number;
    min_registered_invites?: number;
  };
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

    // 1. Fetch discount
    const { data: discount, error: discErr } = await sb
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode)
      .eq("is_active", true)
      .maybeSingle();

    if (discErr || !discount) {
      return jsonRes({ eligible: false, reason: "Discount not found or inactive" });
    }

    const debug: string[] = [];
    const now = new Date();

    // 2. Date checks
    if (discount.starts_at && new Date(discount.starts_at) > now) {
      return jsonRes({ eligible: false, reason: "Discount not yet active", debug: ["starts_at in future"] });
    }
    if (discount.expires_at && new Date(discount.expires_at) < now) {
      return jsonRes({ eligible: false, reason: "Discount expired", debug: ["expires_at passed"] });
    }

    // 3. Global usage limit
    if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
      return jsonRes({ eligible: false, reason: "Discount usage limit reached", debug: ["max_uses exceeded"] });
    }

    // 4. Per-user usage limit
    if (discount.per_user_limit !== null && discount.per_user_limit > 0) {
      const { count } = await sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .contains("discount_metadata", { code: discountCode });
      if ((count ?? 0) >= discount.per_user_limit) {
        return jsonRes({ eligible: false, reason: "Per-user usage limit reached", debug: ["per_user_limit exceeded"] });
      }
    }

    // 5. Target mode routing
    const targetMode: string = discount.target_mode || "all";
    debug.push(`target_mode=${targetMode}`);

    let eligible = false;

    switch (targetMode) {
      case "all":
        eligible = true;
        debug.push("all users eligible");
        break;

      case "specific_user":
        eligible = discount.scope_target_user_id === userId;
        debug.push(eligible ? "matched scope_target_user_id" : "user_id mismatch");
        break;

      case "specific_users": {
        const rules = (discount.discount_rules || {}) as DiscountRules;
        const ids = rules.specific_ids || [];
        eligible = ids.includes(userId);
        debug.push(eligible ? `matched in specific_ids (${ids.length} total)` : "not in specific_ids list");
        break;
      }

      case "rules_based": {
        const rules = (discount.discount_rules || {}) as DiscountRules;
        const groups = rules.groups || [];
        debug.push(`rule groups: ${groups.join(", ")}`);

        if (groups.length === 0) {
          eligible = true;
          debug.push("no rule groups defined, treating as eligible");
          break;
        }

        // Evaluate each group — user must match at least one group (OR logic)
        for (const group of groups) {
          if (eligible) break;

          switch (group) {
            case "existing":
              eligible = true;
              debug.push("matched: existing user");
              break;

            case "specific": {
              const ids = rules.specific_ids || [];
              if (ids.includes(userId)) {
                eligible = true;
                debug.push("matched: specific user ID in rules");
              }
              break;
            }

            case "invited": {
              const { data: ref } = await sb
                .from("referral_invites")
                .select("id")
                .eq("invited_user_id", userId)
                .limit(1)
                .maybeSingle();
              if (ref) {
                eligible = true;
                debug.push("matched: invited user");
              } else {
                debug.push("failed: not an invited user");
              }
              break;
            }

            case "new_registered": {
              const days = rules.new_registered_days || 30;
              const { data: authData } = await sb.auth.admin.getUserById(userId);
              if (authData?.user?.created_at) {
                const created = new Date(authData.user.created_at);
                const diffMs = now.getTime() - created.getTime();
                if (diffMs <= days * 86400000) {
                  eligible = true;
                  debug.push(`matched: registered within ${days} days`);
                } else {
                  debug.push(`failed: registered ${Math.floor(diffMs / 86400000)} days ago, limit is ${days}`);
                }
              }
              break;
            }

            case "newcomer": {
              const days = rules.newcomer_days || 14;
              const logic = rules.newcomer_logic || "days";
              const { data: authData } = await sb.auth.admin.getUserById(userId);
              if (authData?.user?.created_at) {
                const created = new Date(authData.user.created_at);
                const diffMs = now.getTime() - created.getTime();
                if (logic === "zero_orders") {
                  if (diffMs <= days * 86400000) {
                    const { count } = await sb
                      .from("orders")
                      .select("id", { count: "exact", head: true })
                      .eq("user_id", userId);
                    if ((count ?? 0) === 0) {
                      eligible = true;
                      debug.push("matched: newcomer with zero orders");
                    } else {
                      debug.push(`failed: newcomer has ${count} orders`);
                    }
                  } else {
                    debug.push(`failed: not within newcomer window (${days} days)`);
                  }
                } else {
                  if (diffMs <= days * 86400000) {
                    eligible = true;
                    debug.push(`matched: newcomer within ${days} days`);
                  } else {
                    debug.push(`failed: not within newcomer window`);
                  }
                }
              }
              break;
            }

            case "min_points": {
              const minPts = rules.min_points || 0;
              if (minPts > 0) {
                const { data: pts } = await sb.rpc("get_user_points_balance", { _user_id: userId });
                const balance = (pts as number) ?? 0;
                if (balance >= minPts) {
                  eligible = true;
                  debug.push(`matched: ${balance} points >= ${minPts}`);
                } else {
                  debug.push(`failed: ${balance} points < ${minPts}`);
                }
              }
              break;
            }

            case "min_orders": {
              const minOrd = rules.min_orders || 0;
              if (minOrd > 0) {
                const { count } = await sb
                  .from("orders")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .in("status", ["paid", "completed", "shipped", "delivered"]);
                if ((count ?? 0) >= minOrd) {
                  eligible = true;
                  debug.push(`matched: ${count} orders >= ${minOrd}`);
                } else {
                  debug.push(`failed: ${count} orders < ${minOrd}`);
                }
              }
              break;
            }

            case "referral": {
              const req2 = rules.referral_requirements || {};
              const minSuccessful = req2.min_successful_invites || 0;
              const minRegistered = req2.min_registered_invites || 0;

              if (minSuccessful > 0 || minRegistered > 0) {
                const { data: invites } = await sb
                  .from("referral_invites")
                  .select("status")
                  .eq("inviter_user_id", userId);

                const allInvites = invites || [];
                const registered = allInvites.filter((i: { status: string }) => i.status === "registered" || i.status === "ordered").length;
                const ordered = allInvites.filter((i: { status: string }) => i.status === "ordered").length;

                const passRegistered = minRegistered <= 0 || registered >= minRegistered;
                const passSuccessful = minSuccessful <= 0 || ordered >= minSuccessful;

                if (passRegistered && passSuccessful) {
                  eligible = true;
                  debug.push(`matched: referral (${registered} registered, ${ordered} ordered)`);
                } else {
                  debug.push(`failed: referral (${registered}/${minRegistered} registered, ${ordered}/${minSuccessful} ordered)`);
                }
              }
              break;
            }

            case "achievement": {
              const keys = rules.achievement_keys || [];
              if (keys.length > 0) {
                const { data: points } = await sb
                  .from("loyalty_points")
                  .select("reason")
                  .eq("user_id", userId)
                  .in("reason", keys);
                if (points && points.length >= keys.length) {
                  eligible = true;
                  debug.push(`matched: has achievement keys`);
                } else {
                  debug.push(`failed: missing achievement keys`);
                }
              }
              break;
            }

            default:
              debug.push(`unknown group: ${group}`);
          }
        }
        break;
      }

      default:
        // Legacy fallback: check scope_target_user_id or discount_rules
        if (discount.scope_target_user_id) {
          eligible = discount.scope_target_user_id === userId;
        } else if (discount.discount_rules) {
          const rules = discount.discount_rules as DiscountRules;
          const ids = rules.specific_ids || [];
          eligible = ids.length === 0 || ids.includes(userId);
        } else {
          eligible = true;
        }
        debug.push(`legacy fallback, eligible=${eligible}`);
    }

    return jsonRes({
      eligible,
      discount_type: eligible ? discount.discount_type : undefined,
      discount_value: eligible ? discount.discount_value : undefined,
      reason: eligible ? undefined : "User does not match target audience",
      debug,
    });
  } catch (err) {
    console.error("validate-discount-eligibility error:", err);
    return jsonRes({ error: String(err) }, 500);
  }
});
