import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MonitorSmartphone, Eye, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import EditorPreviewOverlay, { type PreviewBlockRect } from "@/components/admin/EditorPreviewOverlay";

type Props = {
  page: string;
  pagePath: string;
  blocks: SiteBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onEditBlock: (id: string) => void;
  onToggleActive: (id: string) => void;
  onAddBefore: (id: string) => void;
  onMoveBlock: (draggedId: string, targetId: string) => void;
};

const labelForPage = (page: string) => {
  if (page === "home") return "Home";
  return page
    .replace(/^global_/, "Global ")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

export default function EditorPreviewFrame({
  page,
  pagePath,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onEditBlock,
  onToggleActive,
  onAddBefore,
  onMoveBlock,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [overlayBlocks, setOverlayBlocks] = useState<PreviewBlockRect[]>([]);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  const iframeSrc = useMemo(() => {
    const url = new URL(window.location.origin + pagePath);
    url.searchParams.set("editorPreview", "1");
    url.searchParams.set("editorPage", page);
    return url.toString();
  }, [page, pagePath]);

  const totalBlocks = blocks.length;
  const visibleBlocks = blocks.filter((block) => block.is_active !== false).length;
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || null;
  const hiddenBlockIds = blocks.filter((block) => block.is_active === false).map((block) => block.id);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let raf = 0;
    let pollId: number | null = null;

    const syncOverlay = () => {
      const frame = iframeRef.current;
      if (!frame) return;

      try {
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        if (!frameWindow || !frameDocument) return;

        const nodes = Array.from(frameDocument.querySelectorAll<HTMLElement>("[data-editor-block-id]"));

        const nextBlocks: PreviewBlockRect[] = nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            id: node.dataset.editorBlockId || "",
            type: node.dataset.editorBlockType || "Block",
            top: rect.top + frameWindow.scrollY,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        });

        setOverlayBlocks(nextBlocks);
      } catch {
        setOverlayBlocks([]);
      }
    };

    const requestSync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncOverlay);
    };

    const attach = () => {
      try {
        const frameWindow = iframe.contentWindow;
        const frameDocument = iframe.contentDocument;
        if (!frameWindow || !frameDocument) return;

        requestSync();
        frameWindow.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync);

        resizeObserver = new ResizeObserver(requestSync);
        resizeObserver.observe(frameDocument.body);
        resizeObserver.observe(frameDocument.documentElement);

        mutationObserver = new MutationObserver(requestSync);
        mutationObserver.observe(frameDocument.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        pollId = window.setInterval(requestSync, 600);
      } catch {
        setOverlayBlocks([]);
      }
    };

    const detach = () => {
      try {
        iframe.contentWindow?.removeEventListener("scroll", requestSync);
      } catch {}
      window.removeEventListener("resize", requestSync);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (pollId) window.clearInterval(pollId);
    };

    const handleLoad = () => {
      detach();
      attach();
    };

    iframe.addEventListener("load", handleLoad);
    attach();

    return () => {
      cancelAnimationFrame(raf);
      iframe.removeEventListener("load", handleLoad);
      detach();
    };
  }, [iframeSrc, blocks]);

  useEffect(() => {
    if (!selectedBlockId) return;

    const frame = iframeRef.current;
    if (!frame) return;

    const syncAndScroll = () => {
      try {
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        if (!frameWindow || !frameDocument) return;

        const node = frameDocument.querySelector<HTMLElement>(`[data-editor-block-id="${selectedBlockId}"]`);
        if (!node) return;

        node.scrollIntoView({ behavior: "smooth", block: "center" });

        const nodes = Array.from(frameDocument.querySelectorAll<HTMLElement>("[data-editor-block-id]"));
        nodes.forEach((el) => {
          if (el.dataset.editorBlockId === selectedBlockId) {
            el.setAttribute("data-editor-selected", "true");
          } else {
            el.removeAttribute("data-editor-selected");
          }
        });
      } catch {}
    };

    const timeoutId = window.setTimeout(syncAndScroll, 120);
    return () => window.clearTimeout(timeoutId);
  }, [selectedBlockId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== "layerloot-editor-preview") return;

      if (data.type === "select-block" && typeof data.blockId === "string") {
        onSelectBlock(data.blockId);
      }

      if (data.type === "edit-block" && typeof data.blockId === "string") {
        onSelectBlock(data.blockId);
        onEditBlock(data.blockId);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEditBlock, onSelectBlock]);

  const handleDropBlock = (targetId: string) => {
    if (!draggingBlockId || draggingBlockId === targetId) {
      setDraggingBlockId(null);
      setDragOverBlockId(null);
      return;
    }
    onMoveBlock(draggingBlockId, targetId);
    setDraggingBlockId(null);
    setDragOverBlockId(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Live preview</p>
          <p className="text-sm font-medium text-foreground">{labelForPage(page)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <MonitorSmartphone className="h-3.5 w-3.5" />
            <span>{totalBlocks} blocks</span>
            <span>•</span>
            <span>{visibleBlocks} visible</span>
          </div>

          <Button variant="outline" size="sm" asChild>
            <a href={pagePath} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open real page
            </a>
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-muted/20">
        <iframe
          ref={iframeRef}
          key={iframeSrc}
          src={iframeSrc}
          title={`Preview ${page}`}
          className="h-full w-full border-0 bg-background"
          sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer-when-downgrade"
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
          onStartDrag={(id) => setDraggingBlockId(id)}
          onDragOverBlock={(id) => setDragOverBlockId(id)}
          onDropBlock={handleDropBlock}
          onEndDrag={() => {
            setDraggingBlockId(null);
            setDragOverBlockId(null);
          }}
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-3 top-3 max-w-md rounded-md border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-start gap-2">
              <Eye className="mt-0.5 h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {selectedBlock
                    ? `Selected: ${selectedBlock.title || selectedBlock.block_type}`
                    : "Click blocks directly in preview"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Single click selects and scrolls to a block. Double click opens the editor. Drag the handle to reorder
                  sections directly in preview.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 max-w-sm rounded-md border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-start gap-2">
              <MousePointerClick className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-[11px] text-muted-foreground">
                Instagram and some external sites can still block opening from inside preview iframes. Use{" "}
                <span className="font-medium text-foreground">Open real page</span> to test external links.
              </p>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 rounded-md border border-border bg-background/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
            Page path: <span className="font-medium text-foreground">{pagePath}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPreviewFrame;
