import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

type GlobalSectionRendererProps = {
  page: string;
};

const getBlockLabel = (blockType: string, title?: string | null) => {
  if (title?.trim()) return title.trim();
  return blockType
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const GlobalSectionRenderer = ({ page }: GlobalSectionRendererProps) => {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const isEditorPreview = searchParams.get("editorPreview") === "1";

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

    void fetchBlocks();

    return () => {
      mounted = false;
    };
  }, [page]);

  const notifyParent = (payload: Record<string, unknown>) => {
    if (!isEditorPreview || typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ source: "layerloot-editor-preview", ...payload }, window.location.origin);
  };

  if (loading || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block) => {
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
    </>
  );
};

export default GlobalSectionRenderer;
