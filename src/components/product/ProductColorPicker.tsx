import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export interface ColorOption {
  id: string;
  color_name: string;
  hex_value: string;
  group_label: string | null;
  sort_order: number;
}

export interface SelectedColor {
  id: string;
  name: string;
  hex: string;
  group?: string | null;
}

interface ProductColorPickerProps {
  productId: string;
  selectionMode: "single" | "multiple";
  required: boolean;
  selectedColors: SelectedColor[];
  onColorsChange: (colors: SelectedColor[]) => void;
}

const ProductColorPicker = ({
  productId,
  selectionMode,
  required,
  selectedColors,
  onColorsChange,
}: ProductColorPickerProps) => {
  const [options, setOptions] = useState<ColorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const { data } = await supabase
        .from("product_color_options")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      if (mounted) {
        setOptions((data as ColorOption[]) ?? []);
        setLoading(false);
      }
    };
    void fetch();
    return () => { mounted = false; };
  }, [productId]);

  if (loading || options.length === 0) return null;

  const groups = Array.from(new Set(options.map((o) => o.group_label ?? "")));
  const hasGroups = groups.length > 1 || (groups.length === 1 && groups[0] !== "");

  const isSelected = (id: string) => selectedColors.some((c) => c.id === id);

  const toggleColor = (opt: ColorOption) => {
    const sel: SelectedColor = { id: opt.id, name: opt.color_name, hex: opt.hex_value, group: opt.group_label };
    if (selectionMode === "single") {
      onColorsChange(isSelected(opt.id) ? [] : [sel]);
    } else {
      onColorsChange(
        isSelected(opt.id)
          ? selectedColors.filter((c) => c.id !== opt.id)
          : [...selectedColors, sel],
      );
    }
  };

  const renderSwatches = (items: ColorOption[], label?: string) => (
    <div key={label ?? "all"} className="space-y-2">
      {label && (
        <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        {items.map((opt) => {
          const active = isSelected(opt.id);
          const isLight = isLightColor(opt.hex_value);
          return (
            <motion.button
              key={opt.id}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => toggleColor(opt)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition-all duration-200 ${
                active
                  ? "bg-primary/10 ring-2 ring-primary shadow-md shadow-primary/15"
                  : "hover:bg-muted/40"
              }`}
              title={opt.color_name}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  active ? "border-primary" : "border-border/40 group-hover:border-border"
                }`}
                style={{ backgroundColor: opt.hex_value }}
              >
                {active && (
                  <Check className={`h-4 w-4 ${isLight ? "text-foreground" : "text-white"}`} />
                )}
              </div>
              <span className="max-w-[56px] truncate text-[10px] font-medium text-muted-foreground">
                {opt.color_name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Model Colors
        </p>
        {required && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            Required
          </span>
        )}
        {selectionMode === "multiple" && (
          <span className="text-[10px] text-muted-foreground">(select multiple)</span>
        )}
      </div>

      {hasGroups
        ? groups.map((g) =>
            renderSwatches(
              options.filter((o) => (o.group_label ?? "") === g),
              g || undefined,
            ),
          )
        : renderSwatches(options)}

      {selectedColors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedColors.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <span className="h-3 w-3 rounded-full border border-border/30" style={{ backgroundColor: c.hex }} />
              {c.group ? `${c.group}: ` : ""}{c.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

export default ProductColorPicker;
