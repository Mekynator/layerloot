import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Star, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const categories = [
  { name: "Miniatures", icon: "🎭", description: "Tabletop figures & models", slug: "miniatures" },
  { name: "Tools & Parts", icon: "🔧", description: "Nozzles, beds & upgrades", slug: "tools" },
  { name: "Filaments", icon: "🧵", description: "PLA, ABS, PETG & more", slug: "filaments" },
  { name: "Custom Prints", icon: "🖨️", description: "Made-to-order creations", slug: "custom" },
];

const featuredProducts = [
  { id: "1", name: "Dragon Miniature Set", price: 29.99, originalPrice: 39.99, image: "/placeholder.svg" },
  { id: "2", name: "Hardened Steel Nozzle Pack", price: 14.99, image: "/placeholder.svg" },
  { id: "3", name: "Premium PLA Bundle", price: 49.99, originalPrice: 64.99, image: "/placeholder.svg" },
  { id: "4", name: "Flex Build Plate", price: 34.99, image: "/placeholder.svg" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary py-20 lg:py-32">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)",
          }} />
        </div>
        <div className="container relative">
          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <span className="font-display text-sm uppercase tracking-widest text-primary">
                3D Printing Essentials
              </span>
            </div>
            <h1 className="mb-6 font-display text-5xl font-bold uppercase leading-tight text-secondary-foreground lg:text-7xl">
              Gear Up Your <span className="text-primary">Print Lab</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
              Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="font-display uppercase tracking-wider">
                  Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="font-display uppercase tracking-wider border-muted-foreground/30 text-secondary-foreground hover:border-primary hover:text-primary">
                  Custom Order
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Free Shipping Banner */}
      <section className="bg-primary py-3">
        <div className="container flex items-center justify-center gap-2 text-primary-foreground">
          <Truck className="h-5 w-5" />
          <span className="font-display text-sm uppercase tracking-widest">
            Free shipping on orders over $75
          </span>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
              Browse Categories
            </h2>
            <p className="mt-2 text-muted-foreground">Find exactly what your build needs</p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center transition-all hover:border-primary hover:shadow-lg"
                >
                  <span className="mb-4 text-4xl">{cat.icon}</span>
                  <h3 className="font-display text-lg font-semibold uppercase text-card-foreground">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-muted/50 py-16 lg:py-24">
        <div className="container">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
                Best Sellers
              </h2>
              <p className="mt-2 text-muted-foreground">Most popular in the maker community</p>
            </div>
            <Link to="/products">
              <Button variant="ghost" className="font-display uppercase tracking-wider text-primary hover:text-primary/80">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
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
                  <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">
                    {product.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <Button size="sm" className="mt-3 w-full font-display text-xs uppercase tracking-wider">
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Truck, title: "Free Shipping", desc: "On orders over $75" },
              { icon: Shield, title: "Secure Checkout", desc: "Stripe & PayPal protected" },
              { icon: Star, title: "Loyalty Rewards", desc: "Earn points on every purchase" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4 rounded-lg border border-border bg-card p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
