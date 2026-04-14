import { useMemo, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { renderBlock, type SiteBlock } from "@/components/blocks/BlockRenderer";
import { PageSkeleton } from "@/components/shared/loading-states";
import NotFound from "./NotFound";
import { usePageBlocks, useSitePage } from "@/hooks/use-page-blocks";
import { useUserSignals } from "@/hooks/use-user-signals";
import { shouldShowBlock, getPersonalizedContent } from "@/lib/personalization";
import { useABTesting } from "@/hooks/use-ab-testing";

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

const DynamicPage = ({ slug: slugProp, emptyTitle, emptyDescription }: DynamicPageProps) => {
  const { t } = useTranslation("common");
  const params = useParams();
  const [searchParams] = useSearchParams();
  const slug = normalizePageSlug(slugProp ?? params.slug ?? "");
  const isEditorPreview = searchParams.get("editorPreview") === "1";
  const { data: pageMeta, isLoading: pageLoading } = useSitePage(slug, Boolean(slug));
  const { data: blocks = [], isLoading: blocksLoading } = usePageBlocks(slug, Boolean(slug), isEditorPreview);

  const [localBlocks, setLocalBlocks] = useState<typeof blocks | null>(null);

  // Listen for parent editor sync messages to update preview live
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== "layerloot-editor-sync") return;
      if (data.type === "blocks-update" && Array.isArray(data.blocks)) {
        try {
          const pageBlocksForThis = (data.blocks as any[]).filter((b) => (b.page || "") === slug);
          setLocalBlocks(pageBlocksForThis as any);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [slug]);

  const effectiveBlocks = localBlocks ?? blocks;
  const { signals } = useUserSignals();
  const { getABContent } = useABTesting();

  const visibleBlocks = useMemo(() => {
    const active = (effectiveBlocks ?? []).filter((block) => block.is_active !== false);
    // In editor preview, skip audience filtering to show all blocks
    if (isEditorPreview) return active;
    return active
      .filter((block) => shouldShowBlock(block.content as Record<string, unknown> | null, signals))
      .map((block) => {
        const content = block.content as Record<string, unknown> | null;
        if (!content) return block;
        // A/B variant applied first, then personalization on top
        const abContent = getABContent(block.id, content);
        const personalized = getPersonalizedContent(abContent, signals);
        return personalized === content ? block : { ...block, content: personalized } as SiteBlock;
      });
  }, [effectiveBlocks, signals, isEditorPreview, getABContent]);

  const resolvedEmptyTitle = emptyTitle ?? t("dynamicPage.emptyTitle", "Coming soon");
  const resolvedEmptyDescription = emptyDescription ?? t("dynamicPage.emptyDescription", "Content coming soon.");

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
          {pageMeta.title || pageMeta.name || resolvedEmptyTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{pageMeta.seo_description || resolvedEmptyDescription}</p>
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
