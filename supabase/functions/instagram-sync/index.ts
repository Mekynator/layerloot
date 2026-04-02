import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API_BASE = "https://graph.instagram.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "sync";

    // --- Connect: exchange short-lived token for long-lived ---
    if (action === "connect") {
      const { access_token } = body;
      if (!access_token) {
        return new Response(JSON.stringify({ error: "access_token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange for long-lived token
      const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
      const appId = Deno.env.get("INSTAGRAM_APP_ID");
      let longLivedToken = access_token;

      if (appSecret) {
        const exchangeUrl = `${GRAPH_API_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${access_token}`;
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          longLivedToken = exchangeData.access_token;
        }
      }

      // Get user profile
      const profileRes = await fetch(
        `${GRAPH_API_BASE}/me?fields=id,username,account_type,media_count&access_token=${longLivedToken}`
      );
      const profile = await profileRes.json();

      if (profile.error) {
        return new Response(JSON.stringify({ error: profile.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Store token as secret in site_settings
      await supabase.from("site_settings").upsert(
        {
          key: "instagram_access_token",
          value: JSON.stringify(longLivedToken),
        },
        { onConflict: "key" }
      );

      // Update instagram_settings
      const { error: settingsError } = await supabase
        .from("instagram_settings")
        .update({
          is_connected: true,
          username: profile.username,
          account_id: profile.id,
          sync_status: "connected",
          sync_error: null,
        })
        .not("id", "is", null); // update all rows (singleton)

      if (settingsError) {
        console.error("Failed to update settings:", settingsError);
      }

      // Trigger initial sync
      await syncMedia(supabase, longLivedToken, profile.username);

      return new Response(
        JSON.stringify({
          success: true,
          username: profile.username,
          account_id: profile.id,
          media_count: profile.media_count,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Disconnect ---
    if (action === "disconnect") {
      await supabase
        .from("instagram_settings")
        .update({
          is_connected: false,
          username: null,
          account_id: null,
          sync_status: "disconnected",
          sync_error: null,
          last_sync_at: null,
        })
        .not("id", "is", null);

      await supabase.from("site_settings").delete().eq("key", "instagram_access_token");
      await supabase.from("instagram_media").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Refresh token ---
    if (action === "refresh_token") {
      const { data: tokenRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "instagram_access_token")
        .single();

      if (!tokenRow?.value) {
        return new Response(JSON.stringify({ error: "No token stored" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentToken = JSON.parse(tokenRow.value as string);
      const refreshRes = await fetch(
        `${GRAPH_API_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
      );
      const refreshData = await refreshRes.json();

      if (refreshData.access_token) {
        await supabase.from("site_settings").upsert(
          { key: "instagram_access_token", value: JSON.stringify(refreshData.access_token) },
          { onConflict: "key" }
        );
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Token refresh failed", details: refreshData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Default: sync media ---
    const { data: tokenRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "instagram_access_token")
      .single();

    if (!tokenRow?.value) {
      await supabase
        .from("instagram_settings")
        .update({ sync_status: "error", sync_error: "No access token. Please reconnect your Instagram account." })
        .not("id", "is", null);

      return new Response(JSON.stringify({ error: "Not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = JSON.parse(tokenRow.value as string);

    const { data: settings } = await supabase
      .from("instagram_settings")
      .select("username")
      .single();

    await supabase
      .from("instagram_settings")
      .update({ sync_status: "syncing", sync_error: null })
      .not("id", "is", null);

    const result = await syncMedia(supabase, token, settings?.username || "");

    await supabase
      .from("instagram_settings")
      .update({
        sync_status: "connected",
        sync_error: null,
        last_sync_at: new Date().toISOString(),
      })
      .not("id", "is", null);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("instagram-sync error:", err);

    await supabase
      .from("instagram_settings")
      .update({ sync_status: "error", sync_error: String(err) })
      .not("id", "is", null);

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncMedia(
  supabase: ReturnType<typeof createClient>,
  accessToken: string,
  username: string
) {
  // Fetch recent media from Instagram Graph API
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const mediaUrl = `${GRAPH_API_BASE}/me/media?fields=${fields}&limit=50&access_token=${accessToken}`;

  const res = await fetch(mediaUrl);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Instagram API error: ${data.error.message}`);
  }

  const mediaItems = data.data || [];
  let synced = 0;
  let skipped = 0;

  for (const item of mediaItems) {
    const isReel = item.media_type === "VIDEO";

    const record = {
      instagram_media_id: item.id,
      media_type: item.media_type || "IMAGE",
      caption: item.caption || null,
      permalink: item.permalink || null,
      media_url: item.media_url || null,
      thumbnail_url: item.thumbnail_url || null,
      timestamp: item.timestamp || new Date().toISOString(),
      username: username,
      is_story: false,
      is_reel: isReel,
      expires_at: null,
      sync_status: "active",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("instagram_media")
      .upsert(record, { onConflict: "instagram_media_id" });

    if (error) {
      console.error(`Failed to upsert media ${item.id}:`, error);
      skipped++;
    } else {
      synced++;
    }
  }

  // Mark old media that's no longer in the feed
  const currentIds = mediaItems.map((m: { id: string }) => m.id);
  if (currentIds.length > 0) {
    await supabase
      .from("instagram_media")
      .update({ sync_status: "removed" })
      .eq("sync_status", "active")
      .eq("is_story", false)
      .not("instagram_media_id", "in", `(${currentIds.join(",")})`);
  }

  // Remove expired stories
  await supabase
    .from("instagram_media")
    .update({ sync_status: "expired" })
    .eq("is_story", true)
    .lt("expires_at", new Date().toISOString());

  return { synced, skipped, total: mediaItems.length };
}
