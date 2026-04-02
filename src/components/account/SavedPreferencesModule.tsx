import { useState } from "react";
import { Settings2, Palette, Box, Ruler, Sparkles, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRememberedChoices, type RememberedChoices } from "@/hooks/use-remembered-choices";
import type { AccountModuleProps } from "./types";
import { useToast } from "@/hooks/use-toast";

const SavedPreferencesModule = ({ tt }: Pick<AccountModuleProps, "tt">) => {
  const { choices, saveChoice } = useRememberedChoices();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<RememberedChoices>>({});

  const startEditing = () => {
    setDraft({
      lastMaterial: choices.lastMaterial ?? "",
      lastColor: choices.lastColor ?? "",
      lastSize: choices.lastSize ?? "",
      lastFinish: choices.lastFinish ?? "",
    });
    setEditing(true);
  };

  const saveEdits = () => {
    if (draft.lastMaterial !== undefined) saveChoice("lastMaterial", draft.lastMaterial || undefined);
    if (draft.lastColor !== undefined) saveChoice("lastColor", draft.lastColor || undefined);
    if (draft.lastSize !== undefined) saveChoice("lastSize", draft.lastSize || undefined);
    if (draft.lastFinish !== undefined) saveChoice("lastFinish", draft.lastFinish || undefined);
    setEditing(false);
    toast({ title: tt("account.preferences.saved", "Preferences saved!") });
  };

  const clearAll = () => {
    saveChoice("lastMaterial", undefined);
    saveChoice("lastColor", undefined);
    saveChoice("lastSize", undefined);
    saveChoice("lastFinish", undefined);
    setEditing(false);
    toast({ title: tt("account.preferences.cleared", "Preferences cleared") });
  };

  const hasSaved = choices.lastMaterial || choices.lastColor || choices.lastSize || choices.lastFinish;

  const prefItems = [
    { key: "lastMaterial" as const, label: tt("account.preferences.material", "Favorite Material"), icon: Box, value: choices.lastMaterial },
    { key: "lastColor" as const, label: tt("account.preferences.color", "Preferred Color"), icon: Palette, value: choices.lastColor },
    { key: "lastSize" as const, label: tt("account.preferences.size", "Preferred Size"), icon: Ruler, value: choices.lastSize },
    { key: "lastFinish" as const, label: tt("account.preferences.finish", "Finishing Style"), icon: Sparkles, value: choices.lastFinish },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
            <Settings2 className="h-4 w-4 text-primary" /> {tt("account.preferences.title", "Saved Preferences")}
          </CardTitle>
          <div className="flex gap-2">
            {hasSaved && !editing && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={clearAll}>
                <Trash2 className="mr-1 h-3 w-3" /> {tt("account.preferences.clearAll", "Clear All")}
              </Button>
            )}
            {editing ? (
              <>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditing(false)}>
                  {tt("common.cancel", "Cancel")}
                </Button>
                <Button size="sm" className="text-xs" onClick={saveEdits}>
                  <Save className="mr-1 h-3 w-3" /> {tt("common.save", "Save")}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="text-xs" onClick={startEditing}>
                {tt("account.preferences.edit", "Edit Preferences")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {prefItems.map(item => (
                <div key={item.key} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5">
                    <item.icon className="h-3 w-3 text-muted-foreground" /> {item.label}
                  </Label>
                  <Input
                    value={(draft as any)[item.key] ?? ""}
                    onChange={e => setDraft(prev => ({ ...prev, [item.key]: e.target.value }))}
                    placeholder={tt("account.preferences.enterValue", "Enter value...")}
                  />
                </div>
              ))}
            </div>
          ) : hasSaved ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {prefItems.filter(item => item.value).map(item => (
                <div key={item.key} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/30 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Settings2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p>{tt("account.preferences.empty", "No saved preferences yet.")}</p>
              <p className="text-xs mt-1">{tt("account.preferences.emptyHint", "Your material, color, and size choices will be remembered as you shop and configure products.")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant history */}
      {choices.lastVariantIds && Object.keys(choices.lastVariantIds).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-sm uppercase">{tt("account.preferences.recentChoices", "Recent Configuration Choices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(choices.lastVariantIds).slice(0, 8).map(([productId, variantId]) => (
                <Badge key={productId} variant="outline" className="text-[10px]">
                  Product {productId.slice(0, 6)}… → {variantId.slice(0, 6)}…
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SavedPreferencesModule;
