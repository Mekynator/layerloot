import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

type DynamicPageProps = {
  slug?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const DynamicPage = ({
  slug: slugProp,
  emptyTitle = "Page is empty",
  emptyDescription = "Add blocks from the page editor to publish this page.",
}: DynamicPageProps) => {
  const params = useParams();
  const slug = slugProp ?? params.slug ?? "";

  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchBlocks = async () => {
      if (!slug) {
        setBlocks([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("site_blocks")
        .select("*")
        .eq("page", slug)
        .eq("is_active", true)
        .order("sort_order");

      if (!mounted) return;

      if (error) {
        console.error(`Failed to load page blocks for "${slug}"`, error);
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
  }, [slug]);

  const visibleBlocks = useMemo(() => blocks.filter((block) => block.is_active !== false), [blocks]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (visibleBlocks.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">{emptyTitle}</h1>
        <p className="mt-3 text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div>
      {visibleBlocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};

export default DynamicPage;
