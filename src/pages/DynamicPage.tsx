import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { renderBlock } from "@/components/admin/BlockRenderer";
import { PageSkeleton } from "@/components/shared/loading-states";
import { usePageBlocks } from "@/hooks/use-page-blocks";

type DynamicPageProps = {
  slug?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const DynamicPage = ({
  slug: slugProp,
  emptyTitle = "Coming soon",
  emptyDescription = "Content coming soon.",
}: DynamicPageProps) => {
  const params = useParams();
  const slug = slugProp ?? params.slug ?? "";
  const { data: blocks = [], isLoading } = usePageBlocks(slug, Boolean(slug));
  const visibleBlocks = useMemo(() => blocks.filter((block) => block.is_active !== false), [blocks]);

  if (isLoading) return <PageSkeleton />;

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
