import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import EditorPreviewOverlay, { type PreviewBlockRect } from "@/components/admin/EditorPreviewOverlay";
import { useVisualEditor } from "@/contexts/VisualEditorContext";

type Props = {
  page: string;
  pagePath: string;
  blocks: SiteBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onEditBlock: (id: string) => void;
  onToggleActive: (id: string) => void;
  onAddBefore: (id: string) => void;
  onAddAtIndex?: (index: number) => void;
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
  const [inlineEdit, setInlineEdit] = useState<{
    blockId: string;
    field: string;
    text: string;
    rect: { top: number; left: number; width: number; height: number } | null;
    original?: string;
  } | null>(null);

  const editor = useVisualEditor();

  const iframeSrc = useMemo(() => {
    const url = new URL(window.location.origin + pagePath);
    url.searchParams.set("editorPreview", "1");
    url.searchParams.set("editorPage", page);
    return url.toString();
  }, [page, pagePath]);

  const totalBlocks = blocks.length;
  const visibleBlocks = blocks.filter((block) => block.is_active !== false).length;
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

        const nextBlocks: PreviewBlockRect[] = nodes
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              id: node.dataset.editorBlockId || "",
              type: node.dataset.editorBlockType || "Block",
              top: rect.top + frameWindow.scrollY,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter((item) => item.id);

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
        // Inject editor-only hooks into the preview iframe to make it builder-safe.
        try {
          const injectId = "layerloot-editor-inject";
          if (!frameDocument.getElementById(injectId)) {
            const script = frameDocument.createElement("script");
            script.id = injectId;
            script.type = "text/javascript";
            script.textContent = `(() => {
              if (window.__layerlootEditorInjected) return; window.__layerlootEditorInjected = true;
              const findBlock = (el) => el && (el.dataset && el.dataset.editorBlockId ? el : el.closest && el.closest('[data-editor-block-id]'));

              const detectField = (el) => {
                if (!el) return null;
                const tag = (el.tagName || '').toLowerCase();
                if (tag.startsWith('h1') || tag === 'h1' || tag === 'h2' || tag === 'h3') return 'heading';
                if (tag === 'p' || tag === 'div' || tag === 'span') return 'body';
                if (tag === 'button' || el.getAttribute && el.getAttribute('role') === 'button') return 'button';
                return null;
              };

              // Prevent navigation and store actions while in editor preview
              document.addEventListener('click', function(e){
                try {
                  const targetBlock = findBlock(e.target);
                  const anchor = e.target.closest && e.target.closest('a');
                  if (anchor) { e.preventDefault(); e.stopPropagation(); }
                  if (targetBlock) {
                    e.preventDefault(); e.stopPropagation();
                    const id = targetBlock.dataset.editorBlockId;
                    window.parent.postMessage({ source: 'layerloot-editor-preview', type: 'select-block', blockId: id }, window.location.origin);
                  }
                } catch (err) {}
              }, true);

              document.addEventListener('dblclick', function(e){
                try {
                  const targetBlock = findBlock(e.target);
                  if (targetBlock) {
                    e.preventDefault(); e.stopPropagation();
                    const id = targetBlock.dataset.editorBlockId;
                    const field = detectField(e.target) || 'heading';
                    const rect = e.target.getBoundingClientRect();
                    const payload = { top: rect.top + (window.scrollY || 0), left: rect.left, width: rect.width, height: rect.height };
                    const text = (e.target.innerText || '').trim();
                    window.parent.postMessage({ source: 'layerloot-editor-preview', type: 'inline-edit-start', blockId: id, field, text, rect: payload }, window.location.origin);
                  }
                } catch (err) {}
              }, true);

              document.addEventListener('submit', function(e){ try { e.preventDefault(); e.stopPropagation(); } catch (err) {} }, true);

              // Disable any inline anchors/forms default behavior proactively
              Array.from(document.querySelectorAll('a')).forEach(a => { a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true); });
            })();`;

            try {
              (frameDocument.head || frameDocument.body || frameDocument.documentElement).appendChild(script);
            } catch (e) {}
          }
        } catch {}
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

  // Post block updates to iframe to enable live editing without reload
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) return;
      frameWindow.postMessage({ source: "layerloot-editor-sync", type: "blocks-update", blocks }, window.location.origin);
    } catch {}
  }, [blocks]);

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
      if (data.type === "inline-edit-start" && typeof data.blockId === "string") {
        try {
          const rect = data.rect && typeof data.rect.top === 'number' ? data.rect : null;
          setInlineEdit({ blockId: data.blockId, field: data.field || 'heading', text: data.text || '', rect, original: data.text || '' });
          onSelectBlock(data.blockId);
        } catch {}
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-card/95 px-4 py-2 backdrop-blur-xl">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Live preview</p>
          <p className="text-sm font-medium text-foreground">{labelForPage(page)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-border/30 bg-background-secondary/50 px-3 py-1.5 text-xs text-muted-foreground md:flex">
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

      <div className="relative flex-1 min-h-0 overflow-hidden bg-muted/20">
        <iframe
          ref={iframeRef}
          key={iframeSrc}
          src={iframeSrc}
          title={`Preview ${page}`}
          className="block h-full w-full border-0 bg-background"
          sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {blocks.length === 0 && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center">
            <div className="w-[520px] max-w-[90%] rounded-lg border border-border/30 bg-card/95 p-6 text-center shadow-[0_8px_40px_-12px_rgba(2,6,23,0.6)] backdrop-blur-xl">
              <p className="mb-3 text-sm font-semibold text-foreground">Your canvas is empty</p>
              <p className="mb-4 text-sm text-muted-foreground">Add a section to get started building your page. Sections are the main building blocks of the storefront and can be reordered, edited, or hidden.</p>
              <div className="flex justify-center">
                <Button
                  variant="default"
                  onClick={() => {
                    // Attempt to add before first block, or call with empty string if none exist.
                    onAddBefore(blocks[0]?.id ?? "");
                  }}
                >
                  Add first section
                </Button>
              </div>
            </div>
          </div>
        )}

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
          onAddAtIndex={onAddAtIndex}
          onStartDrag={(id) => setDraggingBlockId(id)}
          onDragOverBlock={(id) => setDragOverBlockId(id)}
          onDropBlock={handleDropBlock}
          onEndDrag={() => {
            setDraggingBlockId(null);
            setDragOverBlockId(null);
          }}
        />

        {inlineEdit && inlineEdit.rect && (
          <div className="absolute z-40" style={{ top: inlineEdit.rect.top, left: inlineEdit.rect.left, width: inlineEdit.rect.width }}>
            <InlineEditor
              initialValue={inlineEdit.text}
              field={inlineEdit.field}
              onCancel={() => setInlineEdit(null)}
              onSave={async (value) => {
                const bid = inlineEdit.blockId;
                const block = blocks.find((b) => b.id === bid);
                if (!block) return setInlineEdit(null);
                const current = typeof block.content === 'object' && block.content ? { ...(block.content as Record<string, unknown>) } : {};

                let next = { ...current };
                if (inlineEdit.field === 'heading' || inlineEdit.field === 'body' || inlineEdit.field === 'subheading') {
                  next[inlineEdit.field] = value;
                } else if (inlineEdit.field === 'button') {
                  if (Array.isArray(next.buttons) && next.buttons.length > 0) {
                    const buttons = [...(next.buttons as any[])];
                    buttons[0] = { ...buttons[0], text: value };
                    next.buttons = buttons;
                  } else {
                    next.buttons = [{ text: value }];
                  }
                }

                try {
                  editor.updateBlockContent(bid, next);
                  await editor.save();
                } catch {}
                setInlineEdit(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
