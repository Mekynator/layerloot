import { useState, useMemo } from "react";
import { Settings2, Palette, Box, Ruler, Sparkles, Trash2, Save, X, Tag, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRememberedChoices, type RememberedChoices } from "@/hooks/use-remembered-choices";
import { useProductOptions } from "@/hooks/use-product-options";
import type { AccountModuleProps } from "./types";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";

/* Multi-select chip picker */
const ChipPicker = ({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) => {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-[10px] pr-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggle(s)}>
              {s}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
      {options.length > 6 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border/20 bg-muted/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      )}
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
        {filtered.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all ${
              selected.includes(opt)
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/20 bg-muted/20 text-muted-foreground hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground/50 py-1">No options found</p>
        )}
      </div>
    </div>
  );
};

const SavedPreferencesModule = ({ tt }: Pick<AccountModuleProps, "tt">) => {
  const { choices, saveChoice } = useRememberedChoices();
  const { data: options, isLoading } = useProductOptions();
  const { toast } = useToast();

  // Parse stored preferences (may be comma-separated strings or arrays)
  const parseStored = (val?: string): string[] => {
    if (!val) return [];
    return val.split(",").map((v) => v.trim()).filter(Boolean);
  };

  const [materials, setMaterials] = useState<string[]>(() => parseStored(choices.lastMaterial));
  const [colors, setColors] = useState<string[]>(() => parseStored(choices.lastColor));
  const [finishes, setFinishes] = useState<string[]>(() => parseStored(choices.lastFinish));
  const [categories, setCategories] = useState<string[]>(() => parseStored(choices.lastSize)); // reuse lastSize for categories
  const [priceRange, setPriceRange] = useState<[number, number]>([
    choices.lastGiftSettings?.recipientAgeGroup ? Number(choices.lastGiftSettings.recipientAgeGroup) || 0 : 0,
    choices.lastGiftSettings?.occasion ? Number(choices.lastGiftSettings.occasion) || 10000 : 10000,
  ]);
  const [dirty, setDirty] = useState(false);

  const updateMaterials = (v: string[]) => { setMaterials(v); setDirty(true); };
  const updateColors = (v: string[]) => { setColors(v); setDirty(true); };
  const updateFinishes = (v: string[]) => { setFinishes(v); setDirty(true); };
  const updateCategories = (v: string[]) => { setCategories(v); setDirty(true); };
  const updatePrice = (v: number[]) => { setPriceRange([v[0], v[1]]); setDirty(true); };

  const saveAll = () => {
    saveChoice("lastMaterial", materials.length ? materials.join(", ") : undefined);
    saveChoice("lastColor", colors.length ? colors.join(", ") : undefined);
    saveChoice("lastFinish", finishes.length ? finishes.join(", ") : undefined);
    saveChoice("lastSize", categories.length ? categories.join(", ") : undefined);
    saveChoice("lastGiftSettings", {
      recipientAgeGroup: String(priceRange[0]),
      occasion: String(priceRange[1]),
      recipientInterests: [],
    });
    setDirty(false);
    toast({ title: tt("account.preferences.saved", "Preferences saved!") });
  };

  const clearAll = () => {
    setMaterials([]); setColors([]); setFinishes([]); setCategories([]);
    setPriceRange([0, options?.priceRange.max || 10000]);
    saveChoice("lastMaterial", undefined);
    saveChoice("lastColor", undefined);
    saveChoice("lastFinish", undefined);
    saveChoice("lastSize", undefined);
    saveChoice("lastGiftSettings", undefined);
    setDirty(false);
    toast({ title: tt("account.preferences.cleared", "Preferences cleared") });
  };

  const resetAllPersonalization = () => {
    clearAll();
    localStorage.removeItem("layerloot_user_behavior");
    localStorage.removeItem("layerloot_remembered_choices");
    toast({ title: tt("account.preferences.personalizationReset", "All personalization data cleared") });
    setTimeout(() => window.location.reload(), 500);
  };

  const hasSaved = materials.length > 0 || colors.length > 0 || finishes.length > 0 || categories.length > 0;

  const sections = [
    {
      key: "materials",
      label: tt("account.preferences.material", "Preferred Materials"),
      icon: Box,
      options: options?.materials ?? [],
      selected: materials,
      onChange: updateMaterials,
    },
    {
      key: "colors",
      label: tt("account.preferences.color", "Preferred Colors"),
      icon: Palette,
      options: options?.colors ?? [],
      selected: colors,
      onChange: updateColors,
    },
    {
      key: "finishes",
      label: tt("account.preferences.finish", "Preferred Finishes"),
      icon: Sparkles,
      options: options?.finishes ?? [],
      selected: finishes,
      onChange: updateFinishes,
    },
    {
      key: "categories",
      label: tt("account.preferences.categories", "Preferred Categories"),
      icon: Tag,
      options: (options?.categories ?? []).map((c) => c.name),
      selected: categories,
      onChange: updateCategories,
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 rounded bg-muted/30" />
            <div className="h-20 rounded bg-muted/20" />
            <div className="h-20 rounded bg-muted/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-sm uppercase">
            <Settings2 className="h-4 w-4 text-primary" /> {tt("account.preferences.title", "Saved Preferences")}
          </CardTitle>
          <div className="flex gap-2">
            {hasSaved && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={clearAll}>
                <Trash2 className="mr-1 h-3 w-3" /> {tt("account.preferences.clearAll", "Reset All")}
              </Button>
            )}
            {dirty && (
              <Button size="sm" className="text-xs" onClick={saveAll}>
                <Save className="mr-1 h-3 w-3" /> {tt("common.save", "Save")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {tt("account.preferences.dynamicHint", "Select your preferences from available product options. These will be used for personalized recommendations.")}
          </p>

          {sections.map((section) => (
            <Collapsible key={section.key} defaultOpen={section.selected.length > 0}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/10 bg-muted/10 px-3 py-2.5 text-left transition-colors hover:bg-muted/20">
                <section.icon className="h-4 w-4 text-primary" />
                <span className="flex-1 text-xs font-medium text-foreground">{section.label}</span>
                {section.selected.length > 0 && (
                  <Badge variant="secondary" className="text-[9px]">{section.selected.length}</Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pl-6">
                {section.options.length > 0 ? (
                  <ChipPicker
                    options={section.options}
                    selected={section.selected}
                    onChange={section.onChange}
                    placeholder={tt("account.preferences.search", "Search...")}
                  />
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 py-2">
                    {tt("account.preferences.noOptions", "No options available yet.")}
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Price range */}
          <Collapsible defaultOpen={priceRange[0] > 0 || priceRange[1] < (options?.priceRange.max || 10000)}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/10 bg-muted/10 px-3 py-2.5 text-left transition-colors hover:bg-muted/20">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="flex-1 text-xs font-medium text-foreground">{tt("account.preferences.priceRange", "Price Range")}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pl-6 pr-2">
              <div className="space-y-2">
                <Slider
                  min={options?.priceRange.min ?? 0}
                  max={options?.priceRange.max ?? 10000}
                  step={10}
                  value={priceRange}
                  onValueChange={updatePrice}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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

      {/* Reset all personalization */}
      <Card className="border-destructive/20">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-foreground">{tt("account.preferences.resetPersonalization", "Reset All Personalization")}</p>
            <p className="text-[10px] text-muted-foreground">{tt("account.preferences.resetHint", "Clears all browsing history, preferences, and recommendation data")}</p>
          </div>
          <Button variant="destructive" size="sm" className="text-xs" onClick={resetAllPersonalization}>
            <Trash2 className="mr-1 h-3 w-3" /> {tt("account.preferences.resetAll", "Reset Everything")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SavedPreferencesModule;
