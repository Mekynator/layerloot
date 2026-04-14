import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/blocks/BlockRenderer";
import EditorErrorBoundary from "@/components/admin/EditorErrorBoundary";

function normalizePageParam(pageParam?: string) {
  if (!pageParam || pageParam === "home") return "home";
  return pageParam;
}

export default function EditorPagePreview() {
  const { page: pageParam } = useParams<{ page: string }>();
  const page = useMemo(() => normalizePageParam(pageParam), [pageParam]);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("site_blocks")
        .select("*")
        .eq("page", page)
        .eq("is_active", true)
        .order("sort_order");

      if (!mounted) return;

      if (error) {
        setBlocks([]);
        setLoading(false);
        return;
      }

      setBlocks((data as SiteBlock[]) ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <style>
        {`
          html, body, #root {
            min-height: 100%;
            margin: 0;
            padding: 0;
          }

          a, button {
            pointer-events: none !important;
          }

          [data-editor-preview-block] {
            position: relative;
          }
        `}
      </style>

      {loading ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading preview...
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          No active blocks on this page yet.
        </div>
      ) : (
        <div className="min-h-screen">
          {blocks.map((block) => (
            <EditorErrorBoundary key={block.id}>
              <div
                data-editor-preview-block="true"
                data-block-id={block.id}
                data-block-type={block.block_type}
              >
                {renderBlock(block, true)}
              </div>
            </EditorErrorBoundary>
          ))}
        </div>
      )}
    </div>
  );
}
