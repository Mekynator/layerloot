import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { tr } from "@/lib/translate";

interface BlockRow {
  id: string;
  page: string;
  block_type: string;
  title: string | null;
  content: Record<string, any>;
  draft_content: Record<string, any> | null;
  has_draft: boolean;
}

function extractTextFields(obj: Record<string, any>, prefix = ""): { key: string; value: any }[] {
  const results: { key: string; value: any }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string" && v.length > 0 && !k.startsWith("_") && !k.endsWith("url") && !k.endsWith("Url") && k !== "icon" && k !== "variant" && k !== "actionType" && k !== "actionTarget") {
      results.push({ key: fullKey, value: v });
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      // Check if it's a multilingual object
      const keys = Object.keys(v);
      const isMultilingual = keys.some(k => SUPPORTED_LANGUAGES.includes(k as any));
      if (isMultilingual) {
        results.push({ key: fullKey, value: v });
      } else {
        results.push(...extractTextFields(v, fullKey));
      }
    }
  }
  return results;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const result = JSON.parse(JSON.stringify(obj));
  const parts = path.split(".");
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  return result;
}

export default function CmsTranslationPanel() {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [pages, setPages] = useState<string[]>([]);
  const [editLocale, setEditLocale] = useState<SupportedLanguage>("da");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_blocks").select("page").then(({ data }) => {
      const unique = [...new Set((data ?? []).map((d: any) => d.page))];
      setPages(unique.sort());
    });
  }, []);

  useEffect(() => {
    supabase
      .from("site_blocks")
      .select("id, page, block_type, title, content, draft_content, has_draft")
      .eq("page", selectedPage)
      .order("sort_order")
      .then(({ data }) => {
        setBlocks((data ?? []) as BlockRow[]);
        setEdits({});
      });
  }, [selectedPage]);

  const handleSave = async (blockId: string, fieldKey: string) => {
    const editKey = `${blockId}.${fieldKey}`;
    const newValue = edits[editKey];
    if (newValue === undefined) return;

    setSaving(true);
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const content = block.has_draft && block.draft_content ? block.draft_content : block.content;
    const currentValue = getNestedValue(content, fieldKey);

    // Convert to multilingual object
    let multiValue: Record<string, string>;
    if (typeof currentValue === "object" && currentValue !== null) {
      multiValue = { ...currentValue, [editLocale]: newValue };
    } else {
      multiValue = { en: typeof currentValue === "string" ? currentValue : "", [editLocale]: newValue };
    }

    const updatedContent = setNestedValue(content, fieldKey, multiValue);

    const { error } = await supabase
      .from("site_blocks")
      .update({ draft_content: updatedContent, has_draft: true })
      .eq("id", blockId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Translation saved as draft for ${fieldKey}`);
      setEdits(prev => {
        const next = { ...prev };
        delete next[editKey];
        return next;
      });
      // Refresh
      const { data } = await supabase
        .from("site_blocks")
        .select("id, page, block_type, title, content, draft_content, has_draft")
        .eq("page", selectedPage)
        .order("sort_order");
      setBlocks((data ?? []) as BlockRow[]);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedPage} onValueChange={setSelectedPage}>
          <SelectTrigger className="w-48 h-9 text-xs">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            {pages.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={editLocale} onValueChange={v => setEditLocale(v as SupportedLanguage)}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.filter(l => l !== "en").map(l => (
              <SelectItem key={l} value={l}>{LANGUAGE_LABELS[l]} ({l.toUpperCase()})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No blocks found for this page.</p>
      )}

      {blocks.map(block => {
        const content = block.has_draft && block.draft_content ? block.draft_content : block.content;
        const fields = extractTextFields(content as Record<string, any>);
        if (fields.length === 0) return null;

        return (
          <Card key={block.id} className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{block.block_type}</Badge>
                {tr(block.title, block.block_type)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fields.map(({ key: fieldKey, value: fieldValue }) => {
                const editKey = `${block.id}.${fieldKey}`;
                const enText = typeof fieldValue === "object" ? (fieldValue.en ?? "") : (typeof fieldValue === "string" ? fieldValue : "");
                const localeText = typeof fieldValue === "object" ? (fieldValue[editLocale] ?? "") : "";
                const isDirty = edits[editKey] !== undefined;
                const displayValue = edits[editKey] ?? localeText;
                const isFallback = !localeText;

                return (
                  <div key={fieldKey} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] text-muted-foreground font-mono">{fieldKey}</code>
                      {isFallback && (
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">fallback EN</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 truncate">
                      EN: {enText}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={displayValue}
                        onChange={e => setEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
                        className="h-8 text-xs flex-1"
                        placeholder={`${LANGUAGE_LABELS[editLocale]} translation...`}
                      />
                      {isDirty && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleSave(block.id, fieldKey)}
                          disabled={saving}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
