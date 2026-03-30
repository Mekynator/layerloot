import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import { renderBlock } from "@/components/admin/BlockRenderer";
import { ProductGridSkeleton, SectionCardSkeleton } from "@/components/shared/loading-states";
import { useStorefrontCatalog } from "@/hooks/use-storefront";
import { fadeUp } from "@/lib/motion";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const [search, setSearch] = useState("");
  const { data, isLoading } = useStorefrontCatalog("products");

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

  return (
    <div>
      {topBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}

      <section className="py-8 md:py-10">
        <div className="container space-y-8">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-bold uppercase text-foreground">Products</h1>
              <p className="max-w-2xl text-balance text-muted-foreground">
                Print-ready models, accessories, and premium maker gear, now with clearer trust signals and smoother
                browsing.
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col gap-8 lg:flex-row">
            <aside className="w-full shrink-0 lg:w-64">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="section-surface p-4"
              >
                <div className="mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                    Categories
                  </span>
                </div>

                <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => setSearchParams({})}
                    className={`rounded-xl px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-all duration-200 ${
                      activeCategory === "all"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    All Products
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

            <div className="min-w-0 flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="section-surface p-4 md:p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-11 rounded-xl border-border/70 bg-background/80 pl-10"
                    />
                  </div>
                  <motion.div
                    key={filtered.length}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground"
                  >
                    {filtered.length} products
                  </motion.div>
                </div>
              </motion.div>

              {isLoading ? (
                <ProductGridSkeleton count={6} />
              ) : filtered.length === 0 ? (
                <SectionCardSkeleton lines={2} />
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                  className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
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
                  <h2 className="font-display text-2xl font-bold uppercase text-foreground">No products found</h2>
                  <p className="mt-2 text-muted-foreground">
                    Try another category or broaden your search to discover more prints.
                  </p>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {bottomBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};

export default Products;
