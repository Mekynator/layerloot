import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface ColorOption {
  id: string;
  color_name: string;
  hex_value: string;
  group_label: string | null;
  sort_order: number;
}

interface ProductColorSummaryProps {
  productId: string;
}

const ProductColorSummary = ({ productId }: ProductColorSummaryProps) => {
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const { data } = await supabase
        .from("product_color_options")
        .select("id, color_name, hex_value, group_label, sort_order")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      if (mounted) {
        setColors((data as ColorOption[]) ?? []);
        setLoading(false);
      }
    };
    void fetch();
    return () => { mounted = false; };
  }, [productId]);

  if (loading || colors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/30 bg-card/50 p-3"
    >
      <p className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Available Colors
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <div
            key={color.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/20 bg-background/50 px-2.5 py-1"
          >
            <span
              className="h-3 w-3 rounded-full border border-border/30 shrink-0"
              style={{ backgroundColor: color.hex_value }}
            />
            <span className="text-[11px] font-medium text-foreground">
              {color.group_label ? `${color.group_label}: ` : ""}{color.color_name}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProductColorSummary;
