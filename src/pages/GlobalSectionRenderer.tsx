import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

type GlobalSectionRendererProps = {
  page: string;
};

const GlobalSectionRenderer = ({ page }: GlobalSectionRendererProps) => {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchBlocks = async () => {
      const { data, error } = await supabase
        .from("site_blocks")
        .select("*")
        .eq("page", page)
        .eq("is_active", true)
        .order("sort_order");

      if (!mounted) return;

      if (error) {
        console.error(`Failed to load global section "${page}"`, error);
        setBlocks([]);
      } else {
        setBlocks((data as SiteBlock[]) ?? []);
      }

      setLoading(false);
    };

    fetchBlocks();

    return () => {
      mounted = false;
    };
  }, [page]);

  if (loading || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </>
  );
};

export default GlobalSectionRenderer;
