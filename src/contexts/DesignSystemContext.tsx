import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyDesignSystemToRoot, normalizeGlobalDesignSystem } from "@/lib/design-system";
import { DEFAULT_GLOBAL_DESIGN_SYSTEM, type GlobalDesignSystem } from "@/types/design-system";

interface DesignSystemContextValue {
  tokens: GlobalDesignSystem;
  loading: boolean;
  previewTokens: (next: GlobalDesignSystem) => void;
  saveTokens: (next: GlobalDesignSystem) => Promise<{ error: string | null }>;
  resetTokens: () => Promise<{ error: string | null }>;
  reload: () => Promise<void>;
}

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

async function upsertSetting(key: string, value: unknown) {
  const { data: existing, error: selectError } = await supabase
    .from("site_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (selectError) return { error: selectError.message };

  if (existing?.id) {
    const { error } = await supabase.from("site_settings").update({ value: value as any }).eq("id", existing.id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("site_settings").insert({ key, value: value as any });
  return { error: error?.message ?? null };
}

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<GlobalDesignSystem>(DEFAULT_GLOBAL_DESIGN_SYSTEM);
  const [loading, setLoading] = useState(true);

  const applyTokens = useCallback((next: GlobalDesignSystem) => {
    if (typeof document === "undefined") return;
    applyDesignSystemToRoot(next, document.documentElement);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "global_design_system").maybeSingle();
      const normalized = normalizeGlobalDesignSystem(data?.value ?? DEFAULT_GLOBAL_DESIGN_SYSTEM);
      setTokens(normalized);
      applyTokens(normalized);
    } finally {
      setLoading(false);
    }
  }, [applyTokens]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    applyTokens(tokens);
  }, [tokens, applyTokens]);

  const previewTokens = useCallback((next: GlobalDesignSystem) => {
    applyTokens(normalizeGlobalDesignSystem(next));
  }, [applyTokens]);

  const saveTokens = useCallback(async (next: GlobalDesignSystem) => {
    const normalized = normalizeGlobalDesignSystem(next);
    applyTokens(normalized);
    const result = await upsertSetting("global_design_system", normalized);
    if (!result.error) {
      setTokens(normalized);
    }
    return result;
  }, [applyTokens]);

  const resetTokens = useCallback(async () => {
    const normalized = normalizeGlobalDesignSystem(DEFAULT_GLOBAL_DESIGN_SYSTEM);
    applyTokens(normalized);
    const result = await upsertSetting("global_design_system", normalized);
    if (!result.error) {
      setTokens(normalized);
    }
    return result;
  }, [applyTokens]);

  const value = useMemo<DesignSystemContextValue>(() => ({
    tokens,
    loading,
    previewTokens,
    saveTokens,
    resetTokens,
    reload,
  }), [tokens, loading, previewTokens, saveTokens, resetTokens, reload]);

  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>;
}

export function useDesignSystem() {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error("useDesignSystem must be used within a DesignSystemProvider");
  }
  return context;
}

export function useDesignSystemSafe(): DesignSystemContextValue {
  return useContext(DesignSystemContext) ?? {
    tokens: DEFAULT_GLOBAL_DESIGN_SYSTEM,
    loading: false,
    previewTokens: () => undefined,
    saveTokens: async () => ({ error: "Design system unavailable" }),
    resetTokens: async () => ({ error: "Design system unavailable" }),
    reload: async () => undefined,
  };
}
