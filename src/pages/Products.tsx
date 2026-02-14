import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const allCategories = [
  { slug: "all", name: "All Products" },
  { slug: "miniatures", name: "Miniatures" },
  { slug: "tools", name: "Tools & Parts" },
  { slug: "filaments", name: "Filaments" },
  { slug: "custom", name: "Custom Prints" },
];

const mockProducts = [
  { id: "1", name: "Dragon Miniature Set", price: 29.99, originalPrice: 39.99, category: "miniatures", image: "/placeholder.svg" },
  { id: "2", name: "Hardened Steel Nozzle Pack", price: 14.99, category: "tools", image: "/placeholder.svg" },
  { id: "3", name: "Premium PLA Bundle", price: 49.99, originalPrice: 64.99, category: "filaments", image: "/placeholder.svg" },
  { id: "4", name: "Flex Build Plate", price: 34.99, category: "tools", image: "/placeholder.svg" },
  { id: "5", name: "Castle Terrain Kit", price: 24.99, category: "miniatures", image: "/placeholder.svg" },
  { id: "6", name: "PETG Filament 1kg", price: 22.99, category: "filaments", image: "/placeholder.svg" },
  { id: "7", name: "Custom Phone Stand", price: 19.99, category: "custom", image: "/placeholder.svg" },
  { id: "8", name: "Brass Nozzle Variety", price: 9.99, category: "tools", image: "/placeholder.svg" },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const [search, setSearch] = useState("");
  const { addItem } = useCart();

  const filtered = mockProducts.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
              {allCategories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSearchParams(cat.slug === "all" ? {} : { category: cat.slug })}
                  className={`rounded-md px-3 py-2 text-left font-display text-sm uppercase tracking-wider transition-colors ${
                    activeCategory === cat.slug
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          </aside>

          {/* Products Grid */}
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

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    {product.originalPrice && (
                      <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 font-display text-xs font-bold uppercase text-primary-foreground">
                        Sale
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{product.name}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">${product.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 w-full font-display text-xs uppercase tracking-wider"
                      onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image })}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
