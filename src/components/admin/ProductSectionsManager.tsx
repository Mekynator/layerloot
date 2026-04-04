import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Section {
  id: string;
  section_type: string;
  title: string | null;
  media_urls: string[];
  sort_order: number;
  is_active: boolean;
}

interface ProductSectionsManagerProps {
  productId: string;
}

const ProductSectionsManager = ({ productId }: ProductSectionsManagerProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [newType, setNewType] = useState("video");
  const { toast } = useToast();

  const isNewProduct = !productId || productId.startsWith("draft-");

  const fetchSections = async () => {
    const { data } = await supabase
      .from("product_detail_sections")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setSections((data as Section[]) ?? []);
  };

  useEffect(() => {
    if (!isNewProduct) void fetchSections();
  }, [productId]);

  const addSection = async () => {
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

  if (isNewProduct) {
    return (
      <Card className="border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display uppercase">Content Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Save the product first to add video and carousel sections.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display uppercase">Content Sections (Video / Carousel)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                {section.section_type === "video" ? "Video" : "Carousel"}
              </span>
              <Input
                value={section.title ?? ""}
                onChange={(e) => updateTitle(section.id, e.target.value)}
                className="h-7 flex-1 text-sm"
                placeholder="Section title"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleActive(section.id, !section.is_active)}
                title={section.is_active ? "Hide" : "Show"}
              >
                {section.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSection(section.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>

            {/* Media list */}
            {section.media_urls.length > 0 && (
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

            {/* Add media */}
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
          </div>
        ))}

        <div className="flex items-center gap-2">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video Section</SelectItem>
              <SelectItem value="image_carousel">Image Carousel</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addSection} className="h-8">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSectionsManager;
