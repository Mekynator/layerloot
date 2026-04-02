import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRememberedChoices } from "@/hooks/use-remembered-choices";
import {
  Baby, Check, Dog, Flower2, Gamepad2, Gift, Home,
  Monitor, Music, Palette, Search, Sparkles, Swords,
  Trophy, Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import GiftFinderResults from "./GiftFinderResults";

const ICON_MAP: Record<string, React.ElementType> = {
  gamer: Gamepad2,
  fantasy: Swords,
  desk: Monitor,
  personalized: Gift,
  home: Home,
  kids: Baby,
  pets: Dog,
  art: Palette,
  music: Music,
  sports: Trophy,
  garden: Flower2,
  tools: Wrench,
};

type GiftFinderTag = {
  id: string;
  name: string;
  slug: string;
  icon_key: string | null;
  is_active?: boolean;
  image_url?: string | null;
  image_opacity?: number | null;
  image_fit?: string | null;
};

type GiftFinderProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  is_featured?: boolean;
};

type GiftFinderLink = {
  product_id: string;
  gift_finder_tag_id: string;
};

export default function GiftFinderSection() {
  const { t } = useTranslation();
  const { choices } = useRememberedChoices();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [tags, setTags] = useState<GiftFinderTag[]>([]);
  const [products, setProducts] = useState<(GiftFinderProduct & { matchScore: number })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from("gift_finder_tags")
        .select("id, name, slug, icon_key, is_active, image_url, image_opacity, image_fit")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Failed to fetch Gift Finder tags:", error.message);
        setTags([]);
        return;
      }
      const fetched = (data as GiftFinderTag[]) ?? [];
      setTags(fetched);
      setTagsLoaded(true);
    };
    void fetchTags();
  }, []);

  // Pre-select tags based on saved gift preferences
  useEffect(() => {
    if (!tagsLoaded || tags.length === 0) return;
    const interests = choices.lastGiftSettings?.recipientInterests;
    if (!interests || interests.length === 0) return;
    const matchedIds = tags
      .filter((tag) => interests.some((i) => tag.slug.includes(i.toLowerCase()) || tag.name.toLowerCase().includes(i.toLowerCase())))
      .map((t) => t.id);
    if (matchedIds.length > 0 && selectedTagIds.length === 0) {
      setSelectedTagIds(matchedIds);
    }
  }, [tagsLoaded, tags, choices.lastGiftSettings]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (selectedTagIds.length === 0) {
        setProducts([]);
        return;
      }
      setLoading(true);

      const { data: links, error: linkError } = await supabase
        .from("product_gift_finder_tags")
        .select("product_id, gift_finder_tag_id")
        .in("gift_finder_tag_id", selectedTagIds);

      if (linkError || !links?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const scoreMap = new Map<string, number>();
      for (const row of (links as GiftFinderLink[]) ?? []) {
        scoreMap.set(row.product_id, (scoreMap.get(row.product_id) ?? 0) + 1);
      }

      const productIds = Array.from(scoreMap.keys());

      const { data: productRows, error: productError } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured")
        .eq("is_active", true)
        .in("id", productIds);

      if (productError || !productRows?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const ranked = ((productRows as GiftFinderProduct[]) ?? [])
        .map((p) => ({ ...p, matchScore: scoreMap.get(p.id) ?? 0 }))
        .sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          if (Boolean(b.is_featured) !== Boolean(a.is_featured))
            return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
          return a.name.localeCompare(b.name);
        });

      setProducts(ranked);
      setLoading(false);
    };
    void fetchMatches();
  }, [selectedTagIds]);

  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const imageFitClass = (fit: string | null | undefined) => {
    if (fit === "contain") return "object-contain";
    if (fit === "stretch") return "object-fill";
    return "object-cover";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <p className="text-[11px] font-display uppercase tracking-[0.3em] text-primary">
          {t("create.giftFinderEyebrow", "Gift Finder")}
        </p>
        <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">
          {t("create.giftFinderTitle", "Find the Best Match")}
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground/70">
          ✨ {t("create.giftFinderAiHint", "AI will recommend the best products for you")}
        </p>
      </div>

      {/* Selection counter */}
      <AnimatePresence>
        {selectedTagIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {selectedTagIds.length} {t("create.selected", "selected")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tags.map((tag, index) => {
          const Icon = ICON_MAP[tag.icon_key ?? "personalized"] ?? Gift;
          const isSelected = selectedTagIds.includes(tag.id);
          const opacity = tag.image_opacity ?? 0.3;

          return (
            <motion.button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 p-6 text-center transition-all duration-300 aspect-[4/3] ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_30px_-4px_hsl(var(--primary)/0.35)]"
                  : "border-border/40 bg-card/60 hover:border-primary/50 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.15)]"
              }`}
            >
              {/* Background image */}
              {tag.image_url && (
                <img
                  src={tag.image_url}
                  alt=""
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full ${imageFitClass(tag.image_fit)} transition-transform duration-500 group-hover:scale-105`}
                  style={{ opacity }}
                />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-background/30" />

              {/* Checkmark */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Icon */}
              <div className="relative z-10">
                <Icon
                  className={`h-8 w-8 transition-colors duration-300 ${
                    isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`}
                />
              </div>

              {/* Label */}
              <span className="relative z-10 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                {tag.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* CTA */}
      <AnimatePresence>
        {selectedTagIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="flex flex-col items-center gap-3"
          >
            <Button
              size="lg"
              className="gap-2 rounded-xl font-display text-sm uppercase tracking-wider px-8"
              onClick={() => {
                document.getElementById("gift-finder-results")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Search className="h-4 w-4" />
              {t("create.findMatches", "Find Matches")} ({selectedTagIds.length})
            </Button>
            <Link
              to="/products"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {t("create.browseAll", "Browse all products")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div id="gift-finder-results">
        <GiftFinderResults
          selectedTagIds={selectedTagIds}
          selectedTagNames={tags.filter((t) => selectedTagIds.includes(t.id)).map((t) => t.name)}
          products={products}
          loading={loading}
          onClear={() => setSelectedTagIds([])}
          onScrollToSelection={() => {
            document.getElementById("gift-finder-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );
}
