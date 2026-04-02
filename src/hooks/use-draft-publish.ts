import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

/* ------------------------------------------------------------------ */
/*  Key helpers                                                        */
/* ------------------------------------------------------------------ */
export const draftBlocksKey = (page: string) => `draft_blocks_${page}`;
export const draftSettingKey = (key: string) => `draft_setting_${key}`;

export type DraftStatus = "published" | "draft" | "unpublished_changes";

/* ------------------------------------------------------------------ */
/*  Block-level draft helpers                                          */
/* ------------------------------------------------------------------ */

/** Load draft blocks for a page (returns null if no draft exists) */
export async function loadDraftBlocks(page: string): Promise<SiteBlock[] | null> {
  const key = draftBlocksKey(page);
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data?.value) return null;
  const val = data.value as any;
  return Array.isArray(val?.blocks) ? (val.blocks as SiteBlock[]) : null;
}

/** Save draft blocks for a page */
export async function saveDraftBlocks(page: string, blocks: SiteBlock[]): Promise<boolean> {
  const key = draftBlocksKey(page);
  const payload = { key, value: { blocks, updatedAt: new Date().toISOString() } };
  const { error } = await supabase
    .from("site_settings")
    .upsert(payload as any, { onConflict: "key" });
  if (error) {
    toast.error(`Draft save failed: ${error.message}`);
    return false;
  }
  return true;
}

/** Delete draft for a page */
export async function discardDraftBlocks(page: string): Promise<boolean> {
  const key = draftBlocksKey(page);
  const { error } = await supabase
    .from("site_settings")
    .delete()
    .eq("key", key);
  if (error) {
    toast.error(`Discard failed: ${error.message}`);
    return false;
  }
  return true;
}

/** Publish draft blocks: apply to site_blocks table, then delete draft */
export async function publishDraftBlocks(page: string, draftBlocks: SiteBlock[]): Promise<boolean> {
  try {
    // 1. Get current live block IDs for this page
    const { data: liveBlocks } = await supabase
      .from("site_blocks")
      .select("id")
      .eq("page", page);
    const liveIds = new Set((liveBlocks ?? []).map(b => b.id));
    const draftIds = new Set(draftBlocks.filter(b => !b.id.startsWith("draft-")).map(b => b.id));

    // 2. Delete blocks that were removed in the draft
    const deletedIds = [...liveIds].filter(id => !draftIds.has(id));
    if (deletedIds.length > 0) {
      await Promise.all(deletedIds.map(id =>
        supabase.from("site_blocks").delete().eq("id", id),
      ));
    }

    // 3. Upsert each block
    const realIdMap = new Map<string, string>(); // draft-id → real-id
    for (let i = 0; i < draftBlocks.length; i++) {
      const block = draftBlocks[i];
      const isDraftNew = block.id.startsWith("draft-");

      if (isDraftNew) {
        const { data, error } = await supabase.from("site_blocks").insert({
          page,
          block_type: block.block_type,
          title: block.title,
          content: block.content as any,
          sort_order: i,
          is_active: block.is_active ?? true,
        }).select("id").single();
        if (error) throw error;
        realIdMap.set(block.id, data.id);
      } else {
        const { error } = await supabase.from("site_blocks").update({
          title: block.title,
          content: block.content as any,
          sort_order: i,
          is_active: block.is_active ?? true,
        }).eq("id", block.id);
        if (error) throw error;
      }
    }

    // 4. Delete the draft
    await discardDraftBlocks(page);
    return true;
  } catch (err: any) {
    toast.error(`Publish failed: ${err.message}`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Settings-level draft helpers (for backgrounds, etc.)               */
/* ------------------------------------------------------------------ */

export async function loadDraftSetting(settingsKey: string): Promise<any | null> {
  const key = draftSettingKey(settingsKey);
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

export async function saveDraftSetting(settingsKey: string, value: any): Promise<boolean> {
  const key = draftSettingKey(settingsKey);
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value } as any, { onConflict: "key" });
  if (error) {
    toast.error(`Draft save failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function discardDraftSetting(settingsKey: string): Promise<boolean> {
  const key = draftSettingKey(settingsKey);
  const { error } = await supabase.from("site_settings").delete().eq("key", key);
  if (error) {
    toast.error(`Discard failed: ${error.message}`);
    return false;
  }
  return true;
}

export async function publishDraftSetting(settingsKey: string, draftValue: any): Promise<boolean> {
  // Copy draft value to the real key
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: settingsKey, value: draftValue } as any, { onConflict: "key" });
  if (error) {
    toast.error(`Publish failed: ${error.message}`);
    return false;
  }
  // Delete the draft
  await discardDraftSetting(settingsKey);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Hook: check if a page has a draft                                  */
/* ------------------------------------------------------------------ */
export function usePageDraftStatus(page: string) {
  const [status, setStatus] = useState<DraftStatus>("published");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const key = draftBlocksKey(page);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    setStatus(data?.value ? "draft" : "published");
    setLoading(false);
  }, [page]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { status, loading, refresh };
}
