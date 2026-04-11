import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Box,
  Grid2x2,
  Heart,
  LayoutTemplate,
  List,
  Loader2,
  Search,
  Sparkles,
  Star,
  Link2,
  Plus,
} from "lucide-react";
import {
  STARTER_SECTION_TEMPLATES,
  REUSABLE_SECTION_CATEGORIES,
  buildReusableInstanceContent,
  getReusableCategory,
  getReusableKind,
  type ReusableBlockRow,
  type ReusableSyncMode,
} from "@/lib/reusable-blocks";

const FAVORITES_KEY = "editor-section-library-favorites";
const RECENT_KEY = "editor-section-library-recent";

const readList = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
};

interface SectionsLibraryPanelProps {
  onInsertReusable: (block: { block_type: string; content: any; title: string }, mode: ReusableSyncMode) => void;
  onInsertTemplate: (template: { block_type: string; content: any; title: string }) => void;
}

export default function SectionsLibraryPanel({ onInsertReusable, onInsertTemplate }: SectionsLibraryPanelProps) {
  const { track } = useAnalyticsSafe();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readList(FAVORITES_KEY));
    setRecent(readList(RECENT_KEY));
  }, []);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["editor-sections-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reusable_blocks")
        .select("*")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReusableBlockRow[];
    },
  });

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites].slice(0, 24);
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const markRecent = (id: string) => {
    const next = [id, ...recent.filter((item) => item !== id)].slice(0, 12);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const filteredBlocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return blocks.filter((block) => {
      const matchesSearch = !q || [block.name, block.description || "", block.block_type, ...(block.tags || [])]
        .some((entry) => String(entry).toLowerCase().includes(q));
      const blockCategory = getReusableCategory(block);
      const matchesCategory = category === "all" || blockCategory === category;
      return matchesSearch && matchesCategory;
    });
  }, [blocks, search, category]);

  const favoriteBlocks = useMemo(() => filteredBlocks.filter((block) => favorites.includes(block.id)), [filteredBlocks, favorites]);
  const recentBlocks = useMemo(() => recent.map((id) => blocks.find((block) => block.id === id)).filter(Boolean) as ReusableBlockRow[], [recent, blocks]);

  const renderCard = (block: ReusableBlockRow) => {
    const kind = getReusableKind(block);
    const cardCategory = getReusableCategory(block);

    return (
      <div
        key={block.id}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("application/x-layerloot-reusable-block", JSON.stringify({
            id: block.id,
            title: block.name,
            block_type: block.block_type,
            syncMode: kind === "component" ? "global" : "copy",
          }));
          event.dataTransfer.effectAllowed = "copy";
        }}
        className={cn(
          "rounded-xl border border-border/30 bg-card/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40",
          view === "list" && "flex items-center gap-3",
        )}
      >
        <div className={cn("rounded-xl border border-border/30 bg-background/70 p-3", view === "list" ? "w-28 shrink-0" : "mb-3") }>
          {block.thumbnail_url ? (
            <img src={block.thumbnail_url} alt={block.name} className="h-20 w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),transparent)] text-center">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-primary">{cardCategory}</p>
                <p className="mt-1 text-xs font-semibold text-foreground">{block.block_type.replace(/_/g, " ")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{block.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge variant={kind === "component" ? "default" : "secondary"} className="text-[9px]">
                  {kind === "component" ? "Global" : "Reusable"}
                </Badge>
                <Badge variant="outline" className="text-[9px]">{cardCategory}</Badge>
              </div>
            </div>
            <button type="button" onClick={() => toggleFavorite(block.id)} className="rounded-md p-1 text-muted-foreground hover:text-primary">
              <Heart className={cn("h-4 w-4", favorites.includes(block.id) && "fill-current text-primary")} />
            </button>
          </div>

          {block.description && <p className="line-clamp-2 text-[11px] text-muted-foreground">{block.description}</p>}

          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => { markRecent(block.id); track("reusable_section_insert", { id: block.id, name: block.name, kind, mode: "copy", block_type: block.block_type }); onInsertReusable({ block_type: block.block_type, content: buildReusableInstanceContent(block, "copy", kind), title: block.name }, "copy"); }}>
              <Plus className="h-3 w-3" /> Insert copy
            </Button>
            <Button size="sm" className="h-7 gap-1 text-[10px]" onClick={() => { const syncMode: ReusableSyncMode = kind === "component" ? "global" : "override"; markRecent(block.id); track("reusable_section_insert", { id: block.id, name: block.name, kind, mode: syncMode, block_type: block.block_type }); onInsertReusable({ block_type: block.block_type, content: buildReusableInstanceContent(block, syncMode, kind), title: block.name }, syncMode); }}>
              <Link2 className="h-3 w-3" /> {kind === "component" ? "Insert synced" : "Use as component"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/30 px-3 py-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sections, components, templates…" className="h-8 pl-8 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {REUSABLE_SECTION_CATEGORIES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-border/30 bg-background/50 p-0.5">
            <button type="button" onClick={() => setView("grid")} className={cn("rounded-md p-1.5", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground")}> <Grid2x2 className="h-3.5 w-3.5" /> </button>
            <button type="button" onClick={() => setView("list")} className={cn("rounded-md p-1.5", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground")}> <List className="h-3.5 w-3.5" /> </button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="library" className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 py-2 border-b border-border/30">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="library" className="text-[10px] gap-1"><Box className="h-3 w-3" />Library</TabsTrigger>
            <TabsTrigger value="templates" className="text-[10px] gap-1"><LayoutTemplate className="h-3 w-3" />Templates</TabsTrigger>
            <TabsTrigger value="favorites" className="text-[10px] gap-1"><Star className="h-3 w-3" />Saved</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="library" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className={cn("p-3", view === "grid" ? "grid gap-3" : "space-y-2") }>
              {recentBlocks.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Recently used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentBlocks.slice(0, 4).map((block) => (
                      <button key={block.id} type="button" onClick={() => { track("reusable_section_insert", { id: block.id, name: block.name, kind: getReusableKind(block), mode: getReusableKind(block) === "component" ? "global" : "copy", block_type: block.block_type, source: "recent" }); onInsertReusable({ block_type: block.block_type, content: buildReusableInstanceContent(block, getReusableKind(block) === "component" ? "global" : "copy", getReusableKind(block)), title: block.name }, getReusableKind(block) === "component" ? "global" : "copy"); }} className="rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[10px] text-foreground hover:border-primary/40">
                        {block.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filteredBlocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
                  No reusable sections match your filters yet.
                </div>
              ) : filteredBlocks.map(renderCard)}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className={cn("p-3", view === "grid" ? "grid gap-3" : "space-y-2")}>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Starter kits</p>
                <p className="text-[11px] text-muted-foreground">Drop in a professional starting point, then customize it freely inside the editor.</p>
              </div>
              {STARTER_SECTION_TEMPLATES.filter((template) => category === "all" || template.category === category).map((template) => (
                <div key={template.id} className={cn("rounded-xl border border-border/30 bg-card/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40", view === "list" && "flex items-center gap-3")}>
                  <div className={cn("rounded-xl border border-border/30 bg-background/70 p-3", view === "list" ? "w-28 shrink-0" : "mb-3")}>
                    <div className="flex h-20 items-center justify-center rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),transparent)]">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{template.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px]">Template</Badge>
                        <Badge variant="outline" className="text-[9px]">{template.category}</Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{template.description}</p>
                    <Button size="sm" className="h-7 gap-1 text-[10px]" onClick={() => { track("reusable_section_insert", { template_id: template.id, name: template.name, category: template.category, block_type: template.block_type, source: "template" }); onInsertTemplate({ block_type: template.block_type, content: template.content, title: template.name }); }}>
                      <Sparkles className="h-3 w-3" /> Insert template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className={cn("p-3", view === "grid" ? "grid gap-3" : "space-y-2") }>
              {favoriteBlocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
                  Favorite the sections you use most often to pin them here.
                </div>
              ) : favoriteBlocks.map(renderCard)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
