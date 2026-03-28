import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { renderBlock } from "@/components/admin/BlockRenderer";
import { PageSkeleton } from "@/components/shared/loading-states";
import { usePageBlocks, useSitePage } from "@/hooks/use-page-blocks";

type DynamicPageProps = {
  slug?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const normalizePageSlug = (value?: string) => {
  if (!value || value === "/") return "home";
  return value.replace(/^\/+|\/+$/g, "") || "home";
};

const DynamicPage = ({
  slug: slugProp,
  emptyTitle = "Coming soon",
  emptyDescription = "Content coming soon.",
}: DynamicPageProps) => {
  const params = useParams();
  const slug = normalizePageSlug(slugProp ?? params.slug ?? "");
  const { data: pageMeta, isLoading: isPageLoading } = useSitePage(slug, Boolean(slug));
  const { data: blocks = [], isLoading: isBlocksLoading } = usePageBlocks(slug, Boolean(slug));

  const visibleBlocks = useMemo(() => blocks.filter((block) => block.is_active !== false), [blocks]);
  const isLoading = isPageLoading || isBlocksLoading;

  if (isLoading) return <PageSkeleton />;

  if (pageMeta && pageMeta.is_published === false) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Page unavailable</h1>
        <p className="mt-3 text-muted-foreground">This page is currently unpublished.</p>
      </div>
    );
  }

  if (visibleBlocks.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">
          {pageMeta?.title || pageMeta?.name || emptyTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{pageMeta?.seo_description || emptyDescription}</p>
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
