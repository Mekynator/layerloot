import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
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

const ProductColorManager = ({
  productId,
  enableColorPicker,
  colorSelectionMode,
  colorRequired,
  onConfigChange,
}: ProductColorManagerProps) => {
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [newColor, setNewColor] = useState({ color_name: "", hex_value: "#3B82F6", group_label: "" });
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
    setNewColor({ color_name: "", hex_value: "#3B82F6", group_label: "" });
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

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display uppercase">Color Picker Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={enableColorPicker}
            onCheckedChange={(v) => onConfigChange({ enable_color_picker: v, color_selection_mode: colorSelectionMode, color_required: colorRequired })}
          />
          <Label>Enable color picker on product page</Label>
        </div>

        {enableColorPicker && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Selection Mode</Label>
                <Select
                  value={colorSelectionMode}
                  onValueChange={(v) => onConfigChange({ enable_color_picker: true, color_selection_mode: v, color_required: colorRequired })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single color</SelectItem>
                    <SelectItem value="multiple">Multiple colors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={colorRequired}
                    onCheckedChange={(v) => onConfigChange({ enable_color_picker: true, color_selection_mode: colorSelectionMode, color_required: v })}
                  />
                  <Label className="text-sm">Required to add to cart</Label>
                </div>
              </div>
            </div>

            {isNewProduct ? (
              <p className="text-xs text-muted-foreground">Save the product first, then add color options.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {colors.map((color) => (
                    <div key={color.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <div className="h-6 w-6 rounded-full border border-border/30" style={{ backgroundColor: color.hex_value }} />
                      <span className="flex-1 text-sm font-medium">{color.color_name}</span>
                      {color.group_label && <span className="text-xs text-muted-foreground">{color.group_label}</span>}
                      <Switch checked={color.is_active} onCheckedChange={(v) => toggleColorActive(color.id, v)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteColor(color.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border/50 bg-muted/10 p-3">
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs">Color Name</Label>
                    <Input value={newColor.color_name} onChange={(e) => setNewColor({ ...newColor, color_name: e.target.value })} placeholder="e.g. Ocean Blue" className="h-8" />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Hex</Label>
                    <div className="flex gap-1">
                      <input type="color" value={newColor.hex_value} onChange={(e) => setNewColor({ ...newColor, hex_value: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0" />
                      <Input value={newColor.hex_value} onChange={(e) => setNewColor({ ...newColor, hex_value: e.target.value })} className="h-8 w-[72px] text-xs" />
                    </div>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Group (opt.)</Label>
                    <Input value={newColor.group_label} onChange={(e) => setNewColor({ ...newColor, group_label: e.target.value })} placeholder="Body" className="h-8" />
                  </div>
                  <Button size="sm" onClick={addColor} className="h-8">
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
