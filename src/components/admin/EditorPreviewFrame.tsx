import { useEffect, useMemo, useRef, useState } from "react";
import EditorPreviewOverlay, { type PreviewBlockRect } from "@/components/admin/EditorPreviewOverlay";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

interface EditorPreviewFrameProps {
  page: string;
  blocks: SiteBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onEditBlock: (id: string) => void;
  onToggleActive: (id: string) => void;
  onAddBefore?: (id: string) => void;
  onMoveBlock: (draggedId: string, targetId: string) => void;
}

function normalizePreviewRoute(page: string) {
  const safePage = page && page.trim() ? page : "home";
  return `/admin/page-preview/${safePage}`;
}

export default function EditorPreviewFrame({
  page,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onEditBlock,
  onToggleActive,
  onAddBefore,
  onMoveBlock,
}: EditorPreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [overlayBlocks, setOverlayBlocks] = useState<PreviewBlockRect[]>([]);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  const previewSrc = useMemo(() => normalizePreviewRoute(page), [page]);
  const blockTypeMap = useMemo(
    () => new Map(blocks.map((block) => [block.id, block.block_type])),
    [blocks]
  );

  useEffect(() => {
    let raf = 0;
    let interval = 0;

    const measure = () => {
      const iframe = iframeRef.current;
      const container = containerRef.current;
      if (!iframe || !container) return;

      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        const iframeRect = iframe.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const nodeList = Array.from(
          doc.querySelectorAll<HTMLElement>("[data-editor-preview-block='true'][data-block-id]")
        );

        const next: PreviewBlockRect[] = nodeList.map((node) => {
          const id = node.dataset.blockId || "";
          const rect = node.getBoundingClientRect();

          return {
            id,
            type: blockTypeMap.get(id) || node.dataset.blockType || "block",
            top: rect.top - iframeRect.top + (iframeRect.top - containerRect.top),
            left: rect.left - iframeRect.left + (iframeRect.left - containerRect.left),
            width: rect.width,
            height: rect.height,
          };
        });

        setOverlayBlocks(next.filter((item) => item.id));
      } catch {
        setOverlayBlocks([]);
      }
    };

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    run();
    interval = window.setInterval(run, 700);
    window.addEventListener("resize", run);

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", run);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener("resize", run);
      iframe?.removeEventListener("load", run);
    };
  }, [previewSrc, blockTypeMap]);

  const hiddenBlockIds = useMemo(
    () => blocks.filter((block) => !block.is_active).map((block) => block.id),
    [blocks]
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-auto bg-background">
      <iframe
        ref={iframeRef}
        key={previewSrc}
        src={previewSrc}
        title={`Editor preview: ${page}`}
        className="h-[calc(100vh-48px)] w-full border-0 bg-background"
        sandbox="allow-same-origin allow-scripts"
      />

      <EditorPreviewOverlay
        blocks={overlayBlocks}
        selectedBlockId={selectedBlockId}
        hiddenBlockIds={hiddenBlockIds}
        draggingBlockId={draggingBlockId}
        dragOverBlockId={dragOverBlockId}
        onSelectBlock={onSelectBlock}
        onEditBlock={onEditBlock}
        onToggleActive={onToggleActive}
        onAddBefore={onAddBefore}
        onStartDrag={(id) => {
          setDraggingBlockId(id);
          setDragOverBlockId(null);
        }}
        onDragOverBlock={(id) => setDragOverBlockId(id)}
        onDropBlock={(targetId) => {
          if (draggingBlockId && draggingBlockId !== targetId) {
            onMoveBlock(draggingBlockId, targetId);
          }
          setDraggingBlockId(null);
          setDragOverBlockId(null);
        }}
        onEndDrag={() => {
          setDraggingBlockId(null);
          setDragOverBlockId(null);
        }}
      />
    </div>
  );
}
