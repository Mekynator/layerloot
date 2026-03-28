import { useMemo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { renderBlock } from "@/components/admin/BlockRenderer";
import { PageSkeleton } from "@/components/shared/loading-states";
import NotFound from "./NotFound";
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

const getBlockLabel = (blockType: string, title?: string | null) => {
  if (title?.trim()) return title.trim();
  return blockType
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const DynamicPage = ({
  slug: slugProp,
  emptyTitle = "Coming soon",
  emptyDescription = "Content coming soon.",
}: DynamicPageProps) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const slug = normalizePageSlug(slugProp ?? params.slug ?? "");
  const isEditorPreview = searchParams.get("editorPreview") === "1";
  const { data: pageMeta, isLoading: pageLoading } = useSitePage(slug, Boolean(slug));
  const { data: blocks = [], isLoading: blocksLoading } = usePageBlocks(slug, Boolean(slug), isEditorPreview);
  const visibleBlocks = useMemo(() => blocks.filter((block) => block.is_active !== false), [blocks]);

  useEffect(() => {
    if (!isEditorPreview) return;
    document.body.setAttribute("data-editor-preview", "true");
    return () => {
      document.body.removeAttribute("data-editor-preview");
    };
  }, [isEditorPreview]);

  const notifyParent = (payload: Record<string, unknown>) => {
    if (!isEditorPreview || typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ source: "layerloot-editor-preview", ...payload }, window.location.origin);
  };

  if (pageLoading || blocksLoading) return <PageSkeleton />;

  if (!pageMeta) {
    return <NotFound />;
  }

  if (pageMeta.is_published === false && !isEditorPreview) {
    return <NotFound />;
  }

  if (visibleBlocks.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">
          {pageMeta.title || pageMeta.name || emptyTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{pageMeta.seo_description || emptyDescription}</p>
      </div>
    );
  }

  return (
    <div data-editor-page={slug}>
      {visibleBlocks.map((block) => {
        const label = getBlockLabel(block.block_type, block.title);

        if (!isEditorPreview) {
          return <div key={block.id}>{renderBlock(block)}</div>;
        }

        return (
          <div
            key={block.id}
            data-editor-block-id={block.id}
            data-editor-block-type={label}
            data-editor-block-active={block.is_active === false ? "false" : "true"}
            className="relative"
            onClick={() =>
              notifyParent({
                type: "select-block",
                blockId: block.id,
              })
            }
            onDoubleClick={() =>
              notifyParent({
                type: "edit-block",
                blockId: block.id,
              })
            }
          >
            {renderBlock(block)}
          </div>
        );
      })}
    </div>
  );
};

export default DynamicPage;
