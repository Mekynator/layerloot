import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Gift, Sparkles, Star, Trophy, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

type MatchedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  is_featured?: boolean;
  compare_at_price?: number | null;
  created_at?: string;
  matchScore: number;
};

interface GiftFinderResultsProps {
  selectedTagIds: string[];
  selectedTagNames: string[];
  products: MatchedProduct[];
  loading: boolean;
  onClear: () => void;
  onScrollToSelection: () => void;
}

function buildAiSubtitle(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `Perfect for someone who loves ${names[0]}`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(", ");
  return `These are perfect for a ${rest} lover who also enjoys ${last}`;
}

export default function GiftFinderResults({
  selectedTagIds,
  selectedTagNames,
  products,
  loading,
  onClear,
  onScrollToSelection,
}: GiftFinderResultsProps) {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<MatchedProduct[]>([]);

  const totalTags = selectedTagIds.length;
  const bestMatchCount = products.filter((p) => p.matchScore === totalTags).length;

  // Fetch "You might also like" products
  useEffect(() => {
    if (products.length === 0 || selectedTagIds.length === 0) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      const shownIds = products.map((p) => p.id);

      const { data: links } = await supabase
        .from("product_gift_finder_tags")
        .select("product_id")
        .in("gift_finder_tag_id", selectedTagIds);

      if (!links?.length) return;

      const candidateIds = [
        ...new Set(
          links
            .map((l) => (l as { product_id: string }).product_id)
            .filter((id) => !shownIds.includes(id))
        ),
      ].slice(0, 6);

      if (candidateIds.length === 0) return;

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, slug, price, images, is_featured, compare_at_price, created_at")
        .eq("is_active", true)
        .in("id", candidateIds)
        .limit(6);

      if (prods?.length) {
        setRecommendations(
          (prods as MatchedProduct[]).map((p) => ({ ...p, matchScore: 0 }))
        );
      }
    };

    void fetchRecommendations();
  }, [products, selectedTagIds]);

  if (selectedTagIds.length === 0) return null;

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-display text-sm uppercase tracking-wider text-muted-foreground">
            {t("create.searching", "Finding your perfect matches...")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state ---
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 py-16 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
          <Gift className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-foreground">
            {t("create.noMatchYet", "No matches found")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("create.tryDifferent", "Try selecting different categories for better results")}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onScrollToSelection} className="gap-2 rounded-xl">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("create.editSelection", "Edit Selection")}
          </Button>
          <Button asChild size="sm" className="rounded-xl">
            <Link to="/products">{t("create.browseAll", "Browse all products")}</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  // --- Main results ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-10"
    >
      {/* Sticky selection summary */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border/30 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {selectedTagNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onScrollToSelection}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              {t("create.editSelection", "Edit Selection")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
              {t("create.clearAll", "Clear All")}
            </Button>
          </div>
        </div>
      </div>

      {/* AI header */}
      <div className="space-y-3 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {t("create.aiPowered", "AI-Powered Results")}
          </span>
        </motion.div>

        <h3 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {t("create.foundMatches", "We found {{count}} perfect matches", {
            count: products.length,
          })}
        </h3>

        <p className="mx-auto max-w-lg text-sm text-muted-foreground/70">
          {buildAiSubtitle(selectedTagNames)}
        </p>

        {bestMatchCount > 0 && (
          <p className="text-xs text-muted-foreground">
            <Star className="mr-1 inline h-3 w-3 text-primary" />
            {bestMatchCount} {bestMatchCount === 1 ? "product matches" : "products match"} all your selections
          </p>
        )}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => {
          const isBestMatch = product.matchScore === totalTags && totalTags > 1;
          const isTopPick = !!product.is_featured && !isBestMatch;

          // Build tag match explanation
          const matchedNames = selectedTagNames.slice(0, product.matchScore);
          const matchText =
            matchedNames.length > 0
              ? `Matches your ${matchedNames.join(" + ")} selection`
              : "";

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="relative"
            >
              {/* Smart badge */}
              {(isBestMatch || isTopPick) && (
                <div className="absolute -top-2 left-3 z-20">
                  <Badge
                    className={`border-0 font-display text-[10px] uppercase tracking-wider shadow-lg ${
                      isBestMatch
                        ? "bg-primary text-primary-foreground shadow-primary/25"
                        : "bg-accent text-accent-foreground shadow-accent/25"
                    }`}
                  >
                    {isBestMatch ? (
                      <>
                        <Star className="mr-1 h-3 w-3" />
                        {t("create.bestMatch", "Best Match")}
                      </>
                    ) : (
                      <>
                        <Trophy className="mr-1 h-3 w-3" />
                        {t("create.topPick", "Top Pick")}
                      </>
                    )}
                  </Badge>
                </div>
              )}

              <ProductCard
                product={product}
                index={i}
              />

              {/* Match explanation */}
              {matchText && (
                <div className="mt-1 px-2">
                  <p className="text-[11px] text-muted-foreground/60">
                    ✨ {matchText}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* You might also like */}
      <AnimatePresence>
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 border-t border-border/30 pt-10"
          >
            <div className="text-center">
              <p className="font-display text-lg font-semibold uppercase tracking-wider text-foreground">
                {t("create.youMightAlsoLike", "You Might Also Like")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {t("create.basedOnSelection", "Based on your selection")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recommendations.slice(0, 4).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
