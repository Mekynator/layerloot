import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Truck,
  Shield,
  Star,
  Printer,
  ChevronLeft,
  ChevronRight,
  Upload,
  Palette,
  ShoppingBag,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface SiteBlock {
  id: string;
  block_type: string;
  title: string | null;
  content: any;
  sort_order: number;
  is_active?: boolean;
  page?: string;
}

export const renderBlock = (block: SiteBlock, disableAnimations = false) => {
  const c = block.content || {};

  switch (block.block_type) {
    case "hero":
      return (
        <section className="relative overflow-hidden bg-secondary py-20 lg:py-32">
          {c.bg_image && (
            <div className="absolute inset-0">
              <img src={c.bg_image} alt="" className="h-full w-full object-contain opacity-30" />
            </div>
          )}

          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)",
              }}
            />
          </div>

          <div className="container relative">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                <span className="font-display text-sm uppercase tracking-widest text-primary">
                  {c.eyebrow || "3D Printing Essentials"}
                </span>
              </div>

              <h1 className="mb-6 font-display text-5xl font-bold uppercase leading-tight text-secondary-foreground lg:text-7xl">
                {c.heading || "Gear Up Your Print Lab"}
              </h1>

              <p className="mb-8 max-w-lg text-lg text-muted-foreground">
                {c.subheading ||
                  "Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop."}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to={c.button_link || "/products"}>
                  <Button size="lg" className="font-display uppercase tracking-wider">
                    {c.button_text || "Shop Now"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Link to={c.secondary_button_link || "/create"}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-muted-foreground/30 font-display uppercase tracking-wider text-secondary hover:border-primary hover:text-primary"
                  >
                    {c.secondary_button_text || "Custom Order"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      );

    case "shipping_banner":
      return (
        <section className="bg-primary py-3">
          <div className="container flex items-center justify-center gap-2 text-primary-foreground">
            <Truck className="h-5 w-5" />
            <span className="font-display text-sm uppercase tracking-widest">
              {c.text || "Free shipping on orders over 500 kr"}
            </span>
          </div>
        </section>
      );

    case "entry_cards":
      return <EntryCardsBlock block={block} disableAnimations={disableAnimations} />;

    case "categories":
      return <CategoriesBlock block={block} />;

    case "featured_products":
      return <FeaturedProductsBlock block={block} />;

    case "how_it_works":
      return <HowItWorksBlock block={block} />;

    case "faq":
      return <FaqBlock block={block} />;

    case "trust_badges":
      return <TrustBadgesBlock block={block} />;

    case "text":
      return (
        <section className="py-16">
          <div className="container">
            {c.heading && (
              <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground">{c.heading}</h2>
            )}
            <p className="whitespace-pre-wrap text-lg text-muted-foreground">{c.body || ""}</p>
          </div>
        </section>
      );

    case "image":
      return (
        <section className="py-16">
          <div className="container">
            {c.image_url ? (
              <img
                src={c.image_url}
                alt={c.alt || ""}
                className="mx-auto max-h-[600px] w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground">
                No image set
              </div>
            )}
          </div>
        </section>
      );

    case "carousel":
      return <CarouselBlock block={block} />;

    case "video":
      return <VideoBlock block={block} />;

    case "banner":
      return (
        <section className="bg-accent py-3">
          <div className="container flex items-center justify-center gap-2 text-accent-foreground">
            <span className="font-display text-sm uppercase tracking-widest">{c.heading}</span>
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="bg-secondary py-16 lg:py-24">
          <div className="container text-center">
            <h2 className="mb-4 font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">
              {c.heading}
            </h2>
            {c.subheading && <p className="mb-8 text-lg text-muted-foreground">{c.subheading}</p>}
            {c.button_text && (
              <Link to={c.button_link || "/products"}>
                <Button size="lg" className="font-display uppercase tracking-wider">
                  {c.button_text} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      );

    case "button":
      return (
        <section className="py-8">
          <div className="container flex justify-center">
            <Link to={c.button_link || "#"}>
              <Button
                variant={c.style === "outline" ? "outline" : c.style === "ghost" ? "ghost" : "default"}
                size="lg"
                className="font-display uppercase tracking-wider"
              >
                {c.button_text || "Click Me"}
              </Button>
            </Link>
          </div>
        </section>
      );

    case "spacer":
      return <div style={{ height: `${c.height || 40}px` }} />;

    case "html":
      return (
        <section className="py-8">
          <div className="container" dangerouslySetInnerHTML={{ __html: c.html || "" }} />
        </section>
      );

    case "embed":
      return (
        <section className="py-8">
          <div className="container">
            {c.heading && (
              <h2 className="mb-4 text-center font-display text-2xl font-bold uppercase text-foreground">
                {c.heading}
              </h2>
            )}
            {c.embed_url ? (
              <div
                className="overflow-hidden rounded-lg border border-border"
                style={{ height: `${c.height || 400}px` }}
              >
                <iframe
                  src={c.embed_url}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground">
                No embed URL set
              </div>
            )}
          </div>
        </section>
      );

    case "newsletter":
      return <NewsletterBlock block={block} />;

    default:
      return <div className="py-8 text-center text-muted-foreground">Unknown block: {block.block_type}</div>;
  }
};

const EntryCardsBlock = ({ block }: { block: SiteBlock; disableAnimations: boolean }) => {
  const c = block.content || {};
  const cards = c.cards || [
    {
      icon: "ShoppingBag",
      title: "Shop Products",
      desc: "Browse our curated collection of 3D printed items, filaments, and accessories.",
      link: "/products",
      cta: "Browse Shop",
    },
    {
      icon: "Palette",
      title: "Customize",
      desc: "Choose your material, color, and finish. Make any product truly yours.",
      link: "/products",
      cta: "Start Customizing",
    },
    {
      icon: "Upload",
      title: "Upload Your Idea",
      desc: "Got a 3D model? Upload it and we'll print it for you with professional quality.",
      link: "/create",
      cta: "Upload Model",
    },
  ];

  const iconMap: Record<string, any> = { ShoppingBag, Palette, Upload };

  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card: any) => {
            const Icon = iconMap[card.icon] || ShoppingBag;

            return (
              <div key={card.title}>
                <Link
                  to={card.link || "/"}
                  className="group flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl"
                >
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-bold uppercase text-card-foreground">{card.title}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{card.desc}</p>
                  <span className="font-display text-sm uppercase tracking-wider text-primary transition-all group-hover:tracking-[0.2em]">
                    {card.cta} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const CategoriesBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const c = block.content || {};

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug, image_url")
      .is("parent_id", null)
      .order("sort_order")
      .limit(c.limit || 6)
      .then(({ data }) => setCategories(data ?? []));
  }, [c.limit]);

  if (categories.length === 0) {
    return (
      <section className="bg-secondary py-16 lg:py-24">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">
            {c.heading || "Shop by Category"}
          </h2>
          <p className="mt-2 text-muted-foreground">{c.subheading || "Find exactly what you need"}</p>
          <p className="mt-8 text-sm italic text-muted-foreground">No categories yet — add some in the admin panel.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">
            {c.heading || "Shop by Category"}
          </h2>
          <p className="mt-2 text-muted-foreground">{c.subheading || "Find exactly what you need"}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id}>
              <Link
                to={`/products?category=${cat.slug}`}
                className="group relative flex h-40 items-end overflow-hidden rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary"
              >
                {cat.image_url && (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="absolute inset-0 h-full w-full object-cover opacity-30 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />

                <h3 className="relative font-display text-xl font-bold uppercase text-secondary-foreground transition-colors group-hover:text-primary">
                  {cat.name}
                </h3>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedProductsBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const [products, setProducts] = useState<any[]>([]);
  const c = block.content || {};

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, slug, price, compare_at_price, images, is_featured, model_url, created_at")
      .eq("is_active", true)
      .eq("is_featured", true)
      .limit(c.limit || 8)
      .then(({ data }) => setProducts(data ?? []));
  }, [c.limit]);

  if (products.length === 0) {
    return (
      <section className="py-16 lg:py-24">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
            {c.heading || "Best Sellers"}
          </h2>
          <p className="mt-2 text-muted-foreground">{c.subheading || "Our most popular 3D printed items"}</p>
          <p className="mt-8 text-sm italic text-muted-foreground">
            No featured products yet — mark products as featured in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
              {c.heading || "Best Sellers"}
            </h2>
            <p className="mt-2 text-muted-foreground">{c.subheading || "Our most popular 3D printed items"}</p>
          </div>

          <Link to="/products">
            <Button
              variant="ghost"
              className="font-display uppercase tracking-wider text-primary hover:text-primary/80"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorksBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const steps = c.steps || [
    { icon: "ShoppingBag", title: "Choose", desc: "Browse products or upload your own 3D model" },
    { icon: "Palette", title: "Customize", desc: "Select material, color, size, and finish" },
    { icon: "Printer", title: "We Print", desc: "Your item is 3D printed with precision" },
    { icon: "Package", title: "Delivered", desc: "Packed safely and shipped to your door" },
  ];

  const iconMap: Record<string, any> = { ShoppingBag, Palette, Printer, Package };

  return (
    <section className="bg-muted/50 py-16 lg:py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
            {c.heading || "How It Works"}
          </h2>
          <p className="mt-2 text-muted-foreground">{c.subheading || "From idea to your doorstep in 4 simple steps"}</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s: any) => {
            const Icon = iconMap[s.icon] || Package;
            return (
              <div key={s.title} className="relative text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-card transition-all hover:border-primary hover:shadow-lg">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-1 font-display text-lg font-bold uppercase text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const FaqBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const items = c.items || [
    {
      q: "What materials do you offer?",
      a: "We offer PLA, PLA Silk, PETG, and Resin. Each material has unique properties suited for different applications — from decorative items to functional parts.",
    },
    {
      q: "How long does printing take?",
      a: "Depending on size and complexity, prints typically take 2-24 hours. Custom orders usually ship within 3-5 business days.",
    },
  ];

  return (
    <section className="py-16 lg:py-24">
      <div className="container max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">
            {c.heading || "Frequently Asked Questions"}
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {items.map((item: any, i: number) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-lg border border-border bg-card px-6">
              <AccordionTrigger className="font-display text-sm uppercase tracking-wider text-card-foreground hover:text-primary hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

const TrustBadgesBlock = ({ block }: { block: SiteBlock; disableAnimations?: boolean }) => {
  const c = block.content || {};
  const badges = c.badges || [
    { icon: "Truck", title: "Free Shipping", desc: "On orders over 500 kr" },
    { icon: "Shield", title: "Secure Checkout", desc: "Stripe & PayPal protected" },
    { icon: "Star", title: "Loyalty Rewards", desc: "Earn points on every purchase" },
  ];

  const iconMap: Record<string, any> = { Truck, Shield, Star };

  return (
    <section className="py-16">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-3">
          {badges.map((badge: any) => {
            const Icon = iconMap[badge.icon] || Shield;
            return (
              <div
                key={badge.title}
                className="flex items-center gap-4 rounded-md border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{badge.title}</h3>
                  <p className="text-sm text-muted-foreground">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const CarouselBlock = ({ block }: { block: SiteBlock }) => {
  const [current, setCurrent] = useState(0);
  const images: string[] = block.content?.images || [];
  if (images.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container">
        {block.title && (
          <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase text-foreground">{block.title}</h2>
        )}

        <div className="relative overflow-hidden rounded-lg">
          <div className="aspect-[21/9] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={current}
                src={images[current]}
                alt=""
                className="h-full w-full object-contain"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
          </div>

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
              >
                <ChevronLeft className="h-[45px] w-[45px] text-primary" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={() => setCurrent((p) => (p + 1) % images.length)}
              >
                <ChevronRight className="h-[45px] w-[45px] text-primary" />
              </Button>

              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 w-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "bg-background/60"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

const VideoBlock = ({ block }: { block: SiteBlock }) => {
  const url = block.content?.video_url;
  if (!url) return null;

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const getYouTubeId = (u: string) => u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?#]+)/)?.[1];
  const getVimeoId = (u: string) => u.match(/vimeo\.com\/(\d+)/)?.[1];

  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="container max-w-4xl">
        {block.title && (
          <h2 className="mb-8 text-center font-display text-3xl font-bold uppercase text-secondary-foreground">
            {block.title}
          </h2>
        )}

        <div className="overflow-hidden rounded-lg border border-border shadow-xl">
          {isYouTube ? (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(url)}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isVimeo ? (
            <div className="aspect-video">
              <iframe
                src={`https://player.vimeo.com/video/${getVimeoId(url)}`}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video">
              <video controls className="h-full w-full object-cover">
                <source src={url} type="video/mp4" />
              </video>
            </div>
          )}
        </div>

        {block.content?.caption && <p className="mt-4 text-center text-muted-foreground">{block.content.caption}</p>}
      </div>
    </section>
  );
};

const NewsletterBlock = ({ block }: { block: SiteBlock }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const c = block.content || {};

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from("newsletter_subscribers").insert({ email } as any);
    setStatus(error ? "error" : "success");
    if (!error) setEmail("");
  };

  return (
    <section className="bg-secondary py-16">
      <div className="container max-w-xl text-center">
        <h2 className="mb-2 font-display text-2xl font-bold uppercase text-secondary-foreground">
          {c.heading || "Stay Updated"}
        </h2>
        <p className="mb-6 text-muted-foreground">
          {c.subheading || "Subscribe to our newsletter for the latest updates."}
        </p>

        {status === "success" ? (
          <p className="font-display text-primary">Thanks for subscribing!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-6 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Subscribe
            </button>
          </form>
        )}

        {status === "error" && <p className="mt-2 text-sm text-destructive">Already subscribed or error occurred.</p>}
      </div>
    </section>
  );
};

export default renderBlock;
