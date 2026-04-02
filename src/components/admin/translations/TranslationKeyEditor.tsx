import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/i18n";
import type { TranslationEntry } from "@/hooks/use-translation-manager";

interface Props {
  translationKey: string;
  entries: TranslationEntry[];
  onSaveDraft: (key: string, locale: string, value: string) => void;
  saving?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  published: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
  draft: "border-blue-500/50 bg-blue-500/10 text-blue-500",
  missing: "border-red-500/50 bg-red-500/10 text-red-500",
  outdated: "border-amber-500/50 bg-amber-500/10 text-amber-500",
};

export default function TranslationKeyEditor({ translationKey, entries, onSaveDraft, saving }: Props) {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const entryMap: Record<string, TranslationEntry> = {};
  for (const e of entries) entryMap[e.locale] = e;

  const handleChange = (locale: string, value: string) => {
    setEdits(prev => ({ ...prev, [locale]: value }));
  };

  const handleSave = (locale: string) => {
    const val = edits[locale];
    if (val !== undefined) {
      onSaveDraft(translationKey, locale, val);
      setEdits(prev => {
        const next = { ...prev };
        delete next[locale];
        return next;
      });
    }
  };

  const enEntry = entryMap.en;
  const enValue = enEntry?.has_draft ? (enEntry.draft_value ?? enEntry.value) : enEntry?.value ?? "";

  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <code className="text-xs text-muted-foreground font-mono flex-1 truncate">{translationKey}</code>
      </div>

      <div className="grid gap-2">
        {SUPPORTED_LANGUAGES.map(lang => {
          const entry = entryMap[lang];
          const currentValue = edits[lang] ?? (entry?.has_draft ? (entry.draft_value ?? entry.value) : entry?.value ?? "");
          const status = entry?.status ?? "missing";
          const isDirty = edits[lang] !== undefined;

          return (
            <div key={lang} className="flex items-center gap-2">
              <span className="w-8 text-[10px] font-semibold uppercase text-muted-foreground shrink-0">
                {lang}
              </span>
              <Badge variant="outline" className={`text-[9px] w-16 justify-center shrink-0 ${STATUS_COLORS[status] ?? ""}`}>
                {status}
              </Badge>
              <Input
                value={currentValue}
                onChange={e => handleChange(lang, e.target.value)}
                className="h-8 text-xs flex-1"
                placeholder={lang === "en" ? "Source text" : `Translation (${LANGUAGE_LABELS[lang]})`}
              />
              {isDirty && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleSave(lang)}
                  disabled={saving}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
