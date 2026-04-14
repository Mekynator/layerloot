import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ProductCard from "@/components/ProductCard";
import { renderBlock } from "@/components/blocks/BlockRenderer";
import { ProductGridSkeleton, SectionCardSkeleton } from "@/components/shared/loading-states";
import { useStorefrontCatalog } from "@/hooks/use-storefront";
import { useStaticSectionSettings } from "@/hooks/use-static-section-settings";
import { fadeUp } from "@/lib/motion";
import { useIsMobile } from "@/hooks/use-mobile";

const Products = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const [search, setSearch] = useState("");
  const { data, isLoading } = useStorefrontCatalog("products");
  const { isVisible } = useStaticSectionSettings("products");

  const categories = data?.categories ?? [];
  const products = data?.products ?? [];
  const socialProofMap = data?.socialProofMap ?? new Map();
  const pageBlocks = data?.pageBlocks ?? [];

  const activeCategoryRecord = categories.find((c) => c.slug === activeCategory);
  const activeId = activeCategoryRecord?.id ?? null;

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchCategory = activeCategory === "all" || product.category_id === activeId;
      const matchSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, activeId, products, search]);

  const parentCategories = categories.filter((category) => !category.parent_id);

  // Default to Paint By Numbers (or first category) when no URL param is set
  useEffect(() => {
    if (categories.length === 0 || searchParams.get("category")) return;
    const paintByNumbers = categories.find((c) => c.slug === "paint-by-numbers");
    const defaultCat = paintByNumbers ?? parentCategories[0];
    if (defaultCat) setSearchParams({ category: defaultCat.slug }, { replace: true });
  }, [categories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Collapsible categories state — initialized expanded once categories load
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (categories.length === 0) return;
    setExpandedCategories(
      new Set(
        parentCategories
          .filter((p) => categories.some((c) => c.parent_id === p.id))
          .map((p) => p.id),
      ),
    );
  }, [categories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCategory = (id: string) =>
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Product count per category id
  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      if (product.category_id) {
        map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
      }
    }
    return map;
  }, [products]);

  const topBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement !== "after_products",
  );
  const bottomBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement === "after_products",
  );

  const showHeader = isVisible("static_products_header");
  const showGrid = isVisible("static_products_grid");

  return (
    <div>
      {topBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}

      {(showHeader || showGrid) && (
        <section className="py-8 md:py-10">
          <div className="container space-y-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              {/* Desktop sidebar */}
              {showHeader && !isMobile && (
              <aside className="w-full shrink-0 lg:w-64">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="section-surface p-4"
                >
                  <div className="mb-4">
                    <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                      {t("products.categories", { defaultValue: "Categories" })}
                    </span>
                  </div>

                  <nav className="flex flex-col gap-1">
                    <motion.button
                      whileHover={{ x: 2 }}
                      onClick={() => setSearchParams({})}
                      className={`rounded-xl px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-all duration-200 ${
                        activeCategory === "all"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {t("products.allCategories")}
                    </motion.button>

                    {parentCategories.map((category) => {
                      const children = categories.filter((child) => child.parent_id === category.id);
                      const isExpanded = expandedCategories.has(category.id);
                      const count = countByCategory.get(category.id);

                      return (
                        <div key={category.id} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileHover={{ x: 2 }}
                              onClick={() => setSearchParams({ category: category.slug })}
                              className={`flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-all duration-200 ${
                                activeCategory === category.slug
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <span>{category.name}</span>
                              {count !== undefined && (
                                <span className="ml-2 text-xs opacity-55">{count}</span>
                              )}
                            </motion.button>
                            {children.length > 0 && (
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                              </button>
                            )}
                          </div>

                          {isExpanded && children.map((subCategory) => {
                            const subCount = countByCategory.get(subCategory.id);
                            return (
                              <motion.button
                                whileHover={{ x: 2 }}
                                key={subCategory.id}
                                onClick={() => setSearchParams({ category: subCategory.slug })}
                                className={`ml-3 flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left font-display text-xs uppercase tracking-wider transition-all duration-200 ${
                                  activeCategory === subCategory.slug
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                <span>{subCategory.name}</span>
                                {subCount !== undefined && (
                                  <span className="ml-1 opacity-55">{subCount}</span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </nav>
                </motion.div>
              </aside>
              )}

              {showGrid && (
              <div className="min-w-0 flex-1 space-y-6">
                {showHeader && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="section-surface p-4 md:p-5"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("products.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-11 rounded-xl bg-background/80 pl-10"
                      />
                    </div>

                    {/* Mobile: category sheet trigger inline with search */}
                    {isMobile && (
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`shrink-0 max-w-[36vw] truncate font-display text-xs uppercase tracking-wider transition-all ${
                              activeCategory !== "all"
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : ""
                            }`}
                          >
                            {activeCategoryRecord
                              ? activeCategoryRecord.name
                              : t("products.allCategories")}
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl pb-safe">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                              {t("products.categories", { defaultValue: "Categories" })}
                            </span>
                            <motion.div
                              key={filtered.length}
                              initial={{ opacity: 0.6 }}
                              animate={{ opacity: 1 }}
                              className="text-xs text-muted-foreground"
                            >
                              {t("products.productCount", { count: filtered.length, defaultValue: "{{count}} products" })}
                            </motion.div>
                          </div>
                          <nav className="flex flex-col gap-0.5">
                            <button
                              onClick={() => setSearchParams({})}
                              className={`rounded-xl px-3 py-2.5 text-left font-display text-sm uppercase tracking-wider transition-all ${
                                activeCategory === "all"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {t("products.allCategories")}
                            </button>
                            {parentCategories.map((category) => {
                              const children = categories.filter((child) => child.parent_id === category.id);
                              const isExpanded = expandedCategories.has(category.id);
                              const count = countByCategory.get(category.id);
                              return (
                                <div key={category.id} className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setSearchParams({ category: category.slug })}
                                      className={`flex flex-1 items-center justify-between rounded-xl px-3 py-2.5 text-left font-display text-sm uppercase tracking-wider transition-all ${
                                        activeCategory === category.slug
                                          ? "bg-primary text-primary-foreground shadow-sm"
                                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                      }`}
                                    >
                                      <span>{category.name}</span>
                                      {count !== undefined && (
                                        <span className="ml-2 text-xs opacity-55">{count}</span>
                                      )}
                                    </button>
                                    {children.length > 0 && (
                                      <button
                                        onClick={() => toggleCategory(category.id)}
                                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        aria-label={isExpanded ? "Collapse" : "Expand"}
                                      >
                                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                                      </button>
                                    )}
                                  </div>
                                  {isExpanded && children.map((subCategory) => {
                                    const subCount = countByCategory.get(subCategory.id);
                                    return (
                                      <button
                                        key={subCategory.id}
                                        onClick={() => setSearchParams({ category: subCategory.slug })}
                                        className={`ml-4 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-display text-xs uppercase tracking-wider transition-all ${
                                          activeCategory === subCategory.slug
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                      >
                                        <span>{subCategory.name}</span>
                                        {subCount !== undefined && (
                                          <span className="ml-2 opacity-55">{subCount}</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </nav>
                        </SheetContent>
                      </Sheet>
                    )}

                    {/* Desktop: product count */}
                    {!isMobile && (
                      <motion.div
                        key={filtered.length}
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 1 }}
                        className="shrink-0 text-sm text-muted-foreground"
                      >
                        {t("products.productCount", { count: filtered.length, defaultValue: "{{count}} products" })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
                )}

                {isLoading ? (
                  <ProductGridSkeleton count={6} />
                ) : filtered.length === 0 ? (
                  <SectionCardSkeleton lines={2} />
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                    className="grid gap-3 grid-cols-2 md:gap-6 xl:grid-cols-3"
                  >
                    {filtered.map((product, index) => (
                      <motion.div key={product.id} variants={fadeUp}>
                        <ProductCard product={product} socialProof={socialProofMap.get(product.id)} index={index} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {!isLoading && filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="section-surface px-6 py-12 text-center"
                  >
                    <h2 className="font-display text-2xl font-bold uppercase text-foreground">{t("products.noProducts")}</h2>
                    <p className="mt-2 text-muted-foreground">
                      {t("products.noProductsHint")}
                    </p>
                  </motion.div>
                ) : null}
              </div>
              )}
            </div>
          </div>
        </section>
      )}

      {bottomBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};

export default Products;
