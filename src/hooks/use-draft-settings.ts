import { useCallback, useEffect, useState } from "react";
import {
  loadDraftSetting, saveDraftSetting, publishDraftSetting, discardDraftSetting,
  scheduleSettingPublish, cancelSettingSchedule,
} from "./use-draft-publish";
import type { DraftStatus } from "./use-draft-publish";
import { supabase } from "@/integrations/supabase/client";

interface UseDraftSettingsReturn<T> {
  value: T;
  liveValue: T;
  hasDraft: boolean;
  draftStatus: DraftStatus;
  loading: boolean;
  dirty: boolean;
  scheduledAt: string | null;
  setValue: (v: T | ((prev: T) => T)) => void;
  saveDraft: (userId?: string) => Promise<boolean>;
  publish: (userId?: string) => Promise<boolean>;
  discard: () => Promise<boolean>;
  schedulePublish: (date: Date) => Promise<boolean>;
  cancelSchedule: () => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useDraftSettings<T>(key: string, defaultValue: T): UseDraftSettingsReturn<T> {
  const [value, setValueState] = useState<T>(defaultValue);
  const [liveValue, setLiveValue] = useState<T>(defaultValue);
  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await loadDraftSetting(key);
    if (result) {
      const live = result.live ? { ...defaultValue, ...(result.live as any) } : defaultValue;
      setLiveValue(live);
      setHasDraft(result.hasDraft);
      if (result.hasDraft && result.draft != null) {
        setValueState({ ...defaultValue, ...(result.draft as any) });
      } else {
        setValueState(live);
      }
    } else {
      setLiveValue(defaultValue);
      setValueState(defaultValue);
      setHasDraft(false);
    }
    setDirty(false);
    setLoading(false);
  }, [key]);

  useEffect(() => { void load(); }, [load]);

  const setValue = useCallback((v: T | ((prev: T) => T)) => {
    setValueState(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      return next;
    });
    setDirty(true);
  }, []);

  const saveDraft = useCallback(async (userId?: string) => {
    const ok = await saveDraftSetting(key, value, userId);
    if (ok) { setHasDraft(true); setDirty(false); }
    return ok;
  }, [key, value]);

  const publish = useCallback(async (userId?: string) => {
    // Save current value first if dirty
    if (dirty) {
      const saved = await saveDraftSetting(key, value, userId);
      if (!saved) return false;
    }
    const ok = await publishDraftSetting(key, value, userId);
    if (ok) {
      setLiveValue(value);
      setHasDraft(false);
      setDirty(false);
    }
    return ok;
  }, [key, value, dirty]);

  const discard = useCallback(async () => {
    const ok = await discardDraftSetting(key);
    if (ok) {
      setValueState(liveValue);
      setHasDraft(false);
      setDirty(false);
    }
    return ok;
  }, [key, liveValue]);

  const draftStatus: DraftStatus = hasDraft || dirty ? "draft" : "published";

  return { value, liveValue, hasDraft, draftStatus, loading, dirty, setValue, saveDraft, publish, discard, reload: load };
}
