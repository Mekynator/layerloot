import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Truck, Shield, Star, Upload, Palette, ShoppingBag,
  Layers, Printer, Package, CheckCircle, HelpCircle, ChevronDown } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import ProductCard from "@/components/ProductCard";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger } from
"@/components/ui/accordion";

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
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("site_blocks").select("*").eq("page", "home").eq("is_active", true).order("sort_order").
    then(({ data }) => setBlocks(data as SiteBlock[] ?? []));
    supabase.from("products").select("id, name, slug, price, compare_at_price, images, is_featured, model_url, created_at").
    eq("is_active", true).eq("is_featured", true).limit(8).
    then(({ data }) => setFeaturedProducts(data ?? []));
    supabase.from("categories").select("id, name, slug, image_url").is("parent_id", null).order("sort_order").limit(6).
    then(({ data }) => setCategories(data ?? []));
  }, []);

  const heroBlock = blocks.find((b) => b.block_type === "hero");
  const otherBlocks = blocks.filter((b) => b.block_type !== "hero");

  return (
    <div>
      {/* Hero - from CMS or default */}
      {heroBlock ? renderBlock(heroBlock) :
      <section className="relative overflow-hidden bg-secondary py-24 lg:py-36">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)"
          }} />
          </div>
          <div className="container relative">
            <div className="max-w-2xl">
              <motion.div {...fadeUp}>
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
                    <Button size="lg" className="font-display uppercase tracking-wider transition-shadow hover:glow-primary">
                      Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/custom-order">
                    <Button size="lg" variant="outline" className="font-display uppercase tracking-wider border-muted-foreground/30 text-secondary-foreground hover:border-primary hover:text-primary">
                      Custom Order
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      }

      {/* Free Shipping Banner */}
      <section className="bg-primary py-3">
        <div className="container flex items-center justify-center gap-2 text-primary-foreground">
          <Truck className="h-5 w-5" />
          <span className="font-display text-sm uppercase tracking-widest">
            Free shipping on orders over 75 kr
          </span>
        </div>
      </section>

      {/* Three Entry Sections */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-3">
            
            {[
            {
              icon: ShoppingBag,
              title: "Shop Products",
              desc: "Browse our curated collection of 3D printed items, filaments, and accessories.",
              link: "/products",
              cta: "Browse Shop"
            },
            {
              icon: Palette,
              title: "Customize",
              desc: "Choose your material, color, and finish. Make any product truly yours.",
              link: "/products",
              cta: "Start Customizing"
            },
            {
              icon: Upload,
              title: "Upload Your Idea",
              desc: "Got a 3D model? Upload it and we'll print it for you with professional quality.",
              link: "/custom-order",
              cta: "Upload Model"
            }].
            map(({ icon: Icon, title, desc, link, cta }, i) =>
            <motion.div key={title} variants={fadeUp} transition={{ delay: i * 0.12 }}>
                <Link
                to={link}
                className="group flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center transition-all duration-300 hover:border-primary hover:shadow-xl hover:-translate-y-1">
                
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-bold uppercase text-card-foreground">
                    {title}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
                  <span className="font-display text-sm uppercase tracking-wider text-primary transition-all group-hover:tracking-[0.2em]">
                    {cta} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Dynamic blocks from CMS */}
      {otherBlocks.map((block) =>
      <div key={block.id}>{renderBlock(block)}</div>
      )}

      {/* Featured Collections / Categories */}
      {categories.length > 0 &&
      <section className="bg-secondary py-16 lg:py-24">
          <div className="container">
            <motion.div {...fadeUp} className="mb-12 text-center">
              <h2 className="font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">
                Shop by Category
              </h2>
              <p className="mt-2 text-muted-foreground">Find exactly what you need</p>
            </motion.div>
            <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            
              {categories.map((cat, i) =>
            <motion.div key={cat.id} variants={fadeUp} transition={{ delay: i * 0.08 }}>
                  <Link
                to={`/products?category=${cat.slug}`}
                className="group relative flex h-40 items-end overflow-hidden rounded-lg border border-border p-6 transition-all duration-300 hover:border-primary hover:-translate-y-1">
                
                    {cat.image_url &&
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-30 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40" />

                }
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />
                    <h3 className="relative font-display text-xl font-bold uppercase text-secondary-foreground transition-colors group-hover:text-primary">
                      {cat.name}
                    </h3>
                  </Link>
                </motion.div>
            )}
            </motion.div>
          </div>
        </section>
      }

      {/* Featured Products */}
      {featuredProducts.length > 0 &&
      <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div {...fadeUp} className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
                  Best Sellers
                </h2>
                <p className="mt-2 text-muted-foreground">Our most popular 3D printed items</p>
              </div>
              <Link to="/products">
                <Button variant="ghost" className="font-display uppercase tracking-wider text-primary hover:text-primary/80">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product, i) =>
            <ProductCard key={product.id} product={product} index={i} />
            )}
            </div>
          </div>
        </section>
      }

      {/* How it Works */}
      <section className="bg-muted/50 py-16 lg:py-24">
        <div className="container">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
              How It Works
            </h2>
            <p className="mt-2 text-muted-foreground">From idea to your doorstep in 4 simple steps</p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            
            {[
            { icon: ShoppingBag, step: "01", title: "Choose", desc: "Browse products or upload your own 3D model" },
            { icon: Palette, step: "02", title: "Customize", desc: "Select material, color, size, and finish" },
            { icon: Printer, step: "03", title: "We Print", desc: "Your item is 3D printed with precision" },
            { icon: Package, step: "04", title: "Delivered", desc: "Packed safely and shipped to your door" }].
            map(({ icon: Icon, step, title, desc }, i) =>
            <motion.div key={step} variants={fadeUp} transition={{ delay: i * 0.1 }}
            className="relative text-center">
              
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-card transition-all hover:border-primary hover:shadow-lg">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                

              
                <h3 className="mb-1 font-display text-lg font-bold uppercase text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
              Frequently Asked Questions
            </h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
            { q: "What materials do you offer?", a: "We offer PLA, PLA Silk, PETG, and Resin. Each material has unique properties suited for different applications — from decorative items to functional parts." },
            { q: "How long does printing take?", a: "Depending on size and complexity, prints typically take 2-24 hours. Custom orders usually ship within 3-5 business days." },
            { q: "Can I upload my own 3D model?", a: "Absolutely! We accept STL, OBJ, and 3MF files. Upload your model through our Custom Order page and choose your preferred material and finish." },
            { q: "What finishes are available?", a: "We offer Raw (straight from the printer), Cleaned (support marks removed and sanded), and Painted (hand-painted with your choice of colors)." },
            { q: "Do you offer international shipping?", a: "Yes! We ship worldwide. Orders over 75 kr qualify for free shipping within our primary shipping zones." },
            { q: "What if my print arrives damaged?", a: "We stand behind our work. If your item arrives damaged, contact us within 48 hours and we'll reprint and reship at no extra cost." }].
            map(({ q, a }, i) =>
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-lg border border-border bg-card px-6">
                <AccordionTrigger className="font-display text-sm uppercase tracking-wider text-card-foreground hover:no-underline hover:text-primary">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {a}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid gap-8 sm:grid-cols-3">
            
            {[
            { icon: Truck, title: "Free Shipping", desc: "On orders over 75 kr" },
            { icon: Shield, title: "Secure Checkout", desc: "Stripe & PayPal protected" },
            { icon: Star, title: "Loyalty Rewards", desc: "Earn points on every purchase" }].
            map(({ icon: Icon, title, desc }, i) =>
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-4 rounded-md border border-border bg-card p-6 transition-all duration-300 hover:border-primary hover:shadow-md hover:-translate-y-0.5">
              
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