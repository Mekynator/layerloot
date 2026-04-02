import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 12));
    const mediaType = url.searchParams.get("type") || "all"; // all, IMAGE, VIDEO, CAROUSEL_ALBUM, stories

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query from cached media
    let query = supabase
      .from("instagram_media")
      .select("*")
      .eq("sync_status", "active")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (mediaType === "stories") {
      query = query.eq("is_story", true);
      // Filter out expired stories
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    } else if (mediaType !== "all") {
      query = query.eq("media_type", mediaType).eq("is_story", false);
    } else {
      query = query.eq("is_story", false);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error("Error fetching cached instagram media:", error);
      return new Response(JSON.stringify({ items: [], error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get settings for display config
    const { data: settings } = await supabase
      .from("instagram_settings")
      .select("username, is_connected, last_sync_at, display_config")
      .limit(1)
      .single();

    return new Response(
      JSON.stringify({
        items: items || [],
        settings: settings
          ? {
              username: settings.username,
              is_connected: settings.is_connected,
              last_sync_at: settings.last_sync_at,
              display_config: settings.display_config,
            }
          : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("instagram-feed error:", err);
    return new Response(JSON.stringify({ items: [], error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
