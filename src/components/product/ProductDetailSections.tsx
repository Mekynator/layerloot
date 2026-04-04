import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

interface Section {
  id: string;
  section_type: string;
  title: string | null;
  media_urls: string[];
  sort_order: number;
  reusable_block_id: string | null;
}

interface ReusableBlock {
  id: string;
  block_type: string;
  content: any;
  name: string;
}

interface ProductDetailSectionsProps {
  productId: string;
}

const ProductDetailSections = ({ productId }: ProductDetailSectionsProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [reusableBlocks, setReusableBlocks] = useState<Record<string, ReusableBlock>>({});

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const { data } = await supabase
        .from("product_detail_sections")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      if (!mounted) return;
      const sections = (data as Section[]) ?? [];
      setSections(sections);

      // Fetch reusable blocks for sections that reference them
      const blockIds = sections
        .filter(s => s.section_type === "reusable_block" && s.reusable_block_id)
        .map(s => s.reusable_block_id!);
      
      if (blockIds.length > 0) {
        const { data: blocks } = await supabase
          .from("reusable_blocks")
          .select("id, block_type, content, name")
          .in("id", blockIds)
          .eq("is_archived", false);
        if (mounted && blocks) {
          const map: Record<string, ReusableBlock> = {};
          for (const b of blocks) map[b.id] = b as ReusableBlock;
          setReusableBlocks(map);
        }
      }
    };
    void fetch();
    return () => { mounted = false; };
  }, [productId]);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.id}>
          {section.section_type === "video" && <VideoSection section={section} />}
          {section.section_type === "image_carousel" && <ImageCarouselSection section={section} />}
          {section.section_type === "reusable_block" && section.reusable_block_id && (
            <ReusableBlockSection section={section} block={reusableBlocks[section.reusable_block_id]} />
          )}
        </div>
      ))}
    </div>
  );
};

function ReusableBlockSection({ section, block }: { section: Section; block?: ReusableBlock }) {
  if (!block) return null;

  const siteBlock: SiteBlock = {
    id: block.id,
    block_type: block.block_type,
    title: section.title || block.name,
    content: block.content,
    sort_order: section.sort_order,
    is_active: true,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {renderBlock(siteBlock)}
    </motion.div>
  );
}

function VideoSection({ section }: { section: Section }) {
  const url = section.media_urls?.[0];
  if (!url) return null;

  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-3"
    >
      {section.title && (
        <h3 className="font-display text-lg font-bold uppercase text-foreground">{section.title}</h3>
      )}
      <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
        {isYoutube || isVimeo ? (
          <div className="aspect-video">
            <iframe
              src={isYoutube ? url.replace("watch?v=", "embed/") : url}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={section.title || "Video"}
            />
          </div>
        ) : (
          <video
            src={url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-2xl"
            preload="metadata"
          />
        )}
      </div>
    </motion.div>
  );
}

function ImageCarouselSection({ section }: { section: Section }) {
  const [current, setCurrent] = useState(0);
  const images = section.media_urls ?? [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (images.length === 0) return null;

  const goTo = (index: number) => {
    setCurrent(index);
  };

  const goNext = () => goTo((current + 1) % images.length);
  const goPrev = () => goTo((current - 1 + images.length) % images.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || images.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartRef.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-3"
    >
      {section.title && (
        <h3 className="font-display text-base font-bold uppercase text-foreground md:text-lg">{section.title}</h3>
      )}
      <div
        className="relative overflow-hidden rounded-xl bg-card md:rounded-2xl touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="aspect-[4/3] md:aspect-[16/9]">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={images[current]}
              alt={`${section.title || "Gallery"} ${current + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
        </div>

        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background h-8 w-8 md:h-10 md:w-10 md:left-3"
              onClick={goPrev}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background h-8 w-8 md:h-10 md:w-10 md:right-3"
              onClick={goNext}
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/65 px-2.5 py-1 backdrop-blur-sm md:bottom-3 md:px-3 md:py-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === current ? "w-4 bg-foreground md:w-5" : "w-1.5 bg-foreground/40"}`}
                  aria-label={`Image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 md:gap-2 scrollbar-none">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all md:h-14 md:w-14 ${
                i === current ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default ProductDetailSections;
