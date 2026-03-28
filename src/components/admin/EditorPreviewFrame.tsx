import { useMemo } from "react";
import { ExternalLink, MonitorSmartphone, Eye, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

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

export default function EditorPreviewFrame({ page, pagePath, blocks, selectedBlockId }: Props) {
  const iframeSrc = useMemo(() => {
    const url = new URL(window.location.origin + pagePath);
    url.searchParams.set("editorPreview", "1");
    url.searchParams.set("editorPage", page);
    return url.toString();
  }, [page, pagePath]);

  const totalBlocks = blocks.length;
  const visibleBlocks = blocks.filter((block) => block.is_active !== false).length;
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || null;

  return (
    <div className="flex h-full flex-col">
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

      <div className="relative flex-1 bg-muted/20">
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={`Preview ${page}`}
          className="h-full w-full border-0 bg-background"
          sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-3 top-3 max-w-md rounded-md border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex items-start gap-2">
              <Eye className="mt-0.5 h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {selectedBlock
                    ? `Selected: ${selectedBlock.title || selectedBlock.block_type}`
                    : "Preview mode active"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Click-to-edit overlay comes in the next step. For now, select blocks from the left structure panel and
                  use the block editor.
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
