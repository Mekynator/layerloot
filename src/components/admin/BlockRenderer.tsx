import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Star, Printer, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export interface SiteBlock {
  id: string;
  block_type: string;
  title: string | null;
  content: any;
  sort_order: number;
  is_active?: boolean;
  page?: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export const renderBlock = (block: SiteBlock, disableAnimations = false) => {
  const c = block.content || {};
  const Wrapper = disableAnimations ? "div" : motion.div;
  const wrapperProps = disableAnimations ? {} : { ...fadeUp };

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
            <div className="absolute inset-0" style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)",
            }} />
          </div>
          <div className="container relative">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                <span className="font-display text-sm uppercase tracking-widest text-primary">
                  3D Printing Essentials
                </span>
              </div>
              <h1 className="mb-6 font-display text-5xl font-bold uppercase leading-tight text-secondary-foreground lg:text-7xl">
                {c.heading || <>Gear Up Your <span className="text-primary">Print Lab</span></>}
              </h1>
              <p className="mb-8 max-w-lg text-lg text-muted-foreground">
                {c.subheading || "Premium filaments, tools, miniatures, and custom prints. Everything a maker needs, delivered to your workshop."}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to={c.button_link || "/products"}>
                  <Button size="lg" className="font-display uppercase tracking-wider">
                    {c.button_text || "Shop Now"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="font-display uppercase tracking-wider border-muted-foreground/30 text-secondary-foreground hover:border-primary hover:text-primary">
                    Custom Order
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      );

    case "text":
      return (
        <section className="py-16">
          <div className="container">
            {c.heading && <h2 className="mb-4 font-display text-3xl font-bold uppercase text-foreground">{c.heading}</h2>}
            <p className="text-lg text-muted-foreground whitespace-pre-wrap">{c.body || ""}</p>
          </div>
        </section>
      );

    case "image":
      return (
        <section className="py-16">
          <div className="container">
            {c.image_url ? (
              <img src={c.image_url} alt={c.alt || ""} className="w-full rounded-lg object-contain max-h-[600px] mx-auto" />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground">No image set</div>
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
            <h2 className="mb-4 font-display text-3xl font-bold uppercase text-secondary-foreground lg:text-4xl">{c.heading}</h2>
            {c.subheading && <p className="mb-8 text-lg text-muted-foreground">{c.subheading}</p>}
            {c.button_text && (
              <Link to={c.button_link || "/products"}>
                <Button size="lg" className="font-display uppercase tracking-wider">{c.button_text} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
              <Button variant={c.style === "outline" ? "outline" : c.style === "ghost" ? "ghost" : "default"} size="lg" className="font-display uppercase tracking-wider">
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
            {c.heading && <h2 className="mb-4 font-display text-2xl font-bold uppercase text-foreground text-center">{c.heading}</h2>}
            {c.embed_url ? (
              <div className="overflow-hidden rounded-lg border border-border" style={{ height: `${c.height || 400}px` }}>
                <iframe src={c.embed_url} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground">No embed URL set</div>
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

const CarouselBlock = ({ block }: { block: SiteBlock }) => {
  const [current, setCurrent] = useState(0);
  const images: string[] = block.content?.images || [];
  if (images.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container">
        {block.title && <h2 className="mb-8 font-display text-3xl font-bold uppercase text-foreground text-center">{block.title}</h2>}
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
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}>
                <ChevronLeft className="h-[45px] w-[45px] text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={() => setCurrent((p) => (p + 1) % images.length)}>
                <ChevronRight className="h-[45px] w-[45px] text-primary" />
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
    </section>
  );
};

const VideoBlock = ({ block }: { block: SiteBlock }) => {
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
    <section className="bg-secondary py-16 lg:py-24">
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
    const { supabase: client } = await import("@/integrations/supabase/client");
    const { error } = await client.from("newsletter_subscribers" as any).insert({ email } as any);
    setStatus(error ? "error" : "success");
    if (!error) setEmail("");
  };
  return (
    <section className="bg-secondary py-16">
      <div className="container max-w-xl text-center">
        <h2 className="mb-2 font-display text-2xl font-bold uppercase text-secondary-foreground">{c.heading || "Stay Updated"}</h2>
        <p className="mb-6 text-muted-foreground">{c.subheading || "Subscribe to our newsletter for the latest updates."}</p>
        {status === "success" ? (
          <p className="font-display text-primary">Thanks for subscribing!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <button type="submit" className="rounded-md bg-primary px-6 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90">Subscribe</button>
          </form>
        )}
        {status === "error" && <p className="mt-2 text-sm text-destructive">Already subscribed or error occurred.</p>}
      </div>
    </section>
  );
};

export default renderBlock;
