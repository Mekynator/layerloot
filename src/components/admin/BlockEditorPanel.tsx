import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SiteBlock } from "./BlockRenderer";

interface BlockEditorPanelProps {
  block: SiteBlock | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  pages: string[];
}

const ICON_OPTIONS = ["ShoppingBag", "Palette", "Upload", "Printer", "Package", "Truck", "Shield", "Star"];

const prettyPageLabel = (page: string) =>
  page
    .replace(/^global_/, "global ")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const routeFromPage = (page: string) => {
  if (page === "home") return "/";
  if (page.startsWith("global_")) return "";
  return `/${page}`;
};

const BlockEditorPanel = ({ block, open, onClose, onSave, pages }: BlockEditorPanelProps) => {
  const [form, setForm] = useState<any>({
    title: "",
    page: "home",
    block_type: "",
    is_active: true,
    content: {},
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!block) return;

    setForm({
      title: block.title ?? "",
      page: block.page ?? "home",
      block_type: block.block_type,
      is_active: block.is_active ?? true,
      content: { ...(block.content || {}) },
    });
  }, [block]);

  const availablePages = useMemo(() => {
    const extras = [
      "gallery",
      "create-your-own",
      "submit-design",
      "global_header_top",
      "global_header_bottom",
      "global_before_main",
      "global_after_main",
      "global_footer_top",
      "global_footer_bottom",
    ];

    return Array.from(new Set([...pages, ...extras]));
  }, [pages]);

  const placementOptions = useMemo(() => {
    const page = form.page || block?.page || "home";

    switch (page) {
      case "products":
        return [
          { value: "", label: "Before products" },
          { value: "after_products", label: "After products" },
        ];
      case "contact":
        return [
          { value: "", label: "Before contact section" },
          { value: "after_contact", label: "After contact section" },
        ];
      case "gallery":
        return [
          { value: "", label: "Before gallery" },
          { value: "after_gallery", label: "After gallery" },
        ];
      case "create-your-own":
        return [
          { value: "", label: "Before tools section" },
          { value: "after_create_your_own", label: "After tools section" },
        ];
      case "submit-design":
        return [
          { value: "", label: "Before submit form" },
          { value: "after_submit_design", label: "After submit form" },
        ];
      default:
        return [{ value: "", label: "Default position" }];
    }
  }, [form.page, block?.page]);

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from("site-assets").upload(path, file);

    setUploading(false);

    if (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setForm((prev: any) => ({
        ...prev,
        content: { ...prev.content, [field]: url },
      }));
    }
  };

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls: string[] = [];

    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }

    setForm((prev: any) => ({
      ...prev,
      content: {
        ...prev.content,
        images: [...(prev.content.images || []), ...urls],
      },
    }));
  };

  const updateForm = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateContent = (key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!block) return;

    setSaving(true);

    const payload = {
      title: form.title || null,
      page: form.page,
      is_active: form.is_active,
      content: form.content,
    };

    const { error } = await supabase.from("site_blocks").update(payload).eq("id", block.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Block saved" });
    onSave();
  };

  const addArrayItem = (key: string, item: any) => {
    const current = form.content?.[key] || [];
    updateContent(key, [...current, item]);
  };

  const updateArrayItem = (key: string, index: number, patch: any) => {
    const current = [...(form.content?.[key] || [])];
    current[index] = { ...current[index], ...patch };
    updateContent(key, current);
  };

  const removeArrayItem = (key: string, index: number) => {
    const current = [...(form.content?.[key] || [])];
    current.splice(index, 1);
    updateContent(key, current);
  };

  const t = form.block_type;
  const buttonTargetPages = availablePages.filter((p) => !p.startsWith("global_"));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display uppercase">Edit Block</SheetTitle>
        </SheetHeader>

        {block && (
          <div className="mt-6 space-y-4">
            <div>
              <Label>Internal Title</Label>
              <Input value={form.title ?? ""} onChange={(e) => updateForm("title", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Page</Label>
                <Select value={form.page} onValueChange={(v) => updateForm("page", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePages.map((p) => (
                      <SelectItem key={p} value={p}>
                        {prettyPageLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!form.is_active} onCheckedChange={(v) => updateForm("is_active", v)} />
                  Active
                </label>
              </div>
            </div>

            <div>
              <Label>Placement</Label>
              <Select value={form.content?.placement ?? ""} onValueChange={(v) => updateContent("placement", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select placement" />
                </SelectTrigger>
                <SelectContent>
                  {placementOptions.map((opt) => (
                    <SelectItem key={opt.value || "default-placement"} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <hr className="border-border" />

            {(t === "hero" || t === "banner" || t === "cta") && (
              <div className="space-y-3">
                {t === "hero" && (
                  <div>
                    <Label>Eyebrow</Label>
                    <Input
                      value={form.content.eyebrow ?? ""}
                      onChange={(e) => updateContent("eyebrow", e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Subheading</Label>
                  <Textarea
                    value={form.content.subheading ?? ""}
                    onChange={(e) => updateContent("subheading", e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Primary Button Text</Label>
                  <Input
                    value={form.content.button_text ?? ""}
                    onChange={(e) => updateContent("button_text", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Primary Button Link</Label>
                  <Select
                    value={
                      buttonTargetPages.includes((form.content.button_link || "").replace(/^\//, ""))
                        ? form.content.button_link || ""
                        : "__custom__"
                    }
                    onValueChange={(v) => {
                      if (v !== "__custom__") updateContent("button_link", v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select page" />
                    </SelectTrigger>
                    <SelectContent>
                      {buttonTargetPages.map((p) => (
                        <SelectItem key={p} value={routeFromPage(p)}>
                          {prettyPageLabel(p)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom URL below</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    className="mt-1"
                    placeholder="Or custom URL..."
                    value={form.content.button_link ?? ""}
                    onChange={(e) => updateContent("button_link", e.target.value)}
                  />
                </div>

                {t === "hero" && (
                  <>
                    <div>
                      <Label>Secondary Button Text</Label>
                      <Input
                        value={form.content.secondary_button_text ?? ""}
                        onChange={(e) => updateContent("secondary_button_text", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Secondary Button Link</Label>
                      <Input
                        value={form.content.secondary_button_link ?? ""}
                        onChange={(e) => updateContent("secondary_button_link", e.target.value)}
                        placeholder="/create"
                      />
                    </div>

                    <div>
                      <Label>Background Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg_image")} />
                      {form.content.bg_image && (
                        <img src={form.content.bg_image} alt="" className="mt-2 h-20 rounded object-cover" />
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {t === "shipping_banner" && (
              <div className="space-y-3">
                <div>
                  <Label>Banner Text</Label>
                  <Input value={form.content.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} />
                </div>
              </div>
            )}

            {t === "text" && (
              <div className="space-y-3">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea
                    value={form.content.body ?? ""}
                    onChange={(e) => updateContent("body", e.target.value)}
                    rows={8}
                  />
                </div>
              </div>
            )}

            {t === "image" && (
              <div className="space-y-3">
                <div>
                  <Label>Image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "image_url")} />
                  {form.content.image_url && (
                    <img src={form.content.image_url} alt="" className="mt-2 h-32 rounded object-cover" />
                  )}
                </div>
                <div>
                  <Label>Alt Text</Label>
                  <Input value={form.content.alt ?? ""} onChange={(e) => updateContent("alt", e.target.value)} />
                </div>
              </div>
            )}

            {t === "carousel" && (
              <div className="space-y-3">
                <Label>Carousel Images</Label>
                <Input type="file" accept="image/*" multiple onChange={handleCarouselUpload} />
                <div className="flex flex-wrap gap-2">
                  {(form.content.images || []).map((img: string, i: number) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="h-16 w-16 rounded object-cover" />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                        onClick={() =>
                          updateContent(
                            "images",
                            (form.content.images || []).filter((_: string, j: number) => j !== i),
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {t === "video" && (
              <div className="space-y-3">
                <div>
                  <Label>Video URL (YouTube / Vimeo / MP4)</Label>
                  <Input
                    value={form.content.video_url ?? ""}
                    onChange={(e) => updateContent("video_url", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Or Upload Video</Label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadFile(file);
                      if (url) updateContent("video_url", url);
                    }}
                  />
                </div>

                <div>
                  <Label>Caption</Label>
                  <Input
                    value={form.content.caption ?? ""}
                    onChange={(e) => updateContent("caption", e.target.value)}
                  />
                </div>
              </div>
            )}

            {t === "button" && (
              <div className="space-y-3">
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={form.content.button_text ?? ""}
                    onChange={(e) => updateContent("button_text", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Button Link</Label>
                  <Input
                    value={form.content.button_link ?? ""}
                    onChange={(e) => updateContent("button_link", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Style</Label>
                  <Select value={form.content.style ?? "primary"} onValueChange={(v) => updateContent("style", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {t === "spacer" && (
              <div>
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  value={form.content.height ?? 40}
                  onChange={(e) => updateContent("height", parseInt(e.target.value) || 40)}
                />
              </div>
            )}

            {t === "html" && (
              <div>
                <Label>HTML Code</Label>
                <Textarea
                  value={form.content.html ?? ""}
                  onChange={(e) => updateContent("html", e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {t === "embed" && (
              <div className="space-y-3">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Embed URL</Label>
                  <Input
                    value={form.content.embed_url ?? ""}
                    onChange={(e) => updateContent("embed_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Height (px)</Label>
                  <Input
                    type="number"
                    value={form.content.height ?? 400}
                    onChange={(e) => updateContent("height", parseInt(e.target.value) || 400)}
                  />
                </div>
              </div>
            )}

            {t === "newsletter" && (
              <div className="space-y-3">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subheading</Label>
                  <Input
                    value={form.content.subheading ?? ""}
                    onChange={(e) => updateContent("subheading", e.target.value)}
                  />
                </div>
              </div>
            )}

            {t === "categories" && (
              <div className="space-y-3">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subheading</Label>
                  <Input
                    value={form.content.subheading ?? ""}
                    onChange={(e) => updateContent("subheading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Limit</Label>
                  <Input
                    type="number"
                    value={form.content.limit ?? 6}
                    onChange={(e) => updateContent("limit", parseInt(e.target.value) || 6)}
                  />
                </div>
              </div>
            )}

            {t === "featured_products" && (
              <div className="space-y-3">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subheading</Label>
                  <Input
                    value={form.content.subheading ?? ""}
                    onChange={(e) => updateContent("subheading", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Limit</Label>
                  <Input
                    type="number"
                    value={form.content.limit ?? 8}
                    onChange={(e) => updateContent("limit", parseInt(e.target.value) || 8)}
                  />
                </div>
              </div>
            )}

            {t === "entry_cards" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Cards</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      addArrayItem("cards", {
                        icon: "ShoppingBag",
                        title: "New Card",
                        desc: "",
                        link: "/",
                        cta: "Learn More",
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Card
                  </Button>
                </div>

                {(form.content.cards || []).map((card: any, index: number) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Card {index + 1}</p>
                      <button type="button" onClick={() => removeArrayItem("cards", index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>

                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={card.icon || "ShoppingBag"}
                        onValueChange={(v) => updateArrayItem("cards", index, { icon: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Title</Label>
                      <Input
                        value={card.title ?? ""}
                        onChange={(e) => updateArrayItem("cards", index, { title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={card.desc ?? ""}
                        onChange={(e) => updateArrayItem("cards", index, { desc: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Link</Label>
                      <Input
                        value={card.link ?? ""}
                        onChange={(e) => updateArrayItem("cards", index, { link: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>CTA Text</Label>
                      <Input
                        value={card.cta ?? ""}
                        onChange={(e) => updateArrayItem("cards", index, { cta: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {t === "how_it_works" && (
              <div className="space-y-4">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Subheading</Label>
                  <Input
                    value={form.content.subheading ?? ""}
                    onChange={(e) => updateContent("subheading", e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayItem("steps", { icon: "Package", title: "New Step", desc: "" })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
                  </Button>
                </div>

                {(form.content.steps || []).map((step: any, index: number) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Step {index + 1}</p>
                      <button type="button" onClick={() => removeArrayItem("steps", index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>

                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={step.icon || "Package"}
                        onValueChange={(v) => updateArrayItem("steps", index, { icon: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Title</Label>
                      <Input
                        value={step.title ?? ""}
                        onChange={(e) => updateArrayItem("steps", index, { title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={step.desc ?? ""}
                        onChange={(e) => updateArrayItem("steps", index, { desc: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {t === "faq" && (
              <div className="space-y-4">
                <div>
                  <Label>Heading</Label>
                  <Input
                    value={form.content.heading ?? ""}
                    onChange={(e) => updateContent("heading", e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>FAQ Items</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayItem("items", { q: "New question?", a: "New answer." })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
                  </Button>
                </div>

                {(form.content.items || []).map((item: any, index: number) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">FAQ {index + 1}</p>
                      <button type="button" onClick={() => removeArrayItem("items", index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>

                    <div>
                      <Label>Question</Label>
                      <Input
                        value={item.q ?? ""}
                        onChange={(e) => updateArrayItem("items", index, { q: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Answer</Label>
                      <Textarea
                        value={item.a ?? ""}
                        onChange={(e) => updateArrayItem("items", index, { a: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {t === "trust_badges" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Badges</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addArrayItem("badges", { icon: "Shield", title: "New Badge", desc: "" })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Badge
                  </Button>
                </div>

                {(form.content.badges || []).map((badge: any, index: number) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Badge {index + 1}</p>
                      <button type="button" onClick={() => removeArrayItem("badges", index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>

                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={badge.icon || "Shield"}
                        onValueChange={(v) => updateArrayItem("badges", index, { icon: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Title</Label>
                      <Input
                        value={badge.title ?? ""}
                        onChange={(e) => updateArrayItem("badges", index, { title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={badge.desc ?? ""}
                        onChange={(e) => updateArrayItem("badges", index, { desc: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="w-full font-display uppercase tracking-wider"
            >
              {saving ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default BlockEditorPanel;
