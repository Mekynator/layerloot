import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import {
  Archive,
  Box,
  Copy,
  Eye,
  Layers3,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchReusableUsage,
  getReusableCategory,
  getReusableKind,
  getReusableVersion,
  restoreReusableRevision,
  REUSABLE_SECTION_CATEGORIES,
  type ReusableBlockRow,
} from "@/lib/reusable-blocks";

export default function ReusableBlocksLibrary() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | "section" | "component">("all");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCategory, setDraftCategory] = useState("General");
  const [draftTags, setDraftTags] = useState("");
  const [draftKind, setDraftKind] = useState<"section" | "component">("section");
  const [savingMeta, setSavingMeta] = useState(false);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["reusable-blocks", showArchived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reusable_blocks")
        .select("*")
        .eq("is_archived", showArchived)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReusableBlockRow[];
    },
  });

  const { data: usageMap = new Map<string, number>() } = useQuery({
    queryKey: ["reusable-block-usage", showArchived],
    queryFn: async () => {
      const [{ data: siteBlocks }, { data: productSections }] = await Promise.all([
        supabase.from("site_blocks").select("content, draft_content, has_draft"),
        supabase.from("product_detail_sections").select("reusable_block_id"),
      ]);

      const map = new Map<string, number>();

      ((siteBlocks ?? []) as any[]).forEach((row) => {
        const content = row.has_draft && row.draft_content ? row.draft_content : row.content;
        const reusableId = typeof content === "object" && content ? String(content._reusableId || "") : "";
        if (!reusableId) return;
        map.set(reusableId, (map.get(reusableId) || 0) + 1);
      });

      ((productSections ?? []) as any[]).forEach((row) => {
        if (!row.reusable_block_id) return;
        map.set(row.reusable_block_id, (map.get(row.reusable_block_id) || 0) + 1);
      });

      return map;
    },
  });

  const selected = useMemo(() => blocks.find((block) => block.id === selectedId) ?? null, [blocks, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setDraftName(selected.name);
    setDraftDescription(selected.description || "");
    setDraftCategory(getReusableCategory(selected));
    setDraftTags((selected.tags || []).filter(Boolean).join(", "));
    setDraftKind(getReusableKind(selected) === "component" ? "component" : "section");
  }, [selected]);

  const filteredBlocks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return blocks.filter((block) => {
      const kind = getReusableKind(block);
      const matchesKind = kindFilter === "all" || kind === kindFilter;
      const matchesCategory = category === "all" || getReusableCategory(block) === category;
      const matchesSearch = !query || [block.name, block.description || "", block.block_type, ...(block.tags || [])]
        .some((entry) => String(entry).toLowerCase().includes(query));
      return matchesKind && matchesCategory && matchesSearch;
    });
  }, [blocks, search, kindFilter, category]);

  const usageQuery = useQuery({
    queryKey: ["reusable-usage-detail", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => fetchReusableUsage(selectedId!),
  });

  const revisionsQuery = useQuery({
    queryKey: ["reusable-revisions", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_revisions")
        .select("id, revision_number, action, created_at")
        .eq("content_type", "reusable_block")
        .eq("content_id", selectedId)
        .order("revision_number", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reusable_blocks").update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reusable-blocks"] });
      toast.success("Item archived safely");
    },
  });

  const restoreMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reusable_blocks").update({ is_archived: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reusable-blocks"] });
      toast.success("Item restored");
    },
  });

  const duplicateMut = useMutation({
    mutationFn: async (block: ReusableBlockRow) => {
      const kind = getReusableKind(block);
      const category = getReusableCategory(block);
      const version = getReusableVersion(block);
      const nextContent = {
        ...(block.content as Record<string, any>),
        _library: {
          ...(typeof (block.content as any)?._library === "object" ? (block.content as any)._library : {}),
          kind,
          category,
          version: Math.max(1, Number(version)),
        },
      };

      const { error } = await supabase.from("reusable_blocks").insert({
        name: `${block.name} Copy`,
        description: block.description,
        block_type: block.block_type,
        content: nextContent as any,
        tags: block.tags,
        thumbnail_url: block.thumbnail_url,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reusable-blocks"] });
      toast.success("Component duplicated");
    },
  });

  const saveMeta = async () => {
    if (!selected) return;
    setSavingMeta(true);
    try {
      const nextTags = Array.from(new Set([draftCategory, draftKind, ...draftTags.split(",").map((tag) => tag.trim()).filter(Boolean)]));
      const nextContent = {
        ...(selected.content as Record<string, any>),
        _library: {
          ...(typeof (selected.content as any)?._library === "object" ? (selected.content as any)._library : {}),
          kind: draftKind,
          category: draftCategory,
          description: draftDescription.trim(),
          version: getReusableVersion(selected),
        },
      };

      const { error } = await supabase
        .from("reusable_blocks")
        .update({
          name: draftName.trim() || selected.name,
          description: draftDescription.trim() || null,
          tags: nextTags,
          content: nextContent as any,
        } as any)
        .eq("id", selected.id);

      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["reusable-blocks"] });
      toast.success("Component details updated");
    } catch (error: any) {
      toast.error(error?.message || "Could not save component details");
    } finally {
      setSavingMeta(false);
    }
  };

  const restoreRevision = async (revisionNumber: number) => {
    if (!selected) return;
    if (!window.confirm(`Restore version ${revisionNumber} for “${selected.name}”? This will update the live reusable source.`)) return;
    try {
      await restoreReusableRevision(selected.id, revisionNumber);
      qc.invalidateQueries({ queryKey: ["reusable-blocks"] });
      qc.invalidateQueries({ queryKey: ["reusable-revisions", selected.id] });
      toast.success(`Restored version ${revisionNumber}`);
    } catch (error: any) {
      toast.error(error?.message || "Could not restore this version");
    }
  };

  const selectedPreviewBlock: SiteBlock | null = selected ? {
    id: selected.id,
    page: "preview",
    block_type: selected.block_type,
    title: selected.name,
    content: selected.content,
    sort_order: 0,
    is_active: true,
  } : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-card/50 p-4 backdrop-blur-xl lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Components & Reusable Sections</h1>
          <p className="text-sm text-muted-foreground">Manage saved sections, synced global components, usage, and version history without breaking existing pages.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Reusable presets</Badge>
            <Badge variant="outline">Global synced components</Badge>
            <Badge variant="outline">Version restore</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="h-8 gap-1.5 text-xs">
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? "Show active" : "Show archived"}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-border/30 bg-card/40 p-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sections, components, or tags…" className="h-8 pl-8 text-xs" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-full text-xs lg:w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {REUSABLE_SECTION_CATEGORIES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={kindFilter} onValueChange={(value) => setKindFilter(value as typeof kindFilter)}>
            <TabsList className="grid h-8 w-full grid-cols-3">
              <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
              <TabsTrigger value="section" className="text-[10px] gap-1"><Sparkles className="h-3 w-3" /> Presets</TabsTrigger>
              <TabsTrigger value="component" className="text-[10px] gap-1"><Workflow className="h-3 w-3" /> Components</TabsTrigger>
            </TabsList>
            <TabsContent value={kindFilter} className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBlocks.length === 0 ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-border/40 py-16 text-center">
                  <Box className="mb-3 h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">{showArchived ? "No archived items found" : "No reusable sections yet"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Save a section from the Page Editor to start building your shared library.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredBlocks.map((block) => {
                    const kind = getReusableKind(block);
                    const blockCategory = getReusableCategory(block);
                    const instanceCount = usageMap.get(block.id) || 0;
                    const active = selectedId === block.id;

                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => setSelectedId(block.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${active ? "border-primary/40 bg-primary/5" : "border-border/30 bg-card/50 hover:border-primary/30"}`}
                      >
                        <div className="mb-3 rounded-xl border border-border/30 bg-background/70 p-3">
                          {block.thumbnail_url ? (
                            <img src={block.thumbnail_url} alt={block.name} className="h-24 w-full rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-24 items-center justify-center rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),transparent)]">
                              <div className="text-center">
                                <p className="text-[9px] uppercase tracking-[0.18em] text-primary">{blockCategory}</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{block.block_type.replace(/_/g, " ")}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{block.name}</p>
                            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{block.description || "No description yet"}</p>
                          </div>
                          <Badge variant={kind === "component" ? "default" : "secondary"} className="text-[9px]">
                            {kind === "component" ? "Global" : "Reusable"}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px]">{blockCategory}</Badge>
                          <Badge variant="outline" className="text-[9px]">v{getReusableVersion(block)}</Badge>
                          <Badge variant="outline" className="text-[9px]">{instanceCount} instances</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={(event) => { event.stopPropagation(); duplicateMut.mutate(block); }}>
                            <Copy className="h-3 w-3" /> Duplicate
                          </Button>
                          {block.is_archived ? (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={(event) => { event.stopPropagation(); restoreMut.mutate(block.id); }}>
                              <RotateCcw className="h-3 w-3" /> Restore
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={(event) => { event.stopPropagation(); archiveMut.mutate(block.id); }}>
                              <Archive className="h-3 w-3" /> Archive
                            </Button>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {!selected ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-card/30 p-6 text-center">
              <Layers3 className="mb-3 h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Select a reusable section or component to manage it.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border/30 bg-card/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Live preview</p>
                    <p className="text-[11px] text-muted-foreground">Visual thumbnail for this reusable source</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">{selected.block_type}</Badge>
                </div>
                <div className="overflow-hidden rounded-xl border border-border/30 bg-background/60 p-2">
                  {selectedPreviewBlock ? (
                    <div className="origin-top-left scale-[0.6] sm:scale-[0.72]">{renderBlock(selectedPreviewBlock)}</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Component details</p>
                    <p className="text-[11px] text-muted-foreground">Clarify whether this item is a starter preset or a live synced component.</p>
                  </div>
                  <Button size="sm" className="h-8 gap-1 text-xs" onClick={saveMeta} disabled={savingMeta}>
                    <Settings2 className="h-3.5 w-3.5" /> {savingMeta ? "Saving…" : "Save changes"}
                  </Button>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Name</Label>
                  <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Description</Label>
                  <Textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} className="mt-1 min-h-24" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Category</Label>
                    <Select value={draftCategory} onValueChange={setDraftCategory}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REUSABLE_SECTION_CATEGORIES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Mode</Label>
                    <Select value={draftKind} onValueChange={(value) => setDraftKind(value as "section" | "component") }>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="section">Reusable preset</SelectItem>
                        <SelectItem value="component">Global synced component</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Tags</Label>
                  <Input value={draftTags} onChange={(event) => setDraftTags(event.target.value)} placeholder="hero, campaign, premium" className="mt-1" />
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Usage & sync status</p>
                  <p className="text-[11px] text-muted-foreground">See where this component is active before making global edits.</p>
                </div>
                {usageQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading usage…</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{usageQuery.data?.instanceCount || 0} total instances</Badge>
                      <Badge variant="outline">{usageQuery.data?.pageUsages.length || 0} pages</Badge>
                      <Badge variant="outline">{usageQuery.data?.productUsages.length || 0} product sections</Badge>
                    </div>
                    <ScrollArea className="max-h-40 rounded-lg border border-border/30 bg-background/50 p-2">
                      <div className="space-y-2">
                        {(usageQuery.data?.pageUsages || []).map((usage) => (
                          <div key={usage.id} className="rounded-lg border border-border/20 px-2 py-1.5 text-xs">
                            <span className="font-medium text-foreground">Page:</span> {usage.page}
                            {usage.title ? <span className="text-muted-foreground"> · {usage.title}</span> : null}
                          </div>
                        ))}
                        {(usageQuery.data?.productUsages || []).map((usage) => (
                          <div key={usage.id} className="rounded-lg border border-border/20 px-2 py-1.5 text-xs">
                            <span className="font-medium text-foreground">Product section:</span> {usage.title || usage.product_id || "Linked product"}
                          </div>
                        ))}
                        {(!usageQuery.data || usageQuery.data.instanceCount === 0) && (
                          <p className="text-xs text-muted-foreground">No active usages yet.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Version history</p>
                    <p className="text-[11px] text-muted-foreground">Restore an earlier version if a global edit needs to be rolled back.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => revisionsQuery.refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
                {revisionsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading versions…</div>
                ) : revisionsQuery.data?.length ? (
                  <div className="space-y-2">
                    {revisionsQuery.data.map((revision: any) => (
                      <div key={revision.id} className="flex items-center justify-between rounded-lg border border-border/20 px-2.5 py-2 text-xs">
                        <div>
                          <p className="font-medium text-foreground">Version {revision.revision_number}</p>
                          <p className="text-muted-foreground">{revision.action} · {new Date(revision.created_at).toLocaleString()}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => restoreRevision(revision.revision_number)}>
                          <RotateCcw className="h-3 w-3" /> Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No saved versions yet. New global edits will appear here.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
