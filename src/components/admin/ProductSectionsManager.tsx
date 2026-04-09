import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Box, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Copy as CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InsertReusableDialog from "@/components/admin/reusable/InsertReusableDialog";

interface Section {
  id: string;
  section_type: string;
  title: string | null;
  media_urls: string[];
  sort_order: number;
  is_active: boolean;
  reusable_block_id: string | null;
}

interface ReusableBlockInfo {
  id: string;
  name: string;
  block_type: string;
}

interface ProductSectionsManagerProps {
  productId: string;
  /** Called when admin clicks "Copy sections from product" — parent should open copy modal */
  onCopyFromProduct?: () => void;
}

const ProductSectionsManager = ({ productId, onCopyFromProduct }: ProductSectionsManagerProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [reusableNames, setReusableNames] = useState<Record<string, ReusableBlockInfo>>({});
  const [newType, setNewType] = useState("video");
  const [showReusablePicker, setShowReusablePicker] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const isNewProduct = !productId || productId.startsWith("draft-");

  const fetchSections = async () => {
    const { data } = await supabase
      .from("product_detail_sections")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    const secs = (data as Section[]) ?? [];
    setSections(secs);

    const blockIds = secs.filter(s => s.reusable_block_id).map(s => s.reusable_block_id!);
    if (blockIds.length > 0) {
      const { data: blocks } = await supabase
        .from("reusable_blocks")
        .select("id, name, block_type")
        .in("id", blockIds);
      if (blocks) {
        const map: Record<string, ReusableBlockInfo> = {};
        for (const b of blocks) map[b.id] = b as ReusableBlockInfo;
        setReusableNames(map);
      }
    }
  };

  useEffect(() => {
    if (!isNewProduct) void fetchSections();
  }, [productId]);

  const addSection = async () => {
    if (newType === "reusable_block") {
      setShowReusablePicker(true);
      return;
    }
    const { error } = await supabase.from("product_detail_sections").insert({
      product_id: productId,
      section_type: newType,
      title: newType === "video" ? "Video" : "Gallery",
      media_urls: [],
      sort_order: sections.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await fetchSections();
  };

  const handleInsertReusable = async (block: { block_type: string; content: any; title: string; reusableId?: string }) => {
    if (!block.reusableId) {
      toast({ title: "Please use linked mode", description: "Only linked reusable blocks are supported here.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("product_detail_sections").insert({
      product_id: productId,
      section_type: "reusable_block",
      title: block.title,
      media_urls: [],
      sort_order: sections.length,
      reusable_block_id: block.reusableId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await fetchSections();
  };

  const deleteSection = async (id: string) => {
    await supabase.from("product_detail_sections").delete().eq("id", id);
    await fetchSections();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("product_detail_sections").update({ is_active: active }).eq("id", id);
    await fetchSections();
  };

  const updateTitle = async (id: string, title: string) => {
    await supabase.from("product_detail_sections").update({ title }).eq("id", id);
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const moveSection = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;

    const a = sections[index];
    const b = sections[swapIndex];

    // Swap sort_order values
    await Promise.all([
      supabase.from("product_detail_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("product_detail_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);

    await fetchSections();
  };

  const addMediaUrl = async (id: string, url: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    const urls = [...section.media_urls, url];
    await supabase.from("product_detail_sections").update({ media_urls: urls }).eq("id", id);
    await fetchSections();
  };

  const removeMediaUrl = async (id: string, index: number) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    const urls = section.media_urls.filter((_, i) => i !== index);
    await supabase.from("product_detail_sections").update({ media_urls: urls }).eq("id", id);
    await fetchSections();
  };

  const handleFileUpload = async (sectionId: string, files: FileList) => {
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `sections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      await addMediaUrl(sectionId, data.publicUrl);
    }
  };

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isNewProduct) {
    return (
      <Card className="border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display uppercase">Content Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Save the product first, then return here to add video, carousel, and reusable block sections.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Tip: use a template to pre-fill section structure — sections will be applied after the product is created.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sectionTypeLabel = (type: string) => {
    if (type === "video") return "Video";
    if (type === "image_carousel") return "Carousel";
    if (type === "reusable_block") return "Reusable Block";
    return type;
  };

  return (
    <>
      <Card className="border-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display uppercase">
              Content Sections
              {sections.length > 0 && (
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  {sections.filter((s) => s.is_active).length}/{sections.length} active
                </span>
              )}
            </CardTitle>
            {onCopyFromProduct && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopyFromProduct}
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CopyIcon className="h-3.5 w-3.5" />
                Copy from product
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map((section, idx) => {
            const isCollapsed = collapsed.has(section.id);
            return (
              <div key={section.id} className={`rounded-lg border bg-muted/10 p-3 space-y-0 transition-colors ${section.is_active ? "border-border/50" : "border-border/20 opacity-60"}`}>
                {/* Header row */}
                <div className="flex items-center gap-2">
                  {/* Reorder controls */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, "up")}
                      title="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === sections.length - 1}
                      onClick={() => moveSection(idx, "down")}
                      title="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Collapse toggle */}
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    onClick={() => toggleCollapsed(section.id)}
                    title={isCollapsed ? "Expand" : "Collapse"}
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  <Badge variant="secondary" className="text-[10px] font-bold uppercase shrink-0">
                    {section.section_type === "reusable_block" ? (
                      <span className="flex items-center gap-1"><Box className="h-3 w-3" /> Block</span>
                    ) : sectionTypeLabel(section.section_type)}
                  </Badge>

                  <Input
                    value={section.title ?? ""}
                    onChange={(e) => updateTitle(section.id, e.target.value)}
                    className="h-7 flex-1 text-sm min-w-0"
                    placeholder="Section title"
                  />

                  {/* Active dot */}
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${section.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    title={section.is_active ? "Visible on storefront" : "Hidden"}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => toggleActive(section.id, !section.is_active)}
                    title={section.is_active ? "Hide section" : "Show section"}
                  >
                    {section.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteSection(section.id)} title="Delete section">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                {/* Collapsible content */}
                {!isCollapsed && (
                  <div className="mt-3 space-y-3">
                    {/* Reusable block info */}
                    {section.section_type === "reusable_block" && section.reusable_block_id && (
                      <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
                        <Box className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">
                          {reusableNames[section.reusable_block_id]?.name || "Linked block"}
                        </span>
                        <Badge variant="outline" className="text-[9px] ml-auto">
                          {reusableNames[section.reusable_block_id]?.block_type || "block"}
                        </Badge>
                      </div>
                    )}

                    {/* Media list (video/carousel only) */}
                    {section.section_type !== "reusable_block" && section.media_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {section.media_urls.map((url, i) => (
                          <div key={i} className="group relative">
                            {section.section_type === "video" ? (
                              <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                                🎥 Video
                              </div>
                            ) : (
                              <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                            )}
                            <button
                              onClick={() => removeMediaUrl(section.id, i)}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add media (video/carousel only) */}
                    {section.section_type !== "reusable_block" && (
                      <div className="flex items-center gap-2">
                        {section.section_type === "video" ? (
                          <>
                            <Input
                              placeholder="Paste video URL (YouTube, Vimeo, or direct)"
                              className="h-8 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val) {
                                    addMediaUrl(section.id, val);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                            />
                            <Input
                              type="file"
                              accept="video/*"
                              className="h-8 w-32 text-xs"
                              onChange={(e) => e.target.files && handleFileUpload(section.id, e.target.files)}
                            />
                          </>
                        ) : (
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            className="h-8 text-xs"
                            onChange={(e) => e.target.files && handleFileUpload(section.id, e.target.files)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Section</SelectItem>
                <SelectItem value="image_carousel">Image Carousel</SelectItem>
                <SelectItem value="reusable_block">Reusable Block</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addSection} className="h-8">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
            </Button>
          </div>
        </CardContent>
      </Card>

      <InsertReusableDialog
        open={showReusablePicker}
        onOpenChange={setShowReusablePicker}
        onInsert={handleInsertReusable}
      />
    </>
  );
};

export default ProductSectionsManager;
