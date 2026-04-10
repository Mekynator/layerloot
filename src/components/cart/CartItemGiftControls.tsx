import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/currency";
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
  const [suggestions, setSuggestions] = useState<SuggestedProduct[]>([]);

  useEffect(() => {
    if (!item?.isGift) return;
    let cancelled = false;

    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .limit(8);

      if (cancelled || !data) return;

      const scored = (data as SuggestedProductRaw[]).map((p) => ({
        id: p.id,
        name: p.name || "",
        slug: p.slug || "",
        price: Number(p.price || 0),
        image: p.images?.[0] || "/placeholder.svg",
      }));

      setSuggestions(scored.slice(0, 4));
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [item?.isGift]);

  const toggleAddon = (id: string) => {
    const current = Array.isArray(item.perfectAddons) ? item.perfectAddons : [];
    const next = current.includes(id) ? current.filter((a: string) => a !== id) : [...current, id];
    onChange({ perfectAddons: next });
  };

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
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-card-foreground">{t("cart.thisIsAGift", "This is a gift")}</p>
            <p className="text-xs text-muted-foreground">{t("cart.itemGiftHint", "Mark this item as a gift to add a message or wrap it")}</p>
          </div>
        </div>
        <Switch checked={Boolean(item.isGift)} onCheckedChange={(v) => onChange({ isGift: v })} />
      </button>

      <AnimatePresence>
        {item.isGift && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border px-2 pb-3 pt-3">
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider">{t("cart.personalMessage", "Personal Message")}</Label>
                <Textarea
                  placeholder={t("cart.personalMessagePlaceholder", "Write a heartfelt message for the recipient...")}
                  value={item.giftMessage || ""}
                  onChange={(e) => onChange({ giftMessage: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-right text-[11px] text-muted-foreground">{(item.giftMessage || "").length}/500</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("cart.giftWrapping", "Gift Wrapping")}</p>
                    <p className="text-xs text-muted-foreground">+{formatPrice(25)}</p>
                  </div>
                </div>
                <Switch checked={Boolean(item.giftWrap)} onCheckedChange={(v) => onChange({ giftWrap: v })} />
              </div>

              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">{t("cart.perfectAddons", "Perfect gift add-ons")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {suggestions.map((p) => {
                      const active = Array.isArray(item.perfectAddons) && item.perfectAddons.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleAddon(p.id)}
                          className={`group flex items-center gap-2 rounded-xl border p-2 transition-all ${
                            active ? "border-primary bg-primary/10" : "border-border bg-background/50"
                          }`}
                        >
                          <img src={p.image} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
                            <p className="text-xs font-semibold text-primary">{formatPrice(p.price)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
