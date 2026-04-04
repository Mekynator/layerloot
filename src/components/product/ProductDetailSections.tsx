import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import BlockRenderer, { type SiteBlock } from "@/components/admin/BlockRenderer";

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
      <BlockRenderer {...siteBlock} />
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
            controls
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

  if (images.length === 0) return null;

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
      <div className="relative overflow-hidden rounded-2xl bg-card">
        <div className="aspect-[16/9]">
          <AnimatePresence mode="wait">
            <motion.img
              key={current}
              src={images[current]}
              alt={`${section.title || "Gallery"} ${current + 1}`}
              className="h-full w-full object-cover"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={() => setCurrent((p) => (p - 1 + images.length) % images.length)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={() => setCurrent((p) => (p + 1) % images.length)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/65 px-3 py-1.5 backdrop-blur-sm">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === current ? "w-5 bg-foreground" : "w-1.5 bg-foreground/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg transition-all ${
                i === current ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default ProductDetailSections;
