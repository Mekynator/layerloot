import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ColorOption {
  id: string;
  color_name: string;
  hex_value: string;
  group_label: string | null;
  is_active: boolean;
  sort_order: number;
}

interface ProductColorManagerProps {
  productId: string;
  enableColorPicker: boolean;
  colorSelectionMode: string;
  colorRequired: boolean;
  onConfigChange: (config: { enable_color_picker: boolean; color_selection_mode: string; color_required: boolean }) => void;
}

/** Nearest-color name from a hex string. */
function hexToColorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const palette = [
    { name: "Red", r: 220, g: 38, b: 38 },
    { name: "Orange", r: 249, g: 115, b: 22 },
    { name: "Amber", r: 245, g: 158, b: 11 },
    { name: "Yellow", r: 234, g: 179, b: 8 },
    { name: "Lime", r: 132, g: 204, b: 22 },
    { name: "Green", r: 34, g: 197, b: 94 },
    { name: "Teal", r: 20, g: 184, b: 166 },
    { name: "Cyan", r: 6, g: 182, b: 212 },
    { name: "Blue", r: 59, g: 130, b: 246 },
    { name: "Indigo", r: 99, g: 102, b: 241 },
    { name: "Violet", r: 139, g: 92, b: 246 },
    { name: "Purple", r: 168, g: 85, b: 247 },
    { name: "Pink", r: 236, g: 72, b: 153 },
    { name: "Rose", r: 244, g: 63, b: 94 },
    { name: "White", r: 255, g: 255, b: 255 },
    { name: "Light Gray", r: 209, g: 213, b: 219 },
    { name: "Gray", r: 107, g: 114, b: 128 },
    { name: "Dark Gray", r: 55, g: 65, b: 81 },
    { name: "Black", r: 17, g: 24, b: 39 },
    { name: "Brown", r: 146, g: 64, b: 14 },
    { name: "Sand", r: 231, g: 204, b: 163 },
    { name: "Navy", r: 30, g: 58, b: 138 },
  ];
  let nearest = palette[0];
  let minDist = Infinity;
  for (const c of palette) {
    const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (dist < minDist) { minDist = dist; nearest = c; }
  }
  return nearest.name;
}

const INITIAL_NEW_COLOR = { color_name: "", hex_value: "#3B82F6", group_label: "", nameWasEdited: false };

const ProductColorManager = ({
  productId,
  enableColorPicker,
  colorSelectionMode,
  onConfigChange,
}: ProductColorManagerProps) => {
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [newColor, setNewColor] = useState(INITIAL_NEW_COLOR);
  const { toast } = useToast();

  const fetchColors = async () => {
    const { data } = await supabase
      .from("product_color_options")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setColors((data as ColorOption[]) ?? []);
  };

  useEffect(() => {
    if (productId && !productId.startsWith("draft-")) void fetchColors();
  }, [productId]);

  const addColor = async () => {
    if (!newColor.color_name.trim()) return;
    const { error } = await supabase.from("product_color_options").insert({
      product_id: productId,
      color_name: newColor.color_name,
      hex_value: newColor.hex_value,
      group_label: newColor.group_label || null,
      sort_order: colors.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewColor(INITIAL_NEW_COLOR);
    await fetchColors();
  };

  const deleteColor = async (id: string) => {
    await supabase.from("product_color_options").delete().eq("id", id);
    await fetchColors();
  };

  const toggleColorActive = async (id: string, active: boolean) => {
    await supabase.from("product_color_options").update({ is_active: active }).eq("id", id);
    await fetchColors();
  };

  const isNewProduct = !productId || productId.startsWith("draft-");

  const handleHexChange = (hex: string) => {
    setNewColor((prev) => ({
      ...prev,
      hex_value: hex,
      color_name: prev.nameWasEdited ? prev.color_name : hexToColorName(hex),
    }));
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display uppercase">Product Colors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={enableColorPicker}
            onCheckedChange={(v) =>
              onConfigChange({ enable_color_picker: v, color_selection_mode: colorSelectionMode, color_required: false })
            }
          />
          <Label>Enable colors for this article</Label>
        </div>

        {enableColorPicker && (
          <>
            <div className="max-w-xs">
              <Label>Color selection</Label>
              <Select
                value={colorSelectionMode}
                onValueChange={(v) =>
                  onConfigChange({ enable_color_picker: true, color_selection_mode: v, color_required: false })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single color</SelectItem>
                  <SelectItem value="multiple">Multiple colors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isNewProduct ? (
              <p className="text-xs text-muted-foreground">Save the product first, then add color options.</p>
            ) : (
              <>
                {colors.length > 0 && (
                  <div className="space-y-2">
                    {colors.map((color) => (
                      <div key={color.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                        <div className="h-6 w-6 shrink-0 rounded-full border border-border/30" style={{ backgroundColor: color.hex_value }} />
                        <span className="flex-1 text-sm font-medium">{color.color_name}</span>
                        {color.group_label && <span className="text-xs text-muted-foreground">{color.group_label}</span>}
                        <Switch checked={color.is_active} onCheckedChange={(v) => toggleColorActive(color.id, v)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteColor(color.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border/50 bg-muted/10 p-3">
                  <div>
                    <Label className="text-xs">Color</Label>
                    <label className="relative mt-1.5 block h-11 w-11 cursor-pointer overflow-hidden rounded-xl border-2 border-border/40 transition hover:border-primary/60">
                      <span className="block h-full w-full" style={{ backgroundColor: newColor.hex_value }} />
                      <input
                        type="color"
                        value={newColor.hex_value}
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        title="Pick a color"
                      />
                    </label>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs">
                      Name <span className="opacity-40">(auto-filled)</span>
                    </Label>
                    <Input
                      value={newColor.color_name}
                      onChange={(e) => setNewColor({ ...newColor, color_name: e.target.value, nameWasEdited: true })}
                      placeholder="e.g. Ocean Blue"
                      className="h-8"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Group (opt.)</Label>
                    <Input
                      value={newColor.group_label}
                      onChange={(e) => setNewColor({ ...newColor, group_label: e.target.value })}
                      placeholder="Body"
                      className="h-8"
                    />
                  </div>
                  <Button size="sm" onClick={addColor} disabled={!newColor.color_name.trim()} className="h-8">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductColorManager;

