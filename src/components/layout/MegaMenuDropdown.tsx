import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowRight, Sparkles, TrendingUp, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { useActiveCampaign } from "@/hooks/use-active-campaign";
import { Button } from "@/components/ui/button";

export interface MegaMenuConfig {
  enabled: boolean;
  layout: "categories" | "featured" | "full";
  featuredProductIds?: string[];
  bannerImageUrl?: string;
  bannerLink?: string;
  bannerText?: string;
  showCategories?: boolean;
  showNewArrivals?: boolean;
  showBestSellers?: boolean;
}

interface MegaMenuDropdownProps {
  config: MegaMenuConfig;
  children: React.ReactNode;
  linkTo: string;
}

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon_name: string | null;
  image_url: string | null;
  sort_order: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_featured: boolean;
  created_at: string;
};

const MegaMenuDropdown = ({ config, children, linkTo }: MegaMenuDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { campaign } = useActiveCampaign();

  const handleEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setHoveredCategoryId(null);
    }, 280);
  }, []);

  const showCategories = config.showCategories !== false && (config.layout === "categories" || config.layout === "full");
  const showFeatured = config.layout === "featured" || config.layout === "full";
  const showBanner = config.layout === "full" && config.bannerImageUrl;

  // Lazy-load categories
  const { data: categories = [] } = useQuery({
    queryKey: ["mega-menu-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, icon_name, image_url, sort_order")
        .order("sort_order", { ascending: true });
      return (data as Category[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: open && showCategories,
  });

  // Featured products — admin-selected or auto
  const featuredIds = config.featuredProductIds ?? [];
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["mega-menu-featured", featuredIds],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, image_url, category_id, is_featured, created_at");

      if (featuredIds.length > 0) {
        query = query.in("id", featuredIds);
      } else {
        query = query.eq("is_featured", true).limit(4);
      }

      const { data } = await query;
      if (!data || data.length === 0) {
        // Fallback to newest
        const { data: newest } = await supabase
          .from("products")
          .select("id, name, slug, price, image_url, category_id, is_featured, created_at")
          .order("created_at", { ascending: false })
          .limit(4);
        return (newest as Product[]) ?? [];
      }
      return (data as Product[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: open && showFeatured,
  });

  // Products for hovered category
  const { data: categoryProducts = [] } = useQuery({
    queryKey: ["mega-menu-category-products", hoveredCategoryId],
    queryFn: async () => {
      if (!hoveredCategoryId) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, image_url, category_id, is_featured, created_at")
        .eq("category_id", hoveredCategoryId)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data as Product[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: open && !!hoveredCategoryId,
  });

  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const getChildren = useCallback(
    (parentId: string) => categories.filter((c) => c.parent_id === parentId),
    [categories],
  );

  // Which products to show in center
  const displayProducts = hoveredCategoryId && categoryProducts.length > 0 ? categoryProducts : featuredProducts;

  const accentColor = campaign?.theme_overrides?.primaryColor;

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2"
          >
            <div
              className="min-w-[640px] max-w-[880px] rounded-xl border border-border/20 bg-card/95 shadow-[0_16px_64px_-16px_hsl(var(--primary)/0.15)] backdrop-blur-2xl overflow-hidden"
              style={accentColor ? { borderColor: `${accentColor}30` } : undefined}
            >
              <div className="grid grid-cols-12 divide-x divide-border/10">
                {/* Left: Categories */}
                {showCategories && (
                  <div className="col-span-4 p-4 space-y-0.5 max-h-80 overflow-y-auto">
                    <p className="mb-2 px-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground/60">
                      Categories
                    </p>
                    {parentCategories.map((cat) => (
                      <div key={cat.id}>
                        <Link
                          to={`/products?category=${cat.slug}`}
                          className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-150 ${
                            hoveredCategoryId === cat.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                          }`}
                          onMouseEnter={() => setHoveredCategoryId(cat.id)}
                        >
                          <span className="flex-1 font-medium truncate">{cat.name}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </Link>
                        {getChildren(cat.id).map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/products?category=${sub.slug}`}
                            className="flex items-center gap-2 rounded-lg px-2 py-1 pl-6 text-xs text-muted-foreground/70 hover:bg-muted/20 hover:text-foreground transition-colors"
                            onMouseEnter={() => setHoveredCategoryId(sub.id)}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    ))}

                    {/* Quick action links */}
                    <div className="mt-3 pt-3 border-t border-border/10 space-y-0.5">
                      <Link
                        to={linkTo}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-display uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Package className="h-3.5 w-3.5" /> Shop All
                      </Link>
                      {config.showBestSellers !== false && (
                        <Link
                          to="/products?sort=popular"
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                        >
                          <TrendingUp className="h-3.5 w-3.5" /> Best Sellers
                        </Link>
                      )}
                      {config.showNewArrivals !== false && (
                        <Link
                          to="/products?sort=newest"
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> New Arrivals
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Center: Products */}
                {showFeatured && (
                  <div className={`${showCategories && showBanner ? "col-span-5" : showCategories ? "col-span-8" : showBanner ? "col-span-8" : "col-span-12"} p-4`}>
                    <p className="mb-3 px-1 text-[10px] font-display uppercase tracking-widest text-muted-foreground/60">
                      {hoveredCategoryId ? "Products" : "Featured"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {displayProducts.slice(0, 4).map((product) => (
                        <Link
                          key={product.id}
                          to={`/products/${product.slug}`}
                          className="group rounded-lg border border-border/10 bg-muted/10 p-2 transition-all duration-200 hover:border-primary/20 hover:bg-muted/20 hover:shadow-lg"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="mb-2 h-24 w-full rounded-md object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="mb-2 flex h-24 w-full items-center justify-center rounded-md bg-muted/30">
                              <Package className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                          <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(product.price)}</p>
                        </Link>
                      ))}
                    </div>
                    {displayProducts.length === 0 && (
                      <p className="text-xs text-muted-foreground/50 text-center py-8">No products to display</p>
                    )}
                  </div>
                )}

                {/* Right: Banner / Promo */}
                {showBanner && (
                  <div className="col-span-3 p-4 flex flex-col">
                    <Link
                      to={config.bannerLink || linkTo}
                      className="group flex-1 relative rounded-lg overflow-hidden"
                    >
                      <img
                        src={config.bannerImageUrl!}
                        alt={config.bannerText || "Promotion"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {config.bannerText && (
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs font-display uppercase tracking-wider text-white font-bold">
                            {config.bannerText}
                          </p>
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/80 font-display uppercase tracking-wider">
                            Shop Now <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      )}
                    </Link>
                  </div>
                )}

                {/* No categories: show quick actions below products */}
                {!showCategories && showFeatured && (
                  <div className="col-span-12 flex items-center gap-3 border-t border-border/10 px-4 py-2.5">
                    <Link to={linkTo}>
                      <Button size="sm" variant="outline" className="font-display text-[10px] uppercase tracking-wider h-7">
                        <Package className="mr-1 h-3 w-3" /> Shop All
                      </Button>
                    </Link>
                    {config.showBestSellers !== false && (
                      <Link to="/products?sort=popular">
                        <Button size="sm" variant="ghost" className="font-display text-[10px] uppercase tracking-wider h-7 text-muted-foreground">
                          <TrendingUp className="mr-1 h-3 w-3" /> Best Sellers
                        </Button>
                      </Link>
                    )}
                    {config.showNewArrivals !== false && (
                      <Link to="/products?sort=newest">
                        <Button size="sm" variant="ghost" className="font-display text-[10px] uppercase tracking-wider h-7 text-muted-foreground">
                          <Sparkles className="mr-1 h-3 w-3" /> New Arrivals
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MegaMenuDropdown;
