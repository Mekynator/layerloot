import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    let publishedCount = 0;

    // Process scheduled blocks
    const { data: scheduledBlocks } = await supabase
      .from("site_blocks")
      .select("*")
      .eq("has_draft", true)
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", now);

    for (const block of (scheduledBlocks ?? []) as any[]) {
      if (block.draft_content?.__deleted === true) {
        // Log revision before deleting
        const revNum = await getNextRevNum(supabase, "site_block", block.id);
        await supabase.from("content_revisions").insert({
          content_type: "site_block",
          content_id: block.id,
          page: block.page,
          revision_data: block.content,
          revision_number: revNum,
          action: "auto_publish",
          change_summary: "Scheduled auto-publish (delete)",
        });
        await supabase.from("site_blocks").delete().eq("id", block.id);
      } else {
        const revNum = await getNextRevNum(supabase, "site_block", block.id);
        await supabase.from("content_revisions").insert({
          content_type: "site_block",
          content_id: block.id,
          page: block.page,
          revision_data: block.content,
          revision_number: revNum,
          action: "auto_publish",
          change_summary: "Scheduled auto-publish",
        });
        await supabase.from("site_blocks").update({
          content: block.draft_content,
          draft_content: null,
          has_draft: false,
          scheduled_publish_at: null,
          published_at: now,
        }).eq("id", block.id);
      }
      publishedCount++;
    }

    // Process scheduled settings
    const { data: scheduledSettings } = await supabase
      .from("site_settings")
      .select("*")
      .eq("has_draft", true)
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", now);

    for (const setting of (scheduledSettings ?? []) as any[]) {
      const revNum = await getNextRevNum(supabase, "site_setting", setting.key);
      await supabase.from("content_revisions").insert({
        content_type: "site_setting",
        content_id: setting.key,
        revision_data: setting.value,
        revision_number: revNum,
        action: "auto_publish",
        change_summary: "Scheduled auto-publish",
      });
      await supabase.from("site_settings").update({
        value: setting.draft_value,
        draft_value: null,
        has_draft: false,
        scheduled_publish_at: null,
        published_at: now,
      }).eq("key", setting.key);
      publishedCount++;
    }

    // Process scheduled products
    const { data: scheduledProducts } = await supabase
      .from("products")
      .select("*")
      .eq("has_draft", true)
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", now);

    for (const product of (scheduledProducts ?? []) as any[]) {
      const draft = product.draft_data;
      const updatePayload: any = {
        has_draft: false,
        draft_data: null,
        published_at: now,
        scheduled_publish_at: null,
        status: "published",
        is_active: true,
      };

      if (draft && typeof draft === "object") {
        const draftFields = [
          "name", "slug", "description", "price", "compare_at_price",
          "category_id", "images", "stock", "is_featured", "model_url",
          "print_time_hours", "dimensions_cm", "weight_grams", "finish_type", "material_type",
        ];
        for (const key of draftFields) {
          if (key in draft) updatePayload[key] = draft[key];
        }
      }

      // Log revision
      const revNum = await getNextRevNum(supabase, "product", product.id);
      await supabase.from("content_revisions").insert({
        content_type: "product",
        content_id: product.id,
        revision_data: product.draft_data ?? {},
        revision_number: revNum,
        action: "auto_publish",
        change_summary: "Scheduled auto-publish",
      });

      await supabase.from("products").update(updatePayload).eq("id", product.id);
      publishedCount++;
    }

    // Log activity
    if (publishedCount > 0) {
      await supabase.from("admin_activity_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: "scheduled_publish_executed",
        entity_type: "system",
        summary: `Auto-published ${publishedCount} scheduled item(s)`,
        metadata: { count: publishedCount },
      } as any);
    }

    return new Response(JSON.stringify({ published: publishedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getNextRevNum(supabase: any, contentType: string, contentId: string): Promise<number> {
  const { data } = await supabase
    .from("content_revisions")
    .select("revision_number")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.revision_number ?? 0) + 1;
}
