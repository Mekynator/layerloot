import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Star, Printer, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface SiteBlock {
  id: string;
  block_type: string;
  title: string | null;
  content: any;
  sort_order: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const Index = () => {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("site_blocks").select("*").eq("page", "home").eq("is_active", true).order("sort_order")
      .then(({ data }) => setBlocks((data as SiteBlock[]) ?? []));
    supabase.from("products").select("id, name, slug, price, compare_at_price, images, is_featured")
      .eq("is_active", true).eq("is_featured", true).limit(8)
      .then(({ data }) => setFeaturedProducts(data ?? []));
  }, []);

  const heroBlock = blocks.find((b) => b.block_type === "hero");
  const carouselBlocks = blocks.filter((b) => b.block_type === "carousel");
  const videoBlocks = blocks.filter((b) => b.block_type === "video");
  const bannerBlocks = blocks.filter((b) => b.block_type === "banner");
  const ctaBlocks = blocks.filter((b) => b.block_type === "cta");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary py-20 lg:py-32">
        {heroBlock?.content?.bg_image && (
          <div className="absolute inset-0">
            <img src={heroBlock.content.bg_image} alt="" className="h-full w-full object-cover opacity-30" />
          </div>
        )}
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
              {heroBlock?.content?.heading || <>Gear Up Your <span className="text-primary">Print Lab</span></>}
            </h1>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
              {heroBlock?.content?.subheading || "Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop."}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={heroBlock?.content?.button_link || "/products"}>
                <Button size="lg" className="font-display uppercase tracking-wider">
                  {heroBlock?.content?.button_text || "Shop Now"} <ArrowRight className="ml-2 h-4 w-4" />
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
            Free shipping on orders over 75 kr
          </span>
        </div>
      </section>

      {/* Dynamic Banners */}
      {bannerBlocks.map((block) => (
        <motion.section key={block.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="bg-accent py-3">
          <div className="container flex items-center justify-center gap-2 text-accent-foreground">
            <span className="font-display text-sm uppercase tracking-widest">{block.content?.heading}</span>
          </div>
        </motion.section>
      ))}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div {...fadeUp} className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">Best Sellers</h2>
                <p className="mt-2 text-muted-foreground">Most popular in the maker community</p>
              </div>
              <Link to="/products">
                <Button variant="ghost" className="font-display uppercase tracking-wider text-primary hover:text-primary/80">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product, i) => (
                <motion.div key={product.id} variants={fadeUp} transition={{ delay: i * 0.1 }}>
                  <Link to={`/products/${product.slug}`} className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary hover:shadow-lg">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      {product.compare_at_price && (
                        <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 font-display text-xs font-bold uppercase text-primary-foreground">Sale</span>
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
            </motion.div>
          </div>
        </section>
      )}

      {/* Dynamic Carousels */}
      {carouselBlocks.map((block) => (
        <CarouselSection key={block.id} block={block} />
      ))}

      {/* Video Sections */}
      {videoBlocks.map((block) => (
        <VideoSection key={block.id} block={block} />
      ))}

      {/* CTA Blocks */}
      {ctaBlocks.map((block) => (
        <motion.section key={block.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-secondary py-16 lg:py-24">
          <div className="container text-center">
            <h2 className="mb-4 font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">{block.content?.heading}</h2>
            {block.content?.subheading && <p className="mb-8 text-lg text-muted-foreground">{block.content.subheading}</p>}
            {block.content?.button_text && (
              <Link to={block.content.button_link || "/products"}>
                <Button size="lg" className="font-display uppercase tracking-wider">{block.content.button_text} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            )}
          </div>
        </motion.section>
      ))}

      {/* Trust Badges */}
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Truck, title: "Free Shipping", desc: "On orders over 75 kr" },
              { icon: Shield, title: "Secure Checkout", desc: "Stripe & PayPal protected" },
              { icon: Star, title: "Loyalty Rewards", desc: "Earn points on every purchase" },
            ].map(({ icon: Icon, title, desc }, i) => (
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
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

/* Carousel Component */
const CarouselSection = ({ block }: { block: SiteBlock }) => {
  const [current, setCurrent] = useState(0);
  const images: string[] = block.content?.images || [];
  if (images.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="py-16">
      <div className="container">
        {block.title && <h2 className="mb-8 font-display text-3xl font-bold uppercase text-foreground text-center">{block.title}</h2>}
        <div className="relative overflow-hidden rounded-lg">
          <div className="aspect-[21/9] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={current}
                src={images[current]}
                alt=""
                className="h-full w-full object-cover"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
          </div>
          {images.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={() => setCurrent((p) => (p + 1) % images.length)}>
                <ChevronRight className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`h-2 w-2 rounded-full transition-all ${i === current ? "bg-primary w-6" : "bg-background/60"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
};

/* Video Component */
const VideoSection = ({ block }: { block: SiteBlock }) => {
  const url = block.content?.video_url;
  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const getYouTubeId = (u: string) => {
    const match = u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?#]+)/);
    return match?.[1];
  };
  const getVimeoId = (u: string) => {
    const match = u.match(/vimeo\.com\/(\d+)/);
    return match?.[1];
  };

  return (
    <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-secondary py-16 lg:py-24">
      <div className="container max-w-4xl">
        {block.title && <h2 className="mb-8 font-display text-3xl font-bold uppercase text-secondary-foreground text-center">{block.title}</h2>}
        <div className="overflow-hidden rounded-lg border border-border shadow-xl">
          {isYouTube ? (
            <div className="aspect-video">
              <iframe src={`https://www.youtube.com/embed/${getYouTubeId(url)}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : isVimeo ? (
            <div className="aspect-video">
              <iframe src={`https://player.vimeo.com/video/${getVimeoId(url)}`} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <div className="aspect-video">
              <video controls className="h-full w-full object-cover">
                <source src={url} type="video/mp4" />
              </video>
            </div>
          )}
        </div>
        {block.content?.caption && (
          <p className="mt-4 text-center text-muted-foreground">{block.content.caption}</p>
        )}
      </div>
    </motion.section>
  );
};

export default Index;
