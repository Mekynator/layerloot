import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import { prepareReusableContentForSave, resolveReusableSiteBlocks } from "@/lib/reusable-blocks";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export type DraftStatus = "published" | "draft" | "unpublished_changes" | "scheduled";

/* ------------------------------------------------------------------ */
/*  Revision helpers                                                   */
/* ------------------------------------------------------------------ */
async function getNextRevisionNumber(contentType: string, contentId: string): Promise<number> {
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

async function insertRevision(
  contentType: string,
  contentId: string,
  revisionData: any,
  action: string,
  userId?: string,
  page?: string,
) {
  const revNum = await getNextRevisionNumber(contentType, contentId);
  await supabase.from("content_revisions").insert({
    content_type: contentType,
    content_id: contentId,
    page: page ?? null,
    revision_data: revisionData,
    revision_number: revNum,
    action,
    created_by: userId ?? null,
  } as any);
}

/* ------------------------------------------------------------------ */
/*  Block-level draft helpers (column-based)                           */
/* ------------------------------------------------------------------ */

/** Load blocks for admin view — returns draft_content where available, else content */
export async function loadAdminBlocks(page: string): Promise<{ blocks: SiteBlock[]; hasDraft: boolean }> {
  const { data, error } = await supabase
    .from("site_blocks")
    .select("*")
    .eq("page", page)
    .order("sort_order");

  if (error) { toast.error(`Load failed: ${error.message}`); return { blocks: [], hasDraft: false }; }

  const rows = (data ?? []) as any[];
  let hasDraft = false;

  const blocks: SiteBlock[] = rows.map(row => {
    const isDraft = row.has_draft === true && row.draft_content != null;
    if (isDraft) hasDraft = true;
    return {
      id: row.id,
      page: row.page,
      block_type: row.block_type,
      title: row.title,
      content: isDraft ? row.draft_content : row.content,
      sort_order: row.sort_order,
      is_active: row.is_active,
    } as SiteBlock;
  });

  return { blocks: await resolveReusableSiteBlocks(blocks), hasDraft };
}

/** Save draft blocks — writes to draft_content column on each block */
export async function saveDraftBlocks(page: string, blocks: SiteBlock[], userId?: string): Promise<boolean> {
  try {
    // Get current live block IDs
    const { data: liveRows } = await supabase
      .from("site_blocks")
      .select("id")
      .eq("page", page);
    const liveIds = new Set((liveRows ?? []).map(b => b.id));

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isDraftNew = block.id.startsWith("draft-");

      const preparedContent = prepareReusableContentForSave((block.content as Record<string, any>) || {});

      if (isDraftNew) {
        // Insert new block with draft_content, content as empty default
        const { data, error } = await supabase.from("site_blocks").insert({
          page,
          block_type: block.block_type,
          title: block.title,
          content: {} as any,
          draft_content: preparedContent as any,
          sort_order: i,
          is_active: block.is_active ?? true,
          has_draft: true,
          updated_by: userId ?? null,
        } as any).select("id").single();
        if (error) throw error;
        // Update the block ID in-place so caller gets real IDs
        block.id = data.id;
      } else {
        // Update existing block's draft_content
        const { error } = await supabase.from("site_blocks").update({
          title: block.title,
          draft_content: preparedContent as any,
          sort_order: i,
          is_active: block.is_active ?? true,
          has_draft: true,
          updated_by: userId ?? null,
        } as any).eq("id", block.id);
        if (error) throw error;
      }
    }

    // Mark blocks removed in draft — we store removal info by setting draft_content to a sentinel
    const draftIds = new Set(blocks.map(b => b.id));
    const deletedIds = [...liveIds].filter(id => !draftIds.has(id));
    for (const id of deletedIds) {
      await supabase.from("site_blocks").update({
        draft_content: { __deleted: true } as any,
        has_draft: true,
        updated_by: userId ?? null,
      } as any).eq("id", id);
    }

    return true;
  } catch (err: any) {
    toast.error(`Draft save failed: ${err.message}`);
    return false;
  }
}

/** Publish draft blocks — promote draft_content to content, log revisions */
export async function publishDraftBlocks(page: string, userId?: string): Promise<boolean> {
  try {
    // Get all blocks for this page
    const { data: rows, error } = await supabase
      .from("site_blocks")
      .select("*")
      .eq("page", page)
      .order("sort_order");
    if (error) throw error;

    for (const row of (rows ?? []) as any[]) {
      if (!row.has_draft) continue;

      // Check if block was marked for deletion
      if (row.draft_content?.__deleted === true) {
        // Log revision before deleting
        await insertRevision("site_block", row.id, row.content, "delete", userId, page);
        await supabase.from("site_blocks").delete().eq("id", row.id);
        continue;
      }

      // Log revision of the old published content
      await insertRevision("site_block", row.id, row.content, "publish", userId, page);

      const [{ content: resolvedContent }] = await resolveReusableSiteBlocks([{
        id: row.id,
        page: row.page,
        block_type: row.block_type,
        title: row.title,
        content: prepareReusableContentForSave((row.draft_content as Record<string, any>) || {}),
        sort_order: row.sort_order,
        is_active: row.is_active,
      } as SiteBlock]);

      // Promote draft_content → content
      await supabase.from("site_blocks").update({
        content: resolvedContent as any,
        draft_content: null,
        has_draft: false,
        published_at: new Date().toISOString(),
        published_by: userId ?? null,
      } as any).eq("id", row.id);
    }

    return true;
  } catch (err: any) {
    toast.error(`Publish failed: ${err.message}`);
    return false;
  }
}

/** Discard draft blocks — clear draft_content, delete draft-only blocks */
export async function discardDraftBlocks(page: string): Promise<boolean> {
  try {
    const { data: rows } = await supabase
      .from("site_blocks")
      .select("id, content, has_draft, draft_content")
      .eq("page", page)
      .eq("has_draft", true);

    for (const row of (rows ?? []) as any[]) {
      // If content is empty (draft-only block), delete it
      const contentEmpty = !row.content || Object.keys(row.content).length === 0;
      if (contentEmpty) {
        await supabase.from("site_blocks").delete().eq("id", row.id);
      } else {
        // Clear draft
        await supabase.from("site_blocks").update({
          draft_content: null,
          has_draft: false,
        } as any).eq("id", row.id);
      }
    }

    return true;
  } catch (err: any) {
    toast.error(`Discard failed: ${err.message}`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Settings-level draft helpers (column-based)                        */
/* ------------------------------------------------------------------ */

export async function loadDraftSetting(settingsKey: string): Promise<any | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("value, draft_value, has_draft")
    .eq("key", settingsKey)
    .maybeSingle();
  if (!data) return null;
  if ((data as any).has_draft && (data as any).draft_value != null) {
    return { draft: (data as any).draft_value, live: data.value, hasDraft: true };
  }
  return { draft: null, live: data.value, hasDraft: false };
}

export async function saveDraftSetting(settingsKey: string, value: any, userId?: string): Promise<boolean> {
  // Upsert — ensure the row exists, then set draft_value
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: settingsKey,
      draft_value: value,
      has_draft: true,
      updated_by: userId ?? null,
    } as any, { onConflict: "key" });
  if (error) {
    toast.error(`Draft save failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function publishDraftSetting(settingsKey: string, draftValue: any, userId?: string): Promise<boolean> {
  try {
    // Get current live value for revision
    const { data: current } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", settingsKey)
      .maybeSingle();

    if (current?.value) {
      await insertRevision("site_setting", settingsKey, current.value, "publish", userId);
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: settingsKey,
        value: draftValue,
        draft_value: null,
        has_draft: false,
        published_at: new Date().toISOString(),
        published_by: userId ?? null,
      } as any, { onConflict: "key" });
    if (error) throw error;
    return true;
  } catch (err: any) {
    toast.error(`Publish failed: ${err.message}`);
    return false;
  }
}

export async function discardDraftSetting(settingsKey: string): Promise<boolean> {
  const { error } = await supabase
    .from("site_settings")
    .update({ draft_value: null, has_draft: false } as any)
    .eq("key", settingsKey);
  if (error) {
    toast.error(`Discard failed: ${error.message}`);
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Revert to a previous revision                                      */
/* ------------------------------------------------------------------ */
export async function revertToRevision(contentType: string, contentId: string, revisionNumber: number, userId?: string, restoreAsDraft = false): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("content_revisions")
      .select("revision_data, page")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("revision_number", revisionNumber)
      .single();
    if (error || !data) throw error || new Error("Revision not found");

    if (contentType === "site_block") {
      const { data: current } = await supabase.from("site_blocks").select("content").eq("id", contentId).single();
      if (current) await insertRevision("site_block", contentId, current.content, "revert", userId, data.page);

      if (restoreAsDraft) {
        await supabase.from("site_blocks").update({
          draft_content: data.revision_data,
          has_draft: true,
          updated_by: userId ?? null,
        } as any).eq("id", contentId);
      } else {
        await supabase.from("site_blocks").update({
          content: data.revision_data,
          draft_content: null,
          has_draft: false,
          published_at: new Date().toISOString(),
          published_by: userId ?? null,
        } as any).eq("id", contentId);
      }
    } else if (contentType === "site_setting") {
      const { data: current } = await supabase.from("site_settings").select("value").eq("key", contentId).single();
      if (current) await insertRevision("site_setting", contentId, current.value, "revert", userId);

      if (restoreAsDraft) {
        await supabase.from("site_settings").update({
          draft_value: data.revision_data,
          has_draft: true,
          updated_by: userId ?? null,
        } as any).eq("key", contentId);
      } else {
        await supabase.from("site_settings").update({
          value: data.revision_data,
          draft_value: null,
          has_draft: false,
          published_at: new Date().toISOString(),
          published_by: userId ?? null,
        } as any).eq("key", contentId);
      }
    }

    toast.success(restoreAsDraft ? "Restored as draft" : "Reverted successfully");
    return true;
  } catch (err: any) {
    toast.error(`Revert failed: ${err.message}`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Scheduling helpers                                                 */
/* ------------------------------------------------------------------ */

export async function scheduleBlocksPublish(page: string, scheduledAt: Date, userId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("site_blocks")
      .update({ scheduled_publish_at: scheduledAt.toISOString() } as any)
      .eq("page", page)
      .eq("has_draft", true);
    if (error) throw error;
    toast.success(`Scheduled for ${scheduledAt.toLocaleString()}`);
    return true;
  } catch (err: any) {
    toast.error(`Schedule failed: ${err.message}`);
    return false;
  }
}

export async function cancelBlocksSchedule(page: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("site_blocks")
      .update({ scheduled_publish_at: null } as any)
      .eq("page", page)
      .eq("has_draft", true);
    if (error) throw error;
    toast.success("Schedule cancelled");
    return true;
  } catch (err: any) {
    toast.error(`Cancel failed: ${err.message}`);
    return false;
  }
}

export async function scheduleSettingPublish(key: string, scheduledAt: Date): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("site_settings")
      .update({ scheduled_publish_at: scheduledAt.toISOString() } as any)
      .eq("key", key)
      .eq("has_draft", true);
    if (error) throw error;
    toast.success(`Scheduled for ${scheduledAt.toLocaleString()}`);
    return true;
  } catch (err: any) {
    toast.error(`Schedule failed: ${err.message}`);
    return false;
  }
}

export async function cancelSettingSchedule(key: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("site_settings")
      .update({ scheduled_publish_at: null } as any)
      .eq("key", key)
      .eq("has_draft", true);
    if (error) throw error;
    toast.success("Schedule cancelled");
    return true;
  } catch (err: any) {
    toast.error(`Cancel failed: ${err.message}`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook: check if a page has a draft                                  */
/* ------------------------------------------------------------------ */
export function usePageDraftStatus(page: string) {
  const [status, setStatus] = useState<DraftStatus>("published");
  const [loading, setLoading] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("site_blocks")
      .select("id, scheduled_publish_at")
      .eq("page", page)
      .eq("has_draft", true)
      .limit(1);
    const hasDraft = data && data.length > 0;
    const scheduled = hasDraft ? (data[0] as any).scheduled_publish_at : null;
    setScheduledAt(scheduled);
    setStatus(scheduled ? "scheduled" : hasDraft ? "draft" : "published");
    setLoading(false);
  }, [page]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { status, loading, scheduledAt, refresh };
}
