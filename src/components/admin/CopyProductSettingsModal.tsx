import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CopyProductSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetProductId: string | null;
  onApply: (data: Partial<Record<string, any>>) => void;
}

const CATEGORIES = [
  {
    key: "basic",
    label: "Basic",
    description: "Name, slug, description, category, featured flag",
    fields: ["name", "slug", "description", "category_id", "is_featured"],
  },
  {
    key: "media",
    label: "Media",
    description: "Gallery images, 3D model URL",
    fields: ["images", "model_url"],
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Price, compare-at price, stock quantity",
    fields: ["price", "compare_at_price", "stock"],
  },
  {
    key: "colors",
    label: "Colors",
    description: "Color picker config + color swatches",
    fields: ["enable_color_picker", "color_selection_mode", "color_required"],
    extra: "colors",
  },
  {
    key: "sections",
    label: "Sections",
    description: "Video, carousel, reusable block sections",
    extra: "sections",
  },
  {
    key: "details",
    label: "Details",
    description: "Material, finish, dimensions, weight, print time, gift finder tags",
    fields: ["material_type", "finish_type", "dimensions_cm", "weight_grams", "print_time_hours"],
    extra: "gift_tags",
  },
] as const;

interface ProductOption {
  id: string;
  name: string;
  images: string[];
}

const CopyProductSettingsModal = ({ open, onOpenChange, targetProductId, onApply }: CopyProductSettingsModalProps) => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [sourceId, setSourceId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setSourceId("");
    setSelected(new Set());
    supabase
      .from("products")
      .select("id, name, images")
      .order("name")
      .then(({ data }) => {
        setProducts(
          ((data as any[]) ?? [])
            .filter((p) => p.id !== targetProductId)
            .map((p) => ({ id: p.id, name: p.name, images: p.images ?? [] }))
        );
      });
  }, [open, targetProductId]);

  const toggleCategory = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleApply = async () => {
    if (!sourceId || selected.size === 0) return;
    setLoading(true);

    try {
      // Fetch source product
      const { data: source, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (error || !source) throw new Error("Could not load source product");

      const src = source as Record<string, any>;
      const draft = src.draft_data as Record<string, any> | null;
      const merged = draft ? { ...src, ...draft } : src;

      const result: Record<string, any> = {};

      for (const cat of CATEGORIES) {
        if (!selected.has(cat.key)) continue;
        if ("fields" in cat && cat.fields) {
          for (const field of cat.fields) {
            if (field === "slug" && targetProductId) continue;
            result[field] = merged[field] ?? null;
          }
        }
      }

      // Copy colors (swatches) if selected
      if (selected.has("colors") && targetProductId && !targetProductId.startsWith("draft-")) {
        const { data: srcColors } = await (supabase as any)
          .from("product_colors")
          .select("*")
          .eq("product_id", sourceId)
          .order("sort_order");

        if (srcColors && srcColors.length > 0) {
          await (supabase as any).from("product_colors").delete().eq("product_id", targetProductId);
          const newColors = srcColors.map((c: any) => ({
            product_id: targetProductId,
            color_name: c.color_name,
            hex_value: c.hex_value,
            sort_order: c.sort_order,
          }));
          await (supabase as any).from("product_colors").insert(newColors);
        }
      }

      // Copy sections if selected
      if (selected.has("sections") && targetProductId && !targetProductId.startsWith("draft-")) {
        const { data: srcSections } = await supabase
          .from("product_detail_sections")
          .select("*")
          .eq("product_id", sourceId)
          .order("sort_order");

        if (srcSections && srcSections.length > 0) {
          await supabase.from("product_detail_sections").delete().eq("product_id", targetProductId);
          const newSections = srcSections.map((s: any) => ({
            product_id: targetProductId,
            section_type: s.section_type,
            title: s.title,
            media_urls: s.media_urls,
            sort_order: s.sort_order,
            is_active: s.is_active,
            reusable_block_id: s.reusable_block_id,
          }));
          await supabase.from("product_detail_sections").insert(newSections);
        }
      }

      // Copy gift finder tags if details selected
      if (selected.has("details") && targetProductId && !targetProductId.startsWith("draft-")) {
        const { data: srcTags } = await supabase
          .from("product_gift_finder_tags")
          .select("gift_finder_tag_id")
          .eq("product_id", sourceId);

        if (srcTags && srcTags.length > 0) {
          await supabase.from("product_gift_finder_tags").delete().eq("product_id", targetProductId);
          await supabase.from("product_gift_finder_tags").insert(
            srcTags.map((t: any) => ({ product_id: targetProductId, gift_finder_tag_id: t.gift_finder_tag_id }))
          );
          // Also update form state with copied tag IDs
          result.gift_finder_tag_ids = srcTags.map((t: any) => t.gift_finder_tag_id);
        }
      }

      onApply(result);
      toast({ title: "Settings copied", description: `Copied ${selected.size} categories from source product.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase flex items-center gap-2">
            <Copy className="h-5 w-5" /> Copy Product Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Source Product</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product to copy from" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceId && (
            <div className="space-y-2">
              <Label>Select categories to copy</Label>
              <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.key}
                    className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(cat.key)}
                      onCheckedChange={() => toggleCategory(cat.key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cat.label}</span>
                        {selected.has(cat.key) && (
                          <Badge variant="secondary" className="text-[9px]">
                            <Check className="h-2.5 w-2.5 mr-0.5" /> Selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(new Set(CATEGORIES.map((c) => c.key)))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={handleApply}
            disabled={!sourceId || selected.size === 0 || loading}
            className="w-full font-display uppercase tracking-wider"
          >
            {loading ? "Copying..." : `Apply ${selected.size} Selected`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopyProductSettingsModal;
