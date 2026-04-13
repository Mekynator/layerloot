import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Globe, Download, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslationEntries, useTranslationMutations, getAllLocaleKeys, type TranslationFilters } from "@/hooks/use-translation-manager";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/i18n";
import TranslationKeyEditor from "@/components/admin/translations/TranslationKeyEditor";
import TranslationOverview from "@/components/admin/translations/TranslationOverview";
import CmsTranslationPanel from "@/components/admin/translations/CmsTranslationPanel";

export default function AdminTranslations() {
  const { user } = useAuth();
  const [tab, setTab] = useState("static");
  const [filters, setFilters] = useState<TranslationFilters>({});
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useTranslationEntries({ ...filters, search: search || undefined });
  const { saveDraft, publishTranslations, discardDrafts, importFromFiles } = useTranslationMutations();

  // Group entries by key
  const groupedEntries = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const list = map.get(e.key) ?? [];
      list.push(e);
      map.set(e.key, list);
    }
    return map;
  }, [entries]);

  const hasDrafts = entries.some(e => e.has_draft);

  const handleSaveDraft = (key: string, locale: string, value: string) => {
    saveDraft.mutate({ key, locale, value, userId: user?.id });
  };

  return (
    
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-foreground">
              Translation Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all translations for the storefront across all supported languages.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => importFromFiles.mutate(user?.id)}
              disabled={importFromFiles.isPending}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {importFromFiles.isPending ? "Importing..." : "Import from Files"}
            </Button>
            {hasDrafts && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => discardDrafts.mutate({})}
                  disabled={discardDrafts.isPending}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  Discard All Drafts
                </Button>
                <Button
                  size="sm"
                  onClick={() => publishTranslations.mutate({ userId: user?.id })}
                  disabled={publishTranslations.isPending}
                  className="gap-1.5 text-xs font-display uppercase tracking-wider"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {publishTranslations.isPending ? "Publishing..." : "Publish All"}
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="static" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Static Keys
            </TabsTrigger>
            <TabsTrigger value="cms" className="gap-1.5 text-xs">
              CMS Content
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="static" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search translation keys..."
                  className="h-9 pl-9 text-xs"
                />
              </div>

              <Select value={filters.locale ?? "all"} onValueChange={v => setFilters(f => ({ ...f, locale: v === "all" ? undefined : v }))}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {SUPPORTED_LANGUAGES.map(l => (
                    <SelectItem key={l} value={l}>{LANGUAGE_LABELS[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status ?? "all"} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? undefined : v }))}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="outdated">Outdated</SelectItem>
                </SelectContent>
              </Select>

              {filters.locale && hasDrafts && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => publishTranslations.mutate({ locale: filters.locale, userId: user?.id })}
                  className="gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Publish {LANGUAGE_LABELS[filters.locale as SupportedLanguage] ?? filters.locale}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center text-muted-foreground py-12">Loading translations...</div>
            ) : groupedEntries.size === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-muted-foreground">No translation entries found.</p>
                <p className="text-xs text-muted-foreground">Click "Import from Files" to seed from your locale JSON files.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {[...groupedEntries.entries()].map(([key, keyEntries]) => (
                  <TranslationKeyEditor
                    key={key}
                    translationKey={key}
                    entries={keyEntries}
                    onSaveDraft={handleSaveDraft}
                    saving={saveDraft.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cms" className="mt-4">
            <CmsTranslationPanel />
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <TranslationOverview />
          </TabsContent>
        </Tabs>
      </div>
    
  );
}
