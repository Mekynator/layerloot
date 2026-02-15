import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase.from("site_blocks").select("*").eq("page", slug).eq("is_active", true).order("sort_order")
      .then(({ data }) => { setBlocks((data as SiteBlock[]) ?? []); setLoading(false); });
  }, [slug]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (blocks.length === 0) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Page not found</div>;

  return <div>{blocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}</div>;
};

export default DynamicPage;
