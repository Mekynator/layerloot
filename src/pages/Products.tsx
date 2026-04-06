import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ProductCard from "@/components/ProductCard";
import { renderBlock } from "@/components/admin/BlockRenderer";
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
              {/* Mobile: filter button + sheet */}
              {showHeader && isMobile && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="self-start font-display text-xs uppercase tracking-wider">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      {t("products.categories", { defaultValue: "Categories" })}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
                    <nav className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => setSearchParams({})}
                        className={`rounded-xl px-3 py-3 text-left font-display text-sm uppercase tracking-wider transition-all ${
                          activeCategory === "all"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {t("products.allCategories")}
                      </button>
                      {parentCategories.map((category) => {
                        const children = categories.filter((child) => child.parent_id === category.id);
                        return (
                          <div key={category.id} className="space-y-1">
                            <button
                              onClick={() => setSearchParams({ category: category.slug })}
                              className={`w-full rounded-xl px-3 py-3 text-left font-display text-sm uppercase tracking-wider transition-all ${
                                activeCategory === category.slug
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {category.name}
                            </button>
                            {children.map((subCategory) => (
                              <button
                                key={subCategory.id}
                                onClick={() => setSearchParams({ category: subCategory.slug })}
                                className={`ml-3 w-full rounded-xl px-3 py-2.5 text-left font-display text-xs uppercase tracking-wider transition-all ${
                                  activeCategory === subCategory.slug
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                {subCategory.name}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </nav>
                  </SheetContent>
                </Sheet>
              )}

              {/* Desktop sidebar */}
              {showHeader && !isMobile && (
              <aside className="w-full shrink-0 lg:w-64">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="section-surface p-4"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
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

                      return (
                        <div key={category.id} className="space-y-1">
                          <motion.button
                            whileHover={{ x: 2 }}
                            onClick={() => setSearchParams({ category: category.slug })}
                            className={`w-full rounded-xl px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-all duration-200 ${
                              activeCategory === category.slug
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {category.name}
                          </motion.button>

                          {children.map((subCategory) => (
                            <motion.button
                              whileHover={{ x: 2 }}
                              key={subCategory.id}
                              onClick={() => setSearchParams({ category: subCategory.slug })}
                              className={`ml-3 w-full rounded-xl px-3 py-1.5 text-left font-display text-xs uppercase tracking-wider transition-all duration-200 ${
                                activeCategory === subCategory.slug
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {subCategory.name}
                            </motion.button>
                          ))}
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("products.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-11 rounded-xl bg-background/80 pl-10"
                      />
                    </div>
                    <motion.div
                      key={filtered.length}
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground"
                    >
                      {t("products.productCount", { count: filtered.length, defaultValue: "{{count}} products" })}
                    </motion.div>
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
