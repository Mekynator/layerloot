import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  is_featured: boolean;
  category_id: string | null;
  model_url: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageBlocks, setPageBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      const [prodRes, catRes, blockRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, slug, price, compare_at_price, images, is_featured, category_id, model_url, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, slug, parent_id").order("sort_order"),
        supabase.from("site_blocks").select("*").eq("page", "products").eq("is_active", true).order("sort_order"),
      ]);

      if (!mounted) return;

      setProducts((prodRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setPageBlocks((blockRes.data as SiteBlock[]) ?? []);
      setLoading(false);
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const activeId = categories.find((c) => c.slug === activeCategory)?.id;

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchCategory = activeCategory === "all" || product.category_id === activeId;
        const matchSearch = product.name.toLowerCase().includes(search.toLowerCase());

        return matchCategory && matchSearch;
      }),
    [activeCategory, activeId, products, search],
  );

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

      <section className="py-8">
        <div className="container">
          <h1 className="mb-8 font-display text-4xl font-bold uppercase text-foreground">Products</h1>

          <div className="flex flex-col gap-8 lg:flex-row">
            <aside className="w-full shrink-0 lg:w-56">
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">Categories</span>
              </div>

              <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
                <button
                  onClick={() => setSearchParams({})}
                  className={`rounded-md px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-all duration-200 ${
                    activeCategory === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  All Products
                </button>

                {parentCategories.map((category) => {
                  const children = categories.filter((child) => child.parent_id === category.id);

                  return (
                    <div key={category.id}>
                      <button
                        onClick={() => setSearchParams({ category: category.slug })}
                        className={`w-full rounded-md px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-all duration-200 ${
                          activeCategory === category.slug
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {category.name}
                      </button>

                      {children.map((subCategory) => (
                        <button
                          key={subCategory.id}
                          onClick={() => setSearchParams({ category: subCategory.slug })}
                          className={`ml-4 w-full rounded-md px-3 py-1.5 text-left font-display text-xs uppercase tracking-wider transition-all duration-200 ${
                            activeCategory === subCategory.slug
                              ? "bg-primary text-primary-foreground"
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
            </aside>

            <div className="flex-1">
              <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <span className="text-sm text-muted-foreground">{filtered.length} products</span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Loading products...</div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}

                  {filtered.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">No products found.</div>
                  )}
                </div>
              )}
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
