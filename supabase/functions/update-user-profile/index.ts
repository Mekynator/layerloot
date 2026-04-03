import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 90 days of events for this user
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error: eventsErr } = await sb
      .from("user_events")
      .select("event_type, product_id, category_id, custom_order_id, metadata, created_at")
      .eq("user_id", user_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ status: "no_events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate categories
    const catCounts = new Map<string, number>();
    const materialCounts = new Map<string, number>();
    const colorCounts = new Map<string, number>();
    const prices: number[] = [];
    let customScore = 0;
    let reorderScore = 0;
    let rewardsScore = 0;
    let engagementScore = 0;

    const now = Date.now();
    for (const e of events) {
      // Recency weight: events from last 7 days get 3x, 30 days get 2x, rest 1x
      const age = now - new Date(e.created_at).getTime();
      const recencyW = age < 7 * 86400000 ? 3 : age < 30 * 86400000 ? 2 : 1;

      if (e.category_id) {
        catCounts.set(e.category_id, (catCounts.get(e.category_id) || 0) + recencyW);
      }

      const meta = (e.metadata as Record<string, any>) || {};
      if (meta.material) {
        const m = String(meta.material);
        materialCounts.set(m, (materialCounts.get(m) || 0) + recencyW);
      }
      if (meta.color) {
        const c = String(meta.color);
        colorCounts.set(c, (colorCounts.get(c) || 0) + recencyW);
      }
      if (meta.price && typeof meta.price === "number") {
        prices.push(meta.price);
      }

      // Score accumulators
      if (e.event_type === "custom_request_started" || e.event_type === "custom_request_submitted") {
        customScore += 10 * recencyW;
      }
      if (e.event_type === "reorder_clicked" || e.event_type === "purchase_completed") {
        reorderScore += 5 * recencyW;
      }
      if (e.event_type === "reward_viewed" || e.event_type === "reward_redeemed") {
        rewardsScore += 5 * recencyW;
      }
      engagementScore += recencyW;
    }

    // Sort and take top N
    const topN = (map: Map<string, number>, n: number) =>
      [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

    const preferredCategories = topN(catCounts, 5);
    const preferredMaterials = topN(materialCounts, 5);
    const preferredColors = topN(colorCounts, 5);

    const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
    const priceMax = prices.length > 0 ? Math.max(...prices) : 100000;

    // Normalize scores to 0-100
    const maxEngagement = events.length * 3; // theoretical max if all events are recent
    const normalizedEngagement = Math.min(100, Math.round((engagementScore / Math.max(maxEngagement, 1)) * 100));
    const normalizedCustom = Math.min(100, customScore);
    const normalizedReorder = Math.min(100, reorderScore);
    const normalizedRewards = Math.min(100, rewardsScore);

    const profileData = {
      user_id,
      preferred_categories: preferredCategories,
      preferred_tags: [],
      preferred_materials: preferredMaterials,
      preferred_colors: preferredColors,
      preferred_price_min: priceMin,
      preferred_price_max: priceMax,
      custom_interest_score: normalizedCustom,
      reorder_score: normalizedReorder,
      rewards_interest_score: normalizedRewards,
      engagement_score: normalizedEngagement,
      personalization_summary: {
        total_events: events.length,
        last_computed: new Date().toISOString(),
        top_event_types: topN(
          events.reduce((m, e) => {
            m.set(e.event_type, (m.get(e.event_type) || 0) + 1);
            return m;
          }, new Map<string, number>()),
          5,
        ),
      },
      last_active_at: events[0]?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await sb
      .from("user_personalization_profiles")
      .upsert(profileData, { onConflict: "user_id" });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ status: "ok", profile: profileData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("update-user-profile error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
