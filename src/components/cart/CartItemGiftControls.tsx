import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import type { CartItem } from "@/contexts/CartContext";

type SuggestedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
};

type SuggestedProductRaw = {
  id: string;
  name?: string;
  slug?: string;
  price?: number | string;
  images?: string[];
  is_featured?: boolean;
};

export default function CartItemGiftControls({
  item,
  onChange,
}: {
  item: CartItem;
  onChange: (patch: Partial<CartItem>) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <motion.div layout className="mt-3">
      <button
        onClick={() => onChange({ isGift: !item.isGift })}
        className="flex w-full items-center justify-between p-2"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-card-foreground whitespace-nowrap">{t("cart.thisIsAGift", "This is a gift")}</p>
          </div>
        </div>
        <Switch checked={Boolean(item.isGift)} onCheckedChange={(v) => onChange({ isGift: v })} />
      </button>
    </motion.div>
  );
}
