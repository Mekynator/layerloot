import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SiteBlock } from "./BlockRenderer";
import type { Json } from "@/integrations/supabase/types";
import BlockFieldGroups from "./editor/BlockFieldGroups";
import { tr } from "@/lib/translate";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import { Copy, Trash2, X } from "lucide-react";

interface BlockEditorPanelProps {
  block: SiteBlock | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  pages: string[];
}

type RepeaterItem = Record<string, unknown>;

const DEFAULT_ITEMS: Record<string, RepeaterItem[]> = {
  faq: [
    { question: "What materials do you offer?", answer: "We offer PLA, PETG, resin, and more.", visible: true },
    { question: "How long does printing take?", answer: "Most orders are printed within 2-5 days.", visible: true },
  ],
  how_it_works: [
    { icon: "ShoppingBag", title: "Choose", desc: "Browse products or upload your own 3D model", visible: true },
    { icon: "Palette", title: "Customize", desc: "Select material, color, size, and finish", visible: true },
    { icon: "Printer", title: "We Print", desc: "Your item is 3D printed with precision", visible: true },
    { icon: "Package", title: "Delivered", desc: "Packed safely and shipped to your door", visible: true },
  ],
  trust_badges: [
    { icon: "Truck", title: "Free Shipping", desc: "On orders over 500 kr", visible: true },
    { icon: "Shield", title: "Secure Checkout", desc: "Protected checkout", visible: true },
    { icon: "Star", title: "Rewards", desc: "Earn points on purchases", visible: true },
  ],
  entry_cards: [
    { icon: "ShoppingBag", title: "Shop Products", desc: "Explore ready-made items.", cta: "Browse", actionType: "internal_link", actionTarget: "/products", openInNewTab: false, visible: true },
  ],
  image: [
    { image: "", title: "Image 1", subtitle: "", actionType: "none", actionTarget: "", openInNewTab: false, visible: true, colSpan: 1, rowSpan: 1, order: 1, objectFit: "cover" },
  ],
  carousel: [
    { image: "", title: "Slide 1", subtitle: "", actionType: "none", actionTarget: "", openInNewTab: false, visible: true },
  ],
  social_proof: [
    { icon: "Users", label: "Happy Customers", value: "2,500+", visible: true },
    { icon: "Star", label: "Average Rating", value: "4.9/5", visible: true },
    { icon: "Package", label: "Orders Shipped", value: "10,000+", visible: true },
  ],
  testimonials: [
    { name: "Customer", quote: "Amazing quality!", rating: "5", visible: true },
  ],
  gallery: [
    { url: "", caption: "", alt: "", visible: true },
  ],
};

const getRepeaterKey = (blockType?: string | null) => {
  switch (blockType) {
    case "faq": return "items";
    case "how_it_works": return "steps";
    case "trust_badges": return "badges";
    case "entry_cards": return "cards";
    case "image": return "items";
    case "carousel": return "slides";
    case "social_proof": return "items";
    case "testimonials": return "items";
    case "gallery": return "images";
    default: return null;
  }
};

const normalizeFaqItems = (items: RepeaterItem[]) =>
  items.map((item) => ({
    ...item,
    question: item.question ?? item.q ?? "",
    answer: item.answer ?? item.a ?? "",
  }));

const normalizeContent = (block: SiteBlock | null) => {
  if (!block) return {};
  const base = typeof block.content === "object" && block.content ? { ...(block.content as Record<string, unknown>) } : {};
  const repeaterKey = getRepeaterKey(block.block_type);
  if (!repeaterKey) return base;

  const existing = Array.isArray(base[repeaterKey]) ? [...(base[repeaterKey] as RepeaterItem[])] : [];
  if (block.block_type === "faq") {
    if (existing.length > 0) return { ...base, [repeaterKey]: normalizeFaqItems(existing) };
    return { ...base, [repeaterKey]: DEFAULT_ITEMS.faq };
  }
  if (existing.length > 0) return base;
  return { ...base, [repeaterKey]: DEFAULT_ITEMS[block.block_type] ?? [] };
};

const BlockEditorPanel = ({ block, open, onClose, onSave, pages }: BlockEditorPanelProps) => {
  const { toast } = useToast();
  const editor = useVisualEditor();
  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!block) return;
    setTitle(typeof block.title === "string" ? block.title : tr(block.title, ""));
    setIsActive(block.is_active ?? true);
    setContent(normalizeContent(block));
  }, [block]);

  const repeaterKey = useMemo(() => getRepeaterKey(block?.block_type), [block?.block_type]);
  const repeaterItems = useMemo(() => {
    if (!repeaterKey) return [];
    const items = content[repeaterKey];
    return Array.isArray(items) ? items as RepeaterItem[] : [];
  }, [content, repeaterKey]);

  const patchContent = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const patchItem = (index: number, patch: Record<string, unknown>) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...(prev[repeaterKey] as RepeaterItem[])] : [];
      items[index] = { ...items[index], ...patch };
      return { ...prev, [repeaterKey]: items };
    });
  };

  const addItem = () => {
    if (!block || !repeaterKey) return;
    const defaults = DEFAULT_ITEMS[block.block_type] ?? [{}];
    const template = defaults[0] ?? {};
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...(prev[repeaterKey] as RepeaterItem[])] : [];
      items.push({ ...template, order: items.length + 1 });
      return { ...prev, [repeaterKey]: items };
    });
  };

  const removeItem = (index: number) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...(prev[repeaterKey] as RepeaterItem[])] : [];
      items.splice(index, 1);
      return { ...prev, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...(prev[repeaterKey] as RepeaterItem[])] : [];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return prev;
      const [moved] = items.splice(index, 1);
      items.splice(nextIndex, 0, moved);
      return { ...prev, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  };

  const duplicateItem = (index: number) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...(prev[repeaterKey] as RepeaterItem[])] : [];
      if (index < 0 || index >= items.length) return prev;
      const clone = { ...items[index], order: items.length + 1 };
      items.splice(index + 1, 0, clone);
      return { ...prev, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  };

  const handleSave = async () => {
    if (!block) return;
    setSaving(true);

    const payloadContent = { ...content };
    if (block.block_type === "faq" && repeaterKey === "items") {
      (payloadContent as Record<string, unknown>).items = repeaterItems.map((item) => ({
        ...item,
        q: item.question ?? "",
        a: item.answer ?? "",
      }));
    }

    const { error } = await supabase
      .from("site_blocks")
      .update({ title: title.trim() || block.title, content: payloadContent as Record<string, Json>, is_active: isActive })
      .eq("id", block.id);
    setSaving(false);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Block updated" });
    onSave();
  };

  if (!block) return null;

  const handleDelete = () => {
    try {
      editor.deleteBlock(block.id);
      onClose();
    } catch (err) {
      toast({ title: "Delete failed", description: "Could not delete section", variant: "destructive" });
    }
  };

  const handleDuplicate = () => {
    try {
      editor.duplicateBlock(block.id);
      toast({ title: "Section duplicated" });
    } catch (err) {
      toast({ title: "Duplicate failed", description: "Could not duplicate section", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-start gap-3 w-full">
            <div className="flex-1">
              <SheetTitle className="font-display tracking-wider flex items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{tr(block.title, block.block_type.replace(/_/g, " "))}</span>
                    <span className="text-[11px] text-muted-foreground">{block.block_type.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </SheetTitle>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsActive((v) => { const n = !v; void editor.toggleBlockActive(block.id); return n; }); }} className="text-sm">
                {isActive ? "Hide" : "Show"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDuplicate} title="Duplicate">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-5 px-4">
          {/* Section group */}
          <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {block.block_type.replace(/_/g, " ")}
              </Badge>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs ${isActive ? "text-green-500" : "text-muted-foreground"}`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
                <Switch checked={isActive} onCheckedChange={(v) => { setIsActive(!!v); }} />
              </div>
            </div>

            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Section title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Content group - reuse existing BlockFieldGroups which is content-aware */}
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Content</h4>
              <p className="text-xs text-muted-foreground">Edit content and media</p>
            </div>

            <BlockFieldGroups
              blockType={block.block_type}
              content={content}
              patchContent={patchContent}
              repeaterItems={repeaterItems}
              patchItem={patchItem}
              addItem={addItem}
              removeItem={removeItem}
              moveItem={moveItem}
              duplicateItem={duplicateItem}
              pages={pages}
            />
          </div>

          {/* Conditional small groups: Buttons/Actions, Layout, Style */}
          {content.buttons || block.block_type === "hero" || block.block_type === "cta" ? (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Buttons / Actions</h4>
                <p className="text-xs text-muted-foreground">Manage CTAs</p>
              </div>
              {/* Buttons editor reuses BlockFieldGroups if available; otherwise provide minimal controls */}
              {/* Existing BlockFieldGroups will render button controls when appropriate */}
            </div>
          ) : null}

          {block.block_type === "spacer" || block.block_type === "divider" ? (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Layout / Spacing</h4>
                <p className="text-xs text-muted-foreground">Adjust spacing and dividers</p>
              </div>

              {/* Minimal controls for spacer/divider */}
              {block.block_type === "spacer" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Height (px)</Label>
                  <Input value={(content.height as number) ?? 40} onChange={(e) => patchContent("height", Number(e.target.value) || 0)} className="mt-1 w-32" />
                </div>
              )}
            </div>
          ) : null}

          {/* Visibility / Advanced */}
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Visibility</h4>
              <p className="text-xs text-muted-foreground">Who can see this section</p>
            </div>
            {/* Keep minimal for now; existing visibility toggles are in the header/group */}
            <div className="flex items-center gap-3">
              <Switch checked={typeof content.visibility === "boolean" ? content.visibility : isActive} onCheckedChange={(v) => patchContent("visibility", !!v)} />
              <Label className="text-xs text-muted-foreground">Visible on storefront</Label>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              className="flex-1 font-display uppercase tracking-wider"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BlockEditorPanel;
