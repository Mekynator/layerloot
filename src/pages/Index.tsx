import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
};

const Index = () => {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("site_blocks").select("*").eq("page", "home").eq("is_active", true).order("sort_order").
    then(({ data }) => setBlocks(data as SiteBlock[] ?? []));
    supabase.from("products").select("id, name, slug, price, compare_at_price, images, is_featured").
    eq("is_active", true).eq("is_featured", true).limit(8).
    then(({ data }) => setFeaturedProducts(data ?? []));
  }, []);

  // Separate blocks by type for ordering
  const heroBlock = blocks.find((b) => b.block_type === "hero");
  const otherBlocks = blocks.filter((b) => b.block_type !== "hero");

  return (
    <div>
      {/* Hero - render using shared BlockRenderer */}
      {heroBlock && renderBlock(heroBlock)}

      {/* Free Shipping Banner */}
      <section className="bg-primary py-3">
        <div className="container flex items-center justify-center gap-2 text-primary-foreground">
          <Truck className="h-5 w-5" />
          <span className="font-display text-sm uppercase tracking-widest">
            Free shipping on orders over 75 kr
          </span>
        </div>
      </section>

      {/* Dynamic blocks from CMS */}
      {otherBlocks.map((block) =>
      <div key={block.id}>{renderBlock(block)}</div>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 &&
      <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div {...fadeUp} className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">Best Sellers</h2>
                <p className="mt-2 text-muted-foreground">​</p>
              </div>
              <Link to="/products">
                <Button variant="ghost" className="font-display uppercase tracking-wider text-primary hover:text-primary/80">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product, i) =>
            <motion.div key={product.id} variants={fadeUp} transition={{ delay: i * 0.1 }}>
                  <Link to={`/products/${product.slug}`} className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary hover:shadow-lg">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      {product.compare_at_price &&
                  <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 font-display text-xs font-bold uppercase text-primary-foreground">Sale</span>
                  }
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{product.name}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-primary">{Number(product.price).toFixed(2)} kr</span>
                        {product.compare_at_price &&
                    <span className="text-sm text-muted-foreground line-through">{Number(product.compare_at_price).toFixed(2)} kr</span>
                    }
                      </div>
                    </div>
                  </Link>
                </motion.div>
            )}
            </motion.div>
          </div>
        </section>
      }

      {/* Trust Badges */}
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid gap-8 sm:grid-cols-3">
            {[
            { icon: Truck, title: "Free Shipping", desc: "On orders over 75 kr" },
            { icon: Shield, title: "Secure Checkout", desc: "Stripe & PayPal protected" },
            { icon: Star, title: "Loyalty Rewards", desc: "Earn points on every purchase" }].
            map(({ icon: Icon, title, desc }, i) =>
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>);

};

export default Index;