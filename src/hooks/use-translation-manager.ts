import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import en from "@/locales/en/common.json";
import da from "@/locales/da/common.json";
import de from "@/locales/de/common.json";
import es from "@/locales/es/common.json";
import ro from "@/locales/ro/common.json";
import { toast } from "sonner";

const LOCALE_FILES: Record<string, Record<string, any>> = { en, da, de, es, ro };

export interface TranslationEntry {
  id: string;
  namespace: string;
  key: string;
  locale: string;
  value: string;
  draft_value: string | null;
  has_draft: boolean;
  is_published: boolean;
  source_hash: string | null;
  status: string;
  updated_by: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranslationFilters {
  locale?: string;
  status?: string;
  search?: string;
  namespace?: string;
}

function flattenKeys(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v, fullKey));
    } else {
      result[fullKey] = String(v ?? "");
    }
  }
  return result;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

export function getAllLocaleKeys(): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    result[lang] = flattenKeys(LOCALE_FILES[lang] ?? {});
  }
  return result;
}

export function useTranslationEntries(filters: TranslationFilters = {}) {
  return useQuery({
    queryKey: ["translation-entries", filters],
    queryFn: async () => {
      let query = supabase
        .from("translation_entries")
        .select("*")
        .order("key")
        .order("locale");

      if (filters.locale) query = query.eq("locale", filters.locale);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.namespace) query = query.eq("namespace", filters.namespace);
      if (filters.search) query = query.ilike("key", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TranslationEntry[];
    },
  });
}

export function useTranslationStats() {
  return useQuery({
    queryKey: ["translation-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_entries")
        .select("locale, status");
      if (error) throw error;

      const stats: Record<string, { total: number; published: number; draft: number; missing: number; outdated: number }> = {};
      for (const lang of SUPPORTED_LANGUAGES) {
        stats[lang] = { total: 0, published: 0, draft: 0, missing: 0, outdated: 0 };
      }

      for (const row of data ?? []) {
        const entry = row as { locale: string; status: string };
        if (!stats[entry.locale]) continue;
        stats[entry.locale].total++;
        if (entry.status === "published") stats[entry.locale].published++;
        if (entry.status === "draft") stats[entry.locale].draft++;
        if (entry.status === "missing") stats[entry.locale].missing++;
        if (entry.status === "outdated") stats[entry.locale].outdated++;
      }
      return stats;
    },
  });
}

export function useTranslationMutations() {
  const qc = useQueryClient();

  const saveDraft = useMutation({
    mutationFn: async ({ key, locale, value, userId, namespace = "common" }: {
      key: string; locale: string; value: string; userId?: string; namespace?: string;
    }) => {
      const { data: existing } = await supabase
        .from("translation_entries")
        .select("id")
        .eq("namespace", namespace)
        .eq("key", key)
        .eq("locale", locale)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("translation_entries")
          .update({ draft_value: value, has_draft: true, status: "draft", updated_by: userId ?? null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("translation_entries")
          .insert({ namespace, key, locale, value: "", draft_value: value, has_draft: true, is_published: false, status: "draft", updated_by: userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["translation-entries"] });
      qc.invalidateQueries({ queryKey: ["translation-stats"] });
    },
  });

  const publishTranslations = useMutation({
    mutationFn: async ({ locale, namespace, userId }: { locale?: string; namespace?: string; userId?: string }) => {
      let query = supabase
        .from("translation_entries")
        .select("id, draft_value")
        .eq("has_draft", true);

      if (locale) query = query.eq("locale", locale);
      if (namespace) query = query.eq("namespace", namespace);

      const { data: drafts, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      for (const d of drafts ?? []) {
        const draft = d as { id: string; draft_value: string | null };
        await supabase
          .from("translation_entries")
          .update({
            value: draft.draft_value ?? "",
            draft_value: null,
            has_draft: false,
            is_published: true,
            status: "published",
            published_at: new Date().toISOString(),
            published_by: userId ?? null,
          })
          .eq("id", draft.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["translation-entries"] });
      qc.invalidateQueries({ queryKey: ["translation-stats"] });
      toast.success("Translations published!");
    },
  });

  const discardDrafts = useMutation({
    mutationFn: async ({ locale, namespace }: { locale?: string; namespace?: string }) => {
      let query = supabase
        .from("translation_entries")
        .update({ draft_value: null, has_draft: false, status: "published" })
        .eq("has_draft", true);

      if (locale) query = query.eq("locale", locale);
      if (namespace) query = query.eq("namespace", namespace);

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["translation-entries"] });
      qc.invalidateQueries({ queryKey: ["translation-stats"] });
      toast.info("Drafts discarded");
    },
  });

  const importFromFiles = useMutation({
    mutationFn: async (userId?: string) => {
      const allKeys = getAllLocaleKeys();
      const enKeys = allKeys.en;
      let count = 0;

      for (const [key, enValue] of Object.entries(enKeys)) {
        const hash = simpleHash(enValue);
        for (const lang of SUPPORTED_LANGUAGES) {
          const val = allKeys[lang]?.[key] ?? "";
          const status = !val ? "missing" : (lang !== "en" && simpleHash(allKeys.en[key] ?? "") !== hash ? "outdated" : "published");
          
          const { error } = await supabase
            .from("translation_entries")
            .upsert({
              namespace: "common",
              key,
              locale: lang,
              value: val,
              is_published: true,
              status: !val && lang !== "en" ? "missing" : "published",
              source_hash: lang === "en" ? hash : simpleHash(allKeys.en[key] ?? ""),
              updated_by: userId ?? null,
              published_at: new Date().toISOString(),
            }, { onConflict: "namespace,key,locale" });
          if (!error) count++;
        }
      }
      return count;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["translation-entries"] });
      qc.invalidateQueries({ queryKey: ["translation-stats"] });
      toast.success(`Imported ${count} translation entries from locale files`);
    },
  });

  const markOutdated = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("translation_entries")
        .update({ status: "outdated" })
        .eq("key", key)
        .neq("locale", "en");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["translation-entries"] });
    },
  });

  return { saveDraft, publishTranslations, discardDrafts, importFromFiles, markOutdated };
}
