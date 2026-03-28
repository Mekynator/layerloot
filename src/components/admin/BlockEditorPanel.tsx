import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
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

type ActionType = "none" | "internal_link" | "external_link";

type PageOption = {
  id: string;
  name: string;
  title: string | null;
  slug: string;
  full_path: string;
  page_type: string;
  parent_id: string | null;
};

const ICON_OPTIONS = [
  "ShoppingBag",
  "Palette",
  "Upload",
  "Printer",
  "Package",
  "Truck",
  "Shield",
  "Star",
  "Mail",
  "ExternalLink",
  "Box",
  "Sparkles",
  "CheckCircle2",
  "HelpCircle",
  "Gem",
  "Wrench",
  "Home",
  "Gift",
  "BadgeCheck",
  "Instagram",
];

const BLOCKS_WITH_BUTTONS = new Set(["hero", "cta", "button", "banner", "featured_products"]);
const BLOCKS_WITH_REPEATERS = new Set(["entry_cards", "how_it_works", "faq", "trust_badges"]);
const DEFAULT_PLACEMENT = "__default__";

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

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const toActionType = (value: unknown): ActionType => {
  if (value === "internal_link" || value === "external_link") return value;
  return "none";
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
  const [pageSearch, setPageSearch] = useState("");
  const [sitePages, setSitePages] = useState<PageOption[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadSitePages = async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("id,name,title,slug,full_path,page_type,parent_id")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (!error) {
        setSitePages((data as PageOption[]) ?? []);
      }
    };

    void loadSitePages();
  }, []);

  useEffect(() => {
    if (!block) return;

    const content = { ...(block.content || {}) };

    if (!Array.isArray(content.buttons) && BLOCKS_WITH_BUTTONS.has(block.block_type)) {
      const fallbackButtons: any[] = [];
      if (content.button_text) {
        fallbackButtons.push({
          text: content.button_text,
          icon: content.button_icon || "",
          iconPosition: "left",
          variant:
            content.button_variant ||
            (content.style === "outline" ? "outline" : content.style === "ghost" ? "ghost" : "default"),
          actionType: /^https?:\/\//i.test(content.button_link || "") ? "external_link" : "internal_link",
          actionTarget: content.button_link || "",
          openInNewTab: false,
          visible: true,
        });
      }

      if (content.secondary_button_text) {
        fallbackButtons.push({
          text: content.secondary_button_text,
          icon: "",
          iconPosition: "left",
          variant: "outline",
          actionType: /^https?:\/\//i.test(content.secondary_button_link || "") ? "external_link" : "internal_link",
          actionTarget: content.secondary_button_link || "",
          openInNewTab: false,
          visible: true,
        });
      }

      if (fallbackButtons.length > 0) {
        content.buttons = fallbackButtons;
      }
    }

    setForm({
      title: block.title ?? "",
      page: block.page ?? "home",
      block_type: block.block_type,
      is_active: block.is_active ?? true,
      content,
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
          { value: DEFAULT_PLACEMENT, label: "Before products" },
          { value: "after_products", label: "After products" },
        ];
      case "contact":
        return [
          { value: DEFAULT_PLACEMENT, label: "Before contact section" },
          { value: "after_contact", label: "After contact section" },
        ];
      case "gallery":
        return [
          { value: DEFAULT_PLACEMENT, label: "Before gallery" },
          { value: "after_gallery", label: "After gallery" },
        ];
      case "create-your-own":
        return [
          { value: DEFAULT_PLACEMENT, label: "Before tools section" },
          { value: "after_create_your_own", label: "After tools section" },
        ];
      case "submit-design":
        return [
          { value: DEFAULT_PLACEMENT, label: "Before submit form" },
          { value: "after_submit_design", label: "After submit form" },
        ];
      default:
        return [{ value: DEFAULT_PLACEMENT, label: "Default position" }];
    }
  }, [form.page, block?.page]);

  const fallbackButtonTargetPages = availablePages.filter((p) => !p.startsWith("global_"));

  const buttonTargetPages = useMemo(() => {
    if (sitePages.length === 0) {
      return fallbackButtonTargetPages.map((p, index) => ({
        id: `fallback-${index}`,
        label: prettyPageLabel(p),
        value: normalizePath(routeFromPage(p)),
        slug: p,
      }));
    }

    const map = new Map<string, { id: string; label: string; value: string; slug: string; parent_id: string | null }>();

    sitePages
      .filter((page) => page.page_type !== "global")
      .forEach((page) => {
        map.set(page.id, {
          id: page.id,
          label: page.title || page.name || prettyPageLabel(page.slug),
          value: normalizePath(page.full_path),
          slug: page.slug,
          parent_id: page.parent_id,
        });
      });

    return Array.from(map.values());
  }, [sitePages, fallbackButtonTargetPages]);

  const pageLookup = useMemo(() => {
    const byId = new Map(sitePages.map((page) => [page.id, page]));
    return buttonTargetPages.map((page) => {
      const source = byId.get(page.id);
      if (!source?.parent_id) return page;

      const parent = byId.get(source.parent_id);
      if (!parent) return page;

      return {
        ...page,
        label: `${parent.title || parent.name || prettyPageLabel(parent.slug)} / ${page.label}`,
      };
    });
  }, [buttonTargetPages, sitePages]);

  const filteredPageOptions = useMemo(() => {
    const term = pageSearch.trim().toLowerCase();
    if (!term) return pageLookup;

    return pageLookup.filter((page) => {
      const haystack = `${page.label} ${page.slug} ${page.value}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [pageLookup, pageSearch]);

  const updateForm = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateContent = (key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
  };

  const updateArrayItem = (key: string, index: number, patch: any) => {
    const current = [...(form.content?.[key] || [])];
    current[index] = { ...current[index], ...patch };
    updateContent(key, current);
  };

  const addArrayItem = (key: string, item: any) => {
    updateContent(key, [...(form.content?.[key] || []), item]);
  };

  const removeArrayItem = (key: string, index: number) => {
    const current = [...(form.content?.[key] || [])];
    current.splice(index, 1);
    updateContent(key, current);
  };

  const reorderArrayItem = (key: string, index: number, direction: "up" | "down") => {
    const current = [...(form.content?.[key] || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    updateContent(key, current);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    setUploading(false);

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) updateContent(field, url);
  };

  const handleCarouselUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls: string[] = [];

    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }

    updateContent("images", [...(form.content.images || []), ...urls]);
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Block saved" });
    onSave();
  };

  const renderPagePicker = (
    currentTarget: string,
    onSelect: (value: string) => void,
    placeholder = "Search page or child page",
  ) => (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div>
        <Label>Page Search</Label>
        <Input value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} placeholder={placeholder} />
      </div>

      <div>
        <Label>Internal Page</Label>
        <Select value={currentTarget || "__none__"} onValueChange={(value) => value !== "__none__" && onSelect(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select page</SelectItem>
            {filteredPageOptions.map((page) => (
              <SelectItem key={page.id} value={page.value}>
                {page.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderActionEditor = (prefix: "section" | "button", data: any, onChange: (patch: any) => void) => (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div>
        <Label>{prefix === "section" ? "Section click action" : "Button action"}</Label>
        <Select value={toActionType(data?.actionType)} onValueChange={(v) => onChange({ actionType: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="internal_link">Internal Link</SelectItem>
            <SelectItem value="external_link">External URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {toActionType(data?.actionType) === "internal_link" &&
        renderPagePicker(data?.actionTarget || "", (value) => onChange({ actionTarget: value }))}

      {toActionType(data?.actionType) !== "none" && (
        <>
          <div>
            <Label>Target</Label>
            <Input
              placeholder={toActionType(data?.actionType) === "internal_link" ? "/products" : "https://example.com"}
              value={data?.actionTarget || ""}
              onChange={(e) => onChange({ actionTarget: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={Boolean(data?.openInNewTab)} onCheckedChange={(v) => onChange({ openInNewTab: v })} />
            Open in new tab
          </label>
        </>
      )}
    </div>
  );

  const renderButtonsEditor = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Buttons</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            addArrayItem("buttons", {
              text: "New Button",
              icon: "",
              iconPosition: "left",
              variant: "default",
              actionType: "internal_link",
              actionTarget: "/",
              openInNewTab: false,
              visible: true,
            })
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Button
        </Button>
      </div>

      {(form.content.buttons || []).map((btn: any, index: number) => (
        <div key={index} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Button {index + 1}</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => reorderArrayItem("buttons", index, "up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => reorderArrayItem("buttons", index, "down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("buttons", index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={btn.visible !== false}
              onCheckedChange={(v) => updateArrayItem("buttons", index, { visible: v })}
            />
            Visible
          </label>

          <div>
            <Label>Text</Label>
            <Input
              value={btn.text || ""}
              onChange={(e) => updateArrayItem("buttons", index, { text: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Icon</Label>
              <Select
                value={btn.icon || "__none__"}
                onValueChange={(v) => updateArrayItem("buttons", index, { icon: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No icon</SelectItem>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Icon Position</Label>
              <Select
                value={btn.iconPosition || "left"}
                onValueChange={(v) => updateArrayItem("buttons", index, { iconPosition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Variant</Label>
            <Select
              value={btn.variant || "default"}
              onValueChange={(v) => updateArrayItem("buttons", index, { variant: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderActionEditor("button", btn, (patch) => updateArrayItem("buttons", index, patch))}
        </div>
      ))}
    </div>
  );

  const renderStyleEditor = () => (
    <div className="space-y-3">
      <div>
        <Label>Background Image URL</Label>
        <Input
          value={form.content.bg_image || form.content.backgroundImage || ""}
          onChange={(e) => {
            updateContent("bg_image", e.target.value);
            updateContent("backgroundImage", e.target.value);
          }}
        />
      </div>

      <div>
        <Label>Upload Background Image</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg_image")} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Background Color</Label>
          <Input
            value={form.content.bg_color || form.content.backgroundColor || ""}
            onChange={(e) => {
              updateContent("bg_color", e.target.value);
              updateContent("backgroundColor", e.target.value);
            }}
            placeholder="#ffffff"
          />
        </div>
        <div>
          <Label>Text Color</Label>
          <Input
            value={form.content.text_color || form.content.textColor || ""}
            onChange={(e) => {
              updateContent("text_color", e.target.value);
              updateContent("textColor", e.target.value);
            }}
            placeholder="#111111"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Padding Top (px)</Label>
          <Input
            type="number"
            value={form.content.paddingTop ?? ""}
            onChange={(e) => updateContent("paddingTop", e.target.value === "" ? null : parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label>Padding Bottom (px)</Label>
          <Input
            type="number"
            value={form.content.paddingBottom ?? ""}
            onChange={(e) =>
              updateContent("paddingBottom", e.target.value === "" ? null : parseInt(e.target.value) || 0)
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Margin Top (px)</Label>
          <Input
            type="number"
            value={form.content.marginTop ?? ""}
            onChange={(e) => updateContent("marginTop", e.target.value === "" ? null : parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label>Margin Bottom (px)</Label>
          <Input
            type="number"
            value={form.content.marginBottom ?? ""}
            onChange={(e) =>
              updateContent("marginBottom", e.target.value === "" ? null : parseInt(e.target.value) || 0)
            }
          />
        </div>
      </div>

      <div>
        <Label>Custom Class Name</Label>
        <Input
          value={form.content.customClassName || form.content.className || ""}
          onChange={(e) => {
            updateContent("customClassName", e.target.value);
            updateContent("className", e.target.value);
          }}
          placeholder="my-extra-block-class"
        />
      </div>
    </div>
  );

  const renderLayoutEditor = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Content Alignment</Label>
          <Select value={form.content.alignment || "center"} onValueChange={(v) => updateContent("alignment", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Button Alignment</Label>
          <Select
            value={form.content.buttonAlignment || "center"}
            onValueChange={(v) => updateContent("buttonAlignment", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Vertical Alignment</Label>
          <Select
            value={form.content.verticalAlignment || "center"}
            onValueChange={(v) => updateContent("verticalAlignment", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Columns</Label>
          <Input
            type="number"
            min={1}
            max={4}
            value={form.content.columns ?? ""}
            onChange={(e) =>
              updateContent(
                "columns",
                e.target.value === "" ? null : Math.max(1, Math.min(4, parseInt(e.target.value) || 1)),
              )
            }
          />
        </div>
      </div>

      <div>
        <Label>Image Position</Label>
        <Select value={form.content.imagePosition || "left"} onValueChange={(v) => updateContent("imagePosition", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Image Left / Text Right</SelectItem>
            <SelectItem value="right">Image Right / Text Left</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const handleItemImageUpload = async (e: ChangeEvent<HTMLInputElement>, arrayKey: string, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) updateArrayItem(arrayKey, index, { image: url });
  };

  const renderMediaPicker = (item: any, arrayKey: string, index: number) => (
    <div className="space-y-2 rounded-md border border-dashed border-border p-2">
      <Label className="text-xs text-muted-foreground">Visual (Icon or Image)</Label>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            name={`media-${arrayKey}-${index}`}
            checked={!item.image}
            onChange={() => updateArrayItem(arrayKey, index, { image: "" })}
            className="accent-primary"
          />
          Icon
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            name={`media-${arrayKey}-${index}`}
            checked={!!item.image}
            onChange={() => updateArrayItem(arrayKey, index, { image: item.image || "placeholder" })}
            className="accent-primary"
          />
          Image
        </label>
      </div>
      {!item.image ? (
        <Select value={item.icon || "Package"} onValueChange={(v) => updateArrayItem(arrayKey, index, { icon: v })}>
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
      ) : (
        <div className="space-y-1">
          {item.image && item.image !== "placeholder" && (
            <img src={item.image} alt="" className="h-16 w-16 rounded object-cover" />
          )}
          <Input type="file" accept="image/*" onChange={(e) => handleItemImageUpload(e, arrayKey, index)} />
          <Input
            value={item.image === "placeholder" ? "" : item.image || ""}
            onChange={(e) => updateArrayItem(arrayKey, index, { image: e.target.value })}
            placeholder="Or paste image URL"
          />
        </div>
      )}
    </div>
  );

  const renderRepeaterEditor = () => {
    const t = form.block_type;

    if (t === "entry_cards") {
      return (
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
                  cta: "Learn more",
                  actionType: "internal_link",
                  actionTarget: "/",
                  openInNewTab: false,
                  visible: true,
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
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("cards", index, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("cards", index, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("cards", index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={card.visible !== false}
                  onCheckedChange={(v) => updateArrayItem("cards", index, { visible: v })}
                />{" "}
                Visible
              </label>
              <Input
                value={card.title || ""}
                onChange={(e) => updateArrayItem("cards", index, { title: e.target.value })}
                placeholder="Title"
              />
              <Textarea
                value={card.desc || ""}
                onChange={(e) => updateArrayItem("cards", index, { desc: e.target.value })}
                rows={3}
                placeholder="Description"
              />
              <Input
                value={card.cta || ""}
                onChange={(e) => updateArrayItem("cards", index, { cta: e.target.value })}
                placeholder="CTA text"
              />
              {renderMediaPicker(card, "cards", index)}
              {renderActionEditor(
                "button",
                {
                  actionType: toActionType(card.actionType),
                  actionTarget: card.actionTarget || card.link || "",
                  openInNewTab: Boolean(card.openInNewTab),
                },
                (patch) => updateArrayItem("cards", index, { ...patch, link: patch.actionTarget ?? card.link }),
              )}
            </div>
          ))}
        </div>
      );
    }

    if (t === "how_it_works") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Steps</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addArrayItem("steps", { icon: "Package", title: "New Step", desc: "", visible: true })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
            </Button>
          </div>
          {(form.content.steps || []).map((step: any, index: number) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Step {index + 1}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("steps", index, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("steps", index, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("steps", index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={step.visible !== false}
                  onCheckedChange={(v) => updateArrayItem("steps", index, { visible: v })}
                />{" "}
                Visible
              </label>
              <Input
                value={step.title || ""}
                onChange={(e) => updateArrayItem("steps", index, { title: e.target.value })}
                placeholder="Step title"
              />
              <Textarea
                value={step.desc || ""}
                onChange={(e) => updateArrayItem("steps", index, { desc: e.target.value })}
                rows={2}
                placeholder="Step description"
              />
              {renderMediaPicker(step, "steps", index)}
              {renderActionEditor(
                "button",
                {
                  actionType: toActionType(step.actionType),
                  actionTarget: step.actionTarget || "",
                  openInNewTab: Boolean(step.openInNewTab),
                },
                (patch) => updateArrayItem("steps", index, patch),
              )}
            </div>
          ))}
        </div>
      );
    }

    if (t === "faq") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>FAQ Items</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addArrayItem("items", { q: "New question", a: "New answer", visible: true })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
          {(form.content.items || []).map((item: any, index: number) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">FAQ {index + 1}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("items", index, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("items", index, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("items", index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={item.visible !== false}
                  onCheckedChange={(v) => updateArrayItem("items", index, { visible: v })}
                />{" "}
                Visible
              </label>
              <Input
                value={item.q || ""}
                onChange={(e) => updateArrayItem("items", index, { q: e.target.value })}
                placeholder="Question"
              />
              <Textarea
                value={item.a || ""}
                onChange={(e) => updateArrayItem("items", index, { a: e.target.value })}
                rows={4}
                placeholder="Answer"
              />
            </div>
          ))}
        </div>
      );
    }

    if (t === "trust_badges") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Badges</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addArrayItem("badges", { icon: "Shield", title: "New Badge", desc: "", visible: true })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Badge
            </Button>
          </div>
          {(form.content.badges || []).map((badge: any, index: number) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Badge {index + 1}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("badges", index, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => reorderArrayItem("badges", index, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("badges", index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={badge.visible !== false}
                  onCheckedChange={(v) => updateArrayItem("badges", index, { visible: v })}
                />{" "}
                Visible
              </label>
              <Input
                value={badge.title || ""}
                onChange={(e) => updateArrayItem("badges", index, { title: e.target.value })}
                placeholder="Title"
              />
              <Textarea
                value={badge.desc || ""}
                onChange={(e) => updateArrayItem("badges", index, { desc: e.target.value })}
                rows={2}
                placeholder="Description"
              />
              {renderMediaPicker(badge, "badges", index)}
              {renderActionEditor(
                "button",
                {
                  actionType: toActionType(badge.actionType),
                  actionTarget: badge.actionTarget || "",
                  openInNewTab: Boolean(badge.openInNewTab),
                },
                (patch) => updateArrayItem("badges", index, patch),
              )}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const renderTypeContentEditor = () => {
    const t = form.block_type;

    if (t === "hero" || t === "banner" || t === "cta") {
      return (
        <div className="space-y-3">
          {t === "hero" && (
            <>
              <div>
                <Label>Eyebrow / Badge</Label>
                <Input value={form.content.eyebrow ?? ""} onChange={(e) => updateContent("eyebrow", e.target.value)} />
              </div>
              <div>
                <Label>Icon</Label>
                <Select
                  value={form.content.icon || "__none__"}
                  onValueChange={(v) => updateContent("icon", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No icon</SelectItem>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label>Heading</Label>
            <Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} />
          </div>
          <div>
            <Label>Subheading</Label>
            <Textarea
              value={form.content.subheading ?? ""}
              onChange={(e) => updateContent("subheading", e.target.value)}
              rows={3}
            />
          </div>
        </div>
      );
    }

    if (t === "shipping_banner") {
      return (
        <div>
          <Label>Banner Text</Label>
          <Input value={form.content.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} />
        </div>
      );
    }

    if (t === "text") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Heading</Label>
            <Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} />
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
      );
    }

    if (t === "image") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Image URL</Label>
            <Input value={form.content.image_url ?? ""} onChange={(e) => updateContent("image_url", e.target.value)} />
          </div>
          <div>
            <Label>Upload Image</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "image_url")} />
          </div>
          <div>
            <Label>Alt Text</Label>
            <Input value={form.content.alt ?? ""} onChange={(e) => updateContent("alt", e.target.value)} />
          </div>
        </div>
      );
    }

    if (t === "carousel") {
      return (
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
      );
    }

    if (t === "video") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Video URL</Label>
            <Input value={form.content.video_url ?? ""} onChange={(e) => updateContent("video_url", e.target.value)} />
          </div>
          <div>
            <Label>Caption</Label>
            <Input value={form.content.caption ?? ""} onChange={(e) => updateContent("caption", e.target.value)} />
          </div>
        </div>
      );
    }

    if (t === "spacer") {
      return (
        <div>
          <Label>Height (px)</Label>
          <Input
            type="number"
            value={form.content.height ?? 40}
            onChange={(e) => updateContent("height", parseInt(e.target.value) || 40)}
          />
        </div>
      );
    }

    if (t === "html") {
      return (
        <div>
          <Label>HTML Code</Label>
          <Textarea
            value={form.content.html ?? ""}
            onChange={(e) => updateContent("html", e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </div>
      );
    }

    if (t === "embed") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Heading</Label>
            <Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} />
          </div>
          <div>
            <Label>Embed URL</Label>
            <Input value={form.content.embed_url ?? ""} onChange={(e) => updateContent("embed_url", e.target.value)} />
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
      );
    }

    if (t === "newsletter") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Heading</Label>
            <Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} />
          </div>
          <div>
            <Label>Subheading</Label>
            <Input
              value={form.content.subheading ?? ""}
              onChange={(e) => updateContent("subheading", e.target.value)}
            />
          </div>
          <div>
            <Label>Submit Button Text</Label>
            <Input
              value={form.content.submit_text ?? ""}
              onChange={(e) => updateContent("submit_text", e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (t === "how_it_works" || t === "trust_badges" || t === "entry_cards" || t === "faq") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Heading</Label>
            <Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} />
          </div>
          <div>
            <Label>Subheading</Label>
            <Textarea
              value={form.content.subheading ?? ""}
              onChange={(e) => updateContent("subheading", e.target.value)}
              rows={2}
            />
          </div>
        </div>
      );
    }

    if (t === "categories" || t === "featured_products") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Heading</Label>
            <Input value={form.content.heading ?? ""} onChange={(e) => updateContent("heading", e.target.value)} />
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
              value={form.content.limit ?? (t === "categories" ? 6 : 8)}
              onChange={(e) => updateContent("limit", parseInt(e.target.value) || (t === "categories" ? 6 : 8))}
            />
          </div>
          {t === "featured_products" && (
            <>
              <div>
                <Label>View All Button Text</Label>
                <Input
                  value={form.content.view_all_text ?? ""}
                  onChange={(e) => updateContent("view_all_text", e.target.value)}
                />
              </div>
              <div>
                <Label>View All Link</Label>
                <Input
                  value={form.content.view_all_link ?? ""}
                  onChange={(e) => updateContent("view_all_link", e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      );
    }

    if (t === "button") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Legacy Button Text</Label>
            <Input
              value={form.content.button_text ?? ""}
              onChange={(e) => updateContent("button_text", e.target.value)}
            />
          </div>
          <div>
            <Label>Legacy Button Link</Label>
            <Input
              value={form.content.button_link ?? ""}
              onChange={(e) => updateContent("button_link", e.target.value)}
            />
          </div>
          <div>
            <Label>Legacy Style</Label>
            <Select value={form.content.style ?? "default"} onValueChange={(v) => updateContent("style", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    if (t === "instagram_auto_feed") {
      return (
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.content.title ?? ""} onChange={(e) => updateContent("title", e.target.value)} />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea
              value={form.content.subtitle ?? ""}
              onChange={(e) => updateContent("subtitle", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Instagram Username or Profile URL</Label>
            <Input
              value={form.content.instagramUsername ?? ""}
              onChange={(e) => updateContent("instagramUsername", e.target.value)}
              placeholder="layerloot3d or https://www.instagram.com/layerloot3d"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Items to Show</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.content.itemsToShow ?? 10}
                onChange={(e) =>
                  updateContent("itemsToShow", Math.max(1, Math.min(20, parseInt(e.target.value) || 10)))
                }
              />
            </div>
            <div>
              <Label>Loop Speed (ms)</Label>
              <Input
                type="number"
                min={1500}
                step={500}
                value={form.content.intervalMs ?? 3000}
                onChange={(e) => updateContent("intervalMs", Math.max(1500, parseInt(e.target.value) || 3000))}
              />
            </div>
          </div>
          <div>
            <Label>Layout</Label>
            <Select value={form.content.layout ?? "slider"} onValueChange={(v) => updateContent("layout", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slider">Slider</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Edge Function Name</Label>
            <Input
              value={form.content.functionName ?? "instagram-feed"}
              onChange={(e) => updateContent("functionName", e.target.value)}
              placeholder="instagram-feed"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.content.autoplay !== false} onCheckedChange={(v) => updateContent("autoplay", v)} />{" "}
            Autoplay loop
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={!!form.content.showCaptions} onCheckedChange={(v) => updateContent("showCaptions", v)} />{" "}
            Show captions
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.content.showProfileButton !== false}
              onCheckedChange={(v) => updateContent("showProfileButton", v)}
            />{" "}
            Show profile button
          </label>
        </div>
      );
    }

    return null;
  };

  const t = form.block_type;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
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
                <Label>Placement</Label>
                <Select
                  value={form.content?.placement ?? DEFAULT_PLACEMENT}
                  onValueChange={(v) => updateContent("placement", v === DEFAULT_PLACEMENT ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {placementOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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

            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.content.visibility !== false}
                onCheckedChange={(v) => updateContent("visibility", v)}
              />
              Section visible
            </label>

            <Accordion
              type="multiple"
              defaultValue={["content", "style", "actions", "layout"]}
              className="w-full space-y-2"
            >
              <AccordionItem value="content" className="rounded-md border border-border px-3">
                <AccordionTrigger className="font-display text-xs uppercase tracking-wider">Content</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  {renderTypeContentEditor()}
                  {BLOCKS_WITH_REPEATERS.has(t) && renderRepeaterEditor()}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="style" className="rounded-md border border-border px-3">
                <AccordionTrigger className="font-display text-xs uppercase tracking-wider">Style</AccordionTrigger>
                <AccordionContent className="pb-3">{renderStyleEditor()}</AccordionContent>
              </AccordionItem>

              <AccordionItem value="actions" className="rounded-md border border-border px-3">
                <AccordionTrigger className="font-display text-xs uppercase tracking-wider">Actions</AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  {renderActionEditor(
                    "section",
                    {
                      actionType: toActionType(form.content.section_actionType || form.content.actionType),
                      actionTarget: form.content.section_actionTarget || form.content.actionTarget || "",
                      openInNewTab: Boolean(form.content.section_openInNewTab || form.content.openInNewTab),
                    },
                    (patch) => {
                      updateContent("section_actionType", patch.actionType ?? form.content.section_actionType);
                      updateContent("section_actionTarget", patch.actionTarget ?? form.content.section_actionTarget);
                      updateContent("section_openInNewTab", patch.openInNewTab ?? form.content.section_openInNewTab);
                    },
                  )}

                  {BLOCKS_WITH_BUTTONS.has(t) && renderButtonsEditor()}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="layout" className="rounded-md border border-border px-3">
                <AccordionTrigger className="font-display text-xs uppercase tracking-wider">Layout</AccordionTrigger>
                <AccordionContent className="pb-3">{renderLayoutEditor()}</AccordionContent>
              </AccordionItem>
            </Accordion>

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
