import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, TrendingUp, Palette, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import type { CatalogProduct } from "@/hooks/use-storefront";

interface UpgradeOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Sparkles;
  priceAdd: number;
}

interface Props {
  currentProduct: CatalogProduct;
  allProducts: CatalogProduct[];
  onSelectUpgrade?: (upgrade: UpgradeOption) => void;
}

export default function ProductUpgradeUpsell({ currentProduct, allProducts, onSelectUpgrade }: Props) {
  const upgrades = useMemo<UpgradeOption[]>(() => {
    const options: UpgradeOption[] = [];
    const price = currentProduct.price;
    const productAny = currentProduct as any;

    // Premium finish
    if (productAny.finish_type !== "painted") {
      options.push({
        id: "premium-finish",
        label: "Premium Painted Finish",
        description: "Hand-painted with premium acrylic paints for a gallery-quality look.",
        icon: Brush,
        priceAdd: Math.round(price * 0.4),
      });
    }

    // Custom color
    options.push({
      id: "custom-color",
      label: "Custom Color",
      description: "Choose your preferred filament color for a personalized print.",
      icon: Palette,
      priceAdd: Math.round(price * 0.15),
    });

    // Larger size
    options.push({
      id: "scale-up",
      label: "Scale Up 150%",
      description: "Bigger impression — scaled 50% larger for more detail and presence.",
      icon: TrendingUp,
      priceAdd: Math.round(price * 0.6),
    });

    return options;
  }, [currentProduct]);

  if (upgrades.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-xl border border-white/[0.06] p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Upgrade your order
        </h3>
        <Badge variant="outline" className="ml-auto border-primary/20 bg-primary/5 text-[10px] text-primary">
          Premium options
        </Badge>
      </div>

      <div className="space-y-3">
        {upgrades.map((upgrade) => {
          const Icon = upgrade.icon;
          return (
            <div
              key={upgrade.id}
              className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-primary/20 hover:bg-white/[0.04]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{upgrade.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{upgrade.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold text-primary">+{formatPrice(upgrade.priceAdd)}</span>
                {onSelectUpgrade && (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => onSelectUpgrade(upgrade)}>
                    Add
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
