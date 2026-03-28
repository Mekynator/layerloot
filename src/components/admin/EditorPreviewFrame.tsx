import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
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

export default function EditorPreviewFrame({
  page,
  pagePath,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onEditBlock,
  onToggleActive,
  onAddBefore,
}: Props) {
  const iframeSrc = useMemo(() => {
    const url = new URL(window.location.origin + pagePath);
    url.searchParams.set("editorPreview", "1");
    url.searchParams.set("editorPage", page);
    return url.toString();
  }, [page, pagePath]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Live preview</p>
          <p className="text-sm font-medium text-foreground">{labelForPage(page)}</p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <a href={pagePath} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open real page
          </a>
        </Button>
      </div>

      <div className="relative flex-1 bg-muted/20">
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={`Preview ${page}`}
          className="h-full w-full border-0 bg-background"
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-3 top-3 rounded-md border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[11px] text-muted-foreground">
              Preview is using the real route:
              <span className="ml-1 font-mono text-foreground">{pagePath}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
