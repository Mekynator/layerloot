import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, ChevronDown, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/currency";

export interface GiftSettings {
  enabled: boolean;
  personalMessage: string;
  giftWrap: boolean;
  recipientAgeGroup: string;
  recipientInterests: string[];
  occasion: string;
}

const AGE_GROUPS = ["Child (0-12)", "Teen (13-17)", "Young Adult (18-25)", "Adult (26-45)", "Senior (46+)"];
const OCCASIONS = ["Birthday", "Anniversary", "Holiday", "Thank You", "Housewarming", "Just Because", "Graduation", "Wedding"];
const INTERESTS = ["Gaming", "Technology", "Home Decor", "Art & Design", "Geek Culture", "Minimalist", "Collector", "Office", "Kids"];

const GIFT_WRAP_PRICE = 25;

type SuggestedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
};

export default function GiftMode({
  settings,
  onChange,
}: {
  settings: GiftSettings;
  onChange: (s: GiftSettings) => void;
}) {
  const { t } = useTranslation("common");
  const [suggestions, setSuggestions] = useState<SuggestedProduct[]>([]);

  // Fetch gift suggestions when gift mode is active and context changes
  useEffect(() => {
    if (!settings.enabled) return;
    let cancelled = false;

    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .limit(8);

      if (cancelled || !data) return;

      // Simple keyword matching for now — future-proof for smarter matching
      const scored = data.map((p) => {
        let score = 0;
        const nameL = (p.name || "").toLowerCase();
        if (p.is_featured) score += 2;
        settings.recipientInterests.forEach((interest) => {
          if (nameL.includes(interest.toLowerCase())) score += 3;
        });
        if (settings.occasion && nameL.includes(settings.occasion.toLowerCase())) score += 2;
        return { ...p, score };
      });

      scored.sort((a, b) => b.score - a.score);

      setSuggestions(
        scored.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          image: p.images?.[0] || "/placeholder.svg",
        })),
      );
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [settings.enabled, settings.recipientInterests.join(","), settings.occasion]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleInterest = (interest: string) => {
    const current = settings.recipientInterests;
    onChange({
      ...settings,
      recipientInterests: current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest],
    });
  };

  return (
    <motion.div layout className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-card-foreground">
              This is a gift
            </p>
            <p className="text-xs text-muted-foreground">Add a personal touch</p>
          </div>
        </div>
        <Switch checked={settings.enabled} onCheckedChange={(v) => onChange({ ...settings, enabled: v })} />
      </button>

      <AnimatePresence>
        {settings.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-border px-4 pb-5 pt-4">
              {/* Personal message */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider">Personal Message</Label>
                <Textarea
                  placeholder="Write a heartfelt message for the recipient..."
                  value={settings.personalMessage}
                  onChange={(e) => onChange({ ...settings, personalMessage: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-right text-[11px] text-muted-foreground">{settings.personalMessage.length}/500</p>
              </div>

              {/* Gift wrap toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Gift Wrapping</p>
                    <p className="text-xs text-muted-foreground">+{formatPrice(GIFT_WRAP_PRICE)}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.giftWrap}
                  onCheckedChange={(v) => onChange({ ...settings, giftWrap: v })}
                />
              </div>

              {/* Occasion */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider">Occasion</Label>
                <Select
                  value={settings.occasion}
                  onValueChange={(v) => onChange({ ...settings, occasion: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Age group */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider">Recipient Age Group</Label>
                <Select
                  value={settings.recipientAgeGroup}
                  onValueChange={(v) => onChange({ ...settings, recipientAgeGroup: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label className="font-display text-xs uppercase tracking-wider">Recipient Interests</Label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const active = settings.recipientInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gift suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                      Perfect gift add-ons
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.map((p) => (
                      <Link
                        key={p.id}
                        to={`/products/${p.slug}`}
                        className="group flex items-center gap-2 rounded-xl border border-border bg-background/50 p-2 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
                          <p className="text-xs font-semibold text-primary">{formatPrice(p.price)}</p>
                        </div>
                      </Link>
                    ))}
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
