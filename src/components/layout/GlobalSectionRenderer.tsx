import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { renderBlock, type SiteBlock } from "@/components/blocks/BlockRenderer";
import { usePageBlocks } from "@/hooks/use-page-blocks";

type GlobalSectionRendererProps = {
  page: string;
};

const getBlockLabel = (blockType: string, title?: string | Record<string, string> | null) => {
  if (title) {
    const str = typeof title === "string" ? title : (title.en || Object.values(title)[0] || "");
    if (str.trim()) return str.trim();
  }
  return blockType
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const GlobalSectionRenderer = ({ page }: GlobalSectionRendererProps) => {
  useTranslation();
  const [searchParams] = useSearchParams();
  const isEditorPreview = searchParams.get("editorPreview") === "1";

  const { data: blocks = [], isLoading } = usePageBlocks(page, true, isEditorPreview);

  useEffect(() => {
    if (!isEditorPreview) return;
    document.body.setAttribute("data-editor-preview", "true");
    return () => document.body.removeAttribute("data-editor-preview");
  }, [isEditorPreview]);

  const notifyParent = (payload: Record<string, unknown>) => {
    if (!isEditorPreview || typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ source: "layerloot-editor-preview", ...payload }, window.location.origin);
  };

  if (isLoading || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block) => {
        const label = getBlockLabel(block.block_type, block.title);

        if (!isEditorPreview) return <div key={block.id}>{renderBlock(block)}</div>;

        return (
          <div
            key={block.id}
            data-editor-block-id={block.id}
            data-editor-block-type={label}
            data-editor-block-active={block.is_active === false ? "false" : "true"}
            className="relative"
            onClick={() => notifyParent({ type: "select-block", blockId: block.id })}
            onDoubleClick={() => notifyParent({ type: "edit-block", blockId: block.id })}
          >
            {renderBlock(block)}
          </div>
        );
      })}
    </>
  );
};

export default GlobalSectionRenderer;
