import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  is_featured: boolean;
  category_id: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase.from("products").select("id, name, slug, price, compare_at_price, images, is_featured, category_id").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, slug, parent_id").order("sort_order"),
      ]);
      setProducts((prodRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const activeId = categories.find((c) => c.slug === activeCategory)?.id;
  const filtered = products.filter((p) => {
    const matchCat = activeCategory === "all" || p.category_id === activeId;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const parentCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="py-8">
      <div className="container">
        <h1 className="mb-8 font-display text-4xl font-bold uppercase text-foreground">Products</h1>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-56">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">Categories</span>
            </div>
            <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
              <button
                onClick={() => setSearchParams({})}
                className={`rounded-md px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-colors ${
                  activeCategory === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                All Products
              </button>
              {parentCategories.map((cat) => {
                const children = categories.filter((c) => c.parent_id === cat.id);
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => setSearchParams({ category: cat.slug })}
                      className={`w-full rounded-md px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-colors ${
                        activeCategory === cat.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                    {children.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSearchParams({ category: sub.slug })}
                        className={`ml-4 w-full rounded-md px-3 py-1.5 text-left font-display text-xs uppercase tracking-wider transition-colors ${
                          activeCategory === sub.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <span className="text-sm text-muted-foreground">{filtered.length} products</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading products...</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Link
                      to={`/products/${product.slug}`}
                      className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary hover:shadow-lg"
                    >
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        <img src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        {product.compare_at_price && (
                          <Badge className="absolute left-3 top-3 bg-primary font-display uppercase">Sale</Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{product.name}</h3>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-display text-lg font-bold text-primary">{Number(product.price).toFixed(2)} kr</span>
                          {product.compare_at_price && (
                            <span className="text-sm text-muted-foreground line-through">{Number(product.compare_at_price).toFixed(2)} kr</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                {filtered.length === 0 && !loading && (
                  <div className="col-span-full py-12 text-center text-muted-foreground">No products found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
