import { useEffect, useMemo, useState } from "react";
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
type RepeaterItem = Record<string, any>;

const ICON_OPTIONS = [
  "Truck",
  "Shield",
  "Star",
  "ShoppingBag",
  "Palette",
  "Upload",
  "Package",
  "HelpCircle",
  "Gift",
  "Heart",
  "Sparkles",
  "BadgeCheck",
  "Printer",
  "Box",
  "Mail",
  "ExternalLink",
  "CheckCircle2",
  "Gem",
  "Wrench",
  "Home",
  "Instagram",
];

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
    {
      icon: "ShoppingBag",
      title: "Shop Products",
      desc: "Explore ready-made items.",
      cta: "Browse",
      actionType: "internal_link",
      actionTarget: "/products",
      openInNewTab: false,
      visible: true,
    },
  ],
  image: [
    {
      image: "",
      title: "Image 1",
      subtitle: "",
      actionType: "none",
      actionTarget: "",
      openInNewTab: false,
      visible: true,
      colSpan: 1,
      rowSpan: 1,
      order: 1,
      objectFit: "cover",
    },
  ],
  carousel: [
    {
      image: "",
      title: "Slide 1",
      subtitle: "",
      actionType: "none",
      actionTarget: "",
      openInNewTab: false,
      visible: true,
    },
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
    case "faq":
      return "items";
    case "how_it_works":
      return "steps";
    case "trust_badges":
      return "badges";
    case "entry_cards":
      return "cards";
    case "image":
      return "items";
    case "carousel":
      return "slides";
    case "social_proof":
      return "items";
    case "testimonials":
      return "items";
    case "gallery":
      return "images";
    default:
      return null;
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
  const base = typeof block.content === "object" && block.content ? { ...(block.content as Record<string, any>) } : {};
  const repeaterKey = getRepeaterKey(block.block_type);
  if (!repeaterKey) return base;

  const existing = Array.isArray(base[repeaterKey]) ? [...base[repeaterKey]] : [];
  if (block.block_type === "faq") {
    if (existing.length > 0) return { ...base, [repeaterKey]: normalizeFaqItems(existing) };
    return { ...base, [repeaterKey]: DEFAULT_ITEMS.faq };
  }

  if (existing.length > 0) return base;
  return { ...base, [repeaterKey]: DEFAULT_ITEMS[block.block_type] ?? [] };
};

const BlockEditorPanel = ({ block, open, onClose, onSave, pages }: BlockEditorPanelProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [content, setContent] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!block) return;
    setTitle(block.title || "");
    setIsActive(block.is_active ?? true);
    setContent(normalizeContent(block));
  }, [block]);

  const repeaterKey = useMemo(() => getRepeaterKey(block?.block_type), [block?.block_type]);
  const repeaterItems = useMemo(() => {
    if (!repeaterKey) return [];
    return Array.isArray(content[repeaterKey]) ? content[repeaterKey] : [];
  }, [content, repeaterKey]);

  const patchContent = (key: string, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const patchItem = (index: number, patch: Partial<RepeaterItem>) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...prev[repeaterKey]] : [];
      items[index] = { ...items[index], ...patch };
      return { ...prev, [repeaterKey]: items };
    });
  };

  const addItem = () => {
    if (!block || !repeaterKey) return;
    const defaults = DEFAULT_ITEMS[block.block_type] ?? [{}];
    const template = defaults[0] ?? {};
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...prev[repeaterKey]] : [];
      items.push({ ...template, order: items.length + 1 });
      return { ...prev, [repeaterKey]: items };
    });
  };

  const removeItem = (index: number) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...prev[repeaterKey]] : [];
      items.splice(index, 1);
      return { ...prev, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!repeaterKey) return;
    setContent((prev) => {
      const items = Array.isArray(prev[repeaterKey]) ? [...prev[repeaterKey]] : [];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return prev;
      const [moved] = items.splice(index, 1);
      items.splice(nextIndex, 0, moved);
      return { ...prev, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  };

  const handleSave = async () => {
    if (!block) return;
    setSaving(true);

    const payloadContent = { ...content };
    if (block.block_type === "faq" && repeaterKey === "items") {
      payloadContent.items = repeaterItems.map((item) => ({
        ...item,
        q: item.question ?? "",
        a: item.answer ?? "",
      }));
    }

    const { error } = await supabase
      .from("site_blocks")
      .update({ title: title.trim() || block.title, content: payloadContent, is_active: isActive })
      .eq("id", block.id);
    setSaving(false);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Block updated" });
    onSave();
  };

  const renderActionEditor = (item: RepeaterItem, index: number) => {
    const actionType = (item.actionType || "none") as ActionType;

    return (
      <div className="space-y-3 rounded-md border border-border p-3">
        <div>
          <Label>Click action</Label>
          <Select value={actionType} onValueChange={(value: ActionType) => patchItem(index, { actionType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No action</SelectItem>
              <SelectItem value="internal_link">Internal page</SelectItem>
              <SelectItem value="external_link">External URL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {actionType === "internal_link" && (
          <div>
            <Label>Target page</Label>
            <Select
              value={item.actionTarget || ""}
              onValueChange={(value) => patchItem(index, { actionTarget: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose page" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page} value={page}>
                    {page}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {actionType === "external_link" && (
          <div>
            <Label>External URL</Label>
            <Input
              value={item.actionTarget || ""}
              onChange={(e) => patchItem(index, { actionTarget: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}

        {actionType !== "none" && (
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Open in new tab</p>
              <p className="text-xs text-muted-foreground">Useful for external URLs</p>
            </div>
            <Switch
              checked={Boolean(item.openInNewTab)}
              onCheckedChange={(checked) => patchItem(index, { openInNewTab: checked })}
            />
          </div>
        )}
      </div>
    );
  };

  const renderMoveDeleteRow = (index: number) => (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>
        <ArrowUp className="mr-1 h-4 w-4" /> Up
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => moveItem(index, 1)}
        disabled={index === repeaterItems.length - 1}
      >
        <ArrowDown className="mr-1 h-4 w-4" /> Down
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(index)} className="ml-auto">
        <Trash2 className="mr-1 h-4 w-4" /> Delete
      </Button>
    </div>
  );

  const renderSectionTop = (withSubtitle = true, extraRight?: React.ReactNode) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label>Section heading</Label>
        <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} />
      </div>
      {withSubtitle ? (
        <div>
          <Label>Section subtitle</Label>
          <Input value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} />
        </div>
      ) : (
        extraRight
      )}
    </div>
  );

  const renderFaqEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Visible</p>
          <p className="text-xs text-muted-foreground">Show this section on page</p>
        </div>
        <Switch
          checked={content.visibility ?? true}
          onCheckedChange={(checked) => patchContent("visibility", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>FAQ items</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" /> Add item
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem key={`faq-${index}`} value={`faq-${index}`} className="rounded-md border border-border px-3">
            <AccordionTrigger className="py-3 text-left text-sm">
              {item.question || `FAQ item ${index + 1}`}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div>
                <Label>Question</Label>
                <Input value={item.question || ""} onChange={(e) => patchItem(index, { question: e.target.value })} />
              </div>
              <div>
                <Label>Answer</Label>
                <Textarea
                  value={item.answer || ""}
                  onChange={(e) => patchItem(index, { answer: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Visible</p>
                  <p className="text-xs text-muted-foreground">Hide without deleting</p>
                </div>
                <Switch
                  checked={item.visible ?? true}
                  onCheckedChange={(checked) => patchItem(index, { visible: checked })}
                />
              </div>
              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderHowItWorksEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Columns</Label>
          <Select
            value={String(content.columns || 4)}
            onValueChange={(value) => patchContent("columns", Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Alignment</Label>
          <Select
            value={String(content.alignment || "center")}
            onValueChange={(value) => patchContent("alignment", value)}
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

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Visible</p>
          <p className="text-xs text-muted-foreground">Show this section on page</p>
        </div>
        <Switch
          checked={content.visibility ?? true}
          onCheckedChange={(checked) => patchContent("visibility", checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Steps</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" /> Add step
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem key={`step-${index}`} value={`step-${index}`} className="rounded-md border border-border px-3">
            <AccordionTrigger className="py-3 text-left text-sm">{item.title || `Step ${index + 1}`}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select
                    value={item.icon || "ShoppingBag"}
                    onValueChange={(value) => patchItem(index, { icon: value })}
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
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={item.desc || ""}
                  onChange={(e) => patchItem(index, { desc: e.target.value })}
                  rows={3}
                />
              </div>

              {renderActionEditor(item, index)}

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Visible</p>
                  <p className="text-xs text-muted-foreground">Hide without deleting</p>
                </div>
                <Switch
                  checked={item.visible ?? true}
                  onCheckedChange={(checked) => patchItem(index, { visible: checked })}
                />
              </div>

              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderTrustBadgesEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Columns</Label>
          <Select
            value={String(content.columns || 3)}
            onValueChange={(value) => patchContent("columns", Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Vertical alignment</Label>
          <Select
            value={String(content.verticalAlignment || "center")}
            onValueChange={(value) => patchContent("verticalAlignment", value)}
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
      </div>

      <div className="flex items-center justify-between">
        <Label>Badges</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" /> Add badge
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem
            key={`badge-${index}`}
            value={`badge-${index}`}
            className="rounded-md border border-border px-3"
          >
            <AccordionTrigger className="py-3 text-left text-sm">{item.title || `Badge ${index + 1}`}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={item.icon || "Truck"} onValueChange={(value) => patchItem(index, { icon: value })}>
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
              </div>
              <div>
                <Label>Description</Label>
                <Input value={item.desc || ""} onChange={(e) => patchItem(index, { desc: e.target.value })} />
              </div>
              {renderActionEditor(item, index)}
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Visible</p>
                  <p className="text-xs text-muted-foreground">Hide without deleting</p>
                </div>
                <Switch
                  checked={item.visible ?? true}
                  onCheckedChange={(checked) => patchItem(index, { visible: checked })}
                />
              </div>
              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderEntryCardsEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Columns</Label>
          <Select
            value={String(content.columns || 3)}
            onValueChange={(value) => patchContent("columns", Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Alignment</Label>
          <Select
            value={String(content.alignment || "center")}
            onValueChange={(value) => patchContent("alignment", value)}
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

      <div className="flex items-center justify-between">
        <Label>Cards</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" /> Add card
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem key={`card-${index}`} value={`card-${index}`} className="rounded-md border border-border px-3">
            <AccordionTrigger className="py-3 text-left text-sm">{item.title || `Card ${index + 1}`}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select
                    value={item.icon || "ShoppingBag"}
                    onValueChange={(value) => patchItem(index, { icon: value })}
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
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={item.desc || ""}
                  onChange={(e) => patchItem(index, { desc: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Button label</Label>
                <Input value={item.cta || ""} onChange={(e) => patchItem(index, { cta: e.target.value })} />
              </div>
              {renderActionEditor(item, index)}
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Visible</p>
                  <p className="text-xs text-muted-foreground">Hide without deleting</p>
                </div>
                <Switch
                  checked={item.visible ?? true}
                  onCheckedChange={(checked) => patchItem(index, { visible: checked })}
                />
              </div>
              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderImageCollectionEditor = (mode: "image" | "carousel") => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "image" ? (
          <div>
            <Label>Columns</Label>
            <Select
              value={String(content.columns || 3)}
              onValueChange={(value) => patchContent("columns", Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Autoplay</p>
              <p className="text-xs text-muted-foreground">Auto move to next slide</p>
            </div>
            <Switch
              checked={content.autoplay ?? false}
              onCheckedChange={(checked) => patchContent("autoplay", checked)}
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Visible</p>
            <p className="text-xs text-muted-foreground">Show this section on page</p>
          </div>
          <Switch
            checked={content.visibility ?? true}
            onCheckedChange={(checked) => patchContent("visibility", checked)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>{mode === "image" ? "Image tiles" : "Slides"}</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" /> Add {mode === "image" ? "image" : "slide"}
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem
            key={`${mode}-${index}`}
            value={`${mode}-${index}`}
            className="rounded-md border border-border px-3"
          >
            <AccordionTrigger className="py-3 text-left text-sm">
              {item.title || `${mode === "image" ? "Image" : "Slide"} ${index + 1}`}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div>
                <Label>Image URL</Label>
                <Input
                  value={item.image || ""}
                  onChange={(e) => patchItem(index, { image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input value={item.subtitle || ""} onChange={(e) => patchItem(index, { subtitle: e.target.value })} />
                </div>
              </div>

              {mode === "image" && (
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <Label>Col span</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.colSpan || 1}
                      onChange={(e) => patchItem(index, { colSpan: Number(e.target.value || 1) })}
                    />
                  </div>
                  <div>
                    <Label>Row span</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.rowSpan || 1}
                      onChange={(e) => patchItem(index, { rowSpan: Number(e.target.value || 1) })}
                    />
                  </div>
                  <div>
                    <Label>Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.order || index + 1}
                      onChange={(e) => patchItem(index, { order: Number(e.target.value || index + 1) })}
                    />
                  </div>
                  <div>
                    <Label>Fit</Label>
                    <Input
                      value={item.objectFit || "cover"}
                      onChange={(e) => patchItem(index, { objectFit: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {renderActionEditor(item, index)}

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Visible</p>
                  <p className="text-xs text-muted-foreground">Hide without deleting</p>
                </div>
                <Switch
                  checked={item.visible ?? true}
                  onCheckedChange={(checked) => patchItem(index, { visible: checked })}
                />
              </div>

              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderSocialProofEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Columns</Label>
          <Select value={String(content.columns || 3)} onValueChange={(v) => patchContent("columns", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Alignment</Label>
          <Select value={String(content.alignment || "center")} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Proof items</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-4 w-4" /> Add item</Button>
      </div>
      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem key={`sp-${index}`} value={`sp-${index}`} className="rounded-md border border-border px-3">
            <AccordionTrigger className="py-3 text-left text-sm">{item.label || `Item ${index + 1}`}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Label</Label><Input value={item.label || ""} onChange={(e) => patchItem(index, { label: e.target.value })} /></div>
                <div><Label>Value</Label><Input value={item.value || ""} onChange={(e) => patchItem(index, { value: e.target.value })} /></div>
              </div>
              <div><Label>Icon</Label>
                <Select value={item.icon || "Star"} onValueChange={(v) => patchItem(index, { icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <p className="text-sm font-medium">Visible</p>
                <Switch checked={item.visible ?? true} onCheckedChange={(c) => patchItem(index, { visible: c })} />
              </div>
              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderTestimonialsEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Columns</Label>
          <Select value={String(content.columns || 2)} onValueChange={(v) => patchContent("columns", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Alignment</Label>
          <Select value={String(content.alignment || "center")} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Testimonials</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>
      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem key={`test-${index}`} value={`test-${index}`} className="rounded-md border border-border px-3">
            <AccordionTrigger className="py-3 text-left text-sm">{item.name || `Testimonial ${index + 1}`}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Name</Label><Input value={item.name || ""} onChange={(e) => patchItem(index, { name: e.target.value })} /></div>
                <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={item.rating || 5} onChange={(e) => patchItem(index, { rating: e.target.value })} /></div>
              </div>
              <div><Label>Quote</Label><Textarea value={item.quote || ""} onChange={(e) => patchItem(index, { quote: e.target.value })} rows={3} /></div>
              <div><Label>Avatar URL</Label><Input value={item.avatar || ""} onChange={(e) => patchItem(index, { avatar: e.target.value })} placeholder="https://..." /></div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <p className="text-sm font-medium">Visible</p>
                <Switch checked={item.visible ?? true} onCheckedChange={(c) => patchItem(index, { visible: c })} />
              </div>
              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderGalleryEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Columns</Label>
          <Select value={String(content.columns || 3)} onValueChange={(v) => patchContent("columns", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Alignment</Label>
          <Select value={String(content.alignment || "center")} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Images</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-4 w-4" /> Add image</Button>
      </div>
      <Accordion type="multiple" className="space-y-2">
        {repeaterItems.map((item, index) => (
          <AccordionItem key={`gal-${index}`} value={`gal-${index}`} className="rounded-md border border-border px-3">
            <AccordionTrigger className="py-3 text-left text-sm">{item.caption || `Image ${index + 1}`}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              <div><Label>Image URL</Label><Input value={item.url || ""} onChange={(e) => patchItem(index, { url: e.target.value })} placeholder="https://..." /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Caption</Label><Input value={item.caption || ""} onChange={(e) => patchItem(index, { caption: e.target.value })} /></div>
                <div><Label>Alt text</Label><Input value={item.alt || ""} onChange={(e) => patchItem(index, { alt: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <p className="text-sm font-medium">Visible</p>
                <Switch checked={item.visible ?? true} onCheckedChange={(c) => patchItem(index, { visible: c })} />
              </div>
              {renderMoveDeleteRow(index)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  const renderHeroEditor = () => (
    <div className="space-y-3">
      <div><Label>Eyebrow text</Label><Input value={content.eyebrow || ""} onChange={(e) => patchContent("eyebrow", e.target.value)} /></div>
      <div><Label>Heading</Label><Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} /></div>
      <div><Label>Subheading</Label><Textarea value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} rows={3} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Primary button text</Label><Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} /></div>
        <div><Label>Primary button link</Label><Input value={content.button_link || ""} onChange={(e) => patchContent("button_link", e.target.value)} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Secondary button text</Label><Input value={content.secondary_button_text || ""} onChange={(e) => patchContent("secondary_button_text", e.target.value)} /></div>
        <div><Label>Secondary button link</Label><Input value={content.secondary_button_link || ""} onChange={(e) => patchContent("secondary_button_link", e.target.value)} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Alignment</Label>
          <Select value={content.alignment || "left"} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Icon</Label>
          <Select value={content.icon || "Printer"} onValueChange={(v) => patchContent("icon", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Background image URL</Label><Input value={content.bg_image || ""} onChange={(e) => patchContent("bg_image", e.target.value)} placeholder="https://..." /></div>
    </div>
  );

  const renderCtaEditor = () => (
    <div className="space-y-3">
      <div><Label>Heading</Label><Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} /></div>
      <div><Label>Subheading</Label><Textarea value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} rows={3} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Button text</Label><Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} /></div>
        <div><Label>Button link</Label><Input value={content.button_link || ""} onChange={(e) => patchContent("button_link", e.target.value)} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Alignment</Label>
          <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Icon</Label>
          <Select value={content.icon || ""} onValueChange={(v) => patchContent("icon", v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent><SelectItem value="">None</SelectItem>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Background image URL</Label><Input value={content.bg_image || ""} onChange={(e) => patchContent("bg_image", e.target.value)} placeholder="https://..." /></div>
    </div>
  );

  const renderVideoEditor = () => (
    <div className="space-y-3">
      <div><Label>Video URL</Label><Input value={content.video_url || ""} onChange={(e) => patchContent("video_url", e.target.value)} placeholder="YouTube, Vimeo, or direct video URL" /></div>
      <div><Label>Caption</Label><Input value={content.caption || ""} onChange={(e) => patchContent("caption", e.target.value)} /></div>
      <div><Label>Poster image URL</Label><Input value={content.poster_image || ""} onChange={(e) => patchContent("poster_image", e.target.value)} placeholder="https://..." /></div>
    </div>
  );

  const renderNewsletterEditor = () => (
    <div className="space-y-3">
      <div><Label>Heading</Label><Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} /></div>
      <div><Label>Subheading</Label><Textarea value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} rows={3} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Submit button text</Label><Input value={content.submit_text || ""} onChange={(e) => patchContent("submit_text", e.target.value)} /></div>
        <div><Label>Placeholder text</Label><Input value={content.placeholder_text || ""} onChange={(e) => patchContent("placeholder_text", e.target.value)} /></div>
      </div>
      <div><Label>Alignment</Label>
        <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderFeaturedProductsEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Product limit</Label>
          <Select value={String(content.limit || 8)} onValueChange={(v) => patchContent("limit", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="4">4</SelectItem><SelectItem value="6">6</SelectItem><SelectItem value="8">8</SelectItem><SelectItem value="12">12</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Grid columns</Label>
          <Select value={String(content.tileGridColumns || 4)} onValueChange={(v) => patchContent("tileGridColumns", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem><SelectItem value="5">5</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Layout mode</Label>
          <Select value={content.tileLayoutMode || "grid"} onValueChange={(v) => patchContent("tileLayoutMode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="carousel">Carousel</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Alignment</Label>
          <Select value={content.alignment || "left"} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>View all text</Label><Input value={content.view_all_text || ""} onChange={(e) => patchContent("view_all_text", e.target.value)} /></div>
        <div><Label>View all link</Label><Input value={content.view_all_link || ""} onChange={(e) => patchContent("view_all_link", e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div><p className="text-sm font-medium">Show title</p></div>
        <Switch checked={content.tileShowTitle !== false} onCheckedChange={(c) => patchContent("tileShowTitle", c)} />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div><p className="text-sm font-medium">Show subtitle</p></div>
        <Switch checked={content.tileShowSubtitle !== false} onCheckedChange={(c) => patchContent("tileShowSubtitle", c)} />
      </div>
    </div>
  );

  const renderCategoriesEditor = () => (
    <div className="space-y-3">
      {renderSectionTop(true)}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Category limit</Label>
          <Select value={String(content.limit || 6)} onValueChange={(v) => patchContent("limit", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem><SelectItem value="6">6</SelectItem><SelectItem value="8">8</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Grid columns</Label>
          <Select value={String(content.tileGridColumns || 3)} onValueChange={(v) => patchContent("tileGridColumns", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem><SelectItem value="5">5</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Layout mode</Label>
          <Select value={content.tileLayoutMode || "grid"} onValueChange={(v) => patchContent("tileLayoutMode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="carousel">Carousel</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Alignment</Label>
          <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div><p className="text-sm font-medium">Show title</p></div>
        <Switch checked={content.tileShowTitle !== false} onCheckedChange={(c) => patchContent("tileShowTitle", c)} />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div><p className="text-sm font-medium">Show subtitle</p></div>
        <Switch checked={content.tileShowSubtitle !== false} onCheckedChange={(c) => patchContent("tileShowSubtitle", c)} />
      </div>
    </div>
  );

  const renderCountdownEditor = () => (
    <div className="space-y-3">
      <div><Label>Heading</Label><Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} /></div>
      <div><Label>Subheading</Label><Textarea value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} rows={2} /></div>
      <div><Label>Target date (ISO format)</Label><Input type="datetime-local" value={content.target_date ? content.target_date.substring(0, 16) : ""} onChange={(e) => patchContent("target_date", new Date(e.target.value).toISOString())} /></div>
      <div><Label>Expired text</Label><Input value={content.expired_text || ""} onChange={(e) => patchContent("expired_text", e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Button text</Label><Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} /></div>
        <div><Label>Button link</Label><Input value={content.button_link || ""} onChange={(e) => patchContent("button_link", e.target.value)} /></div>
      </div>
      <div><Label>Alignment</Label>
        <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderDividerEditor = () => (
    <div className="space-y-3">
      <div><Label>Style</Label>
        <Select value={content.style || "line"} onValueChange={(v) => patchContent("style", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="line">Line</SelectItem><SelectItem value="dots">Dots</SelectItem><SelectItem value="gradient">Gradient</SelectItem><SelectItem value="space">Space Only</SelectItem></SelectContent>
        </Select>
      </div>
      <div><Label>Height (px)</Label><Input type="number" min={8} max={200} value={content.height || 40} onChange={(e) => patchContent("height", Number(e.target.value))} /></div>
    </div>
  );

  const renderRecentlyViewedEditor = () => (
    <div className="space-y-3">
      <div><Label>Heading</Label><Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} /></div>
      <div><Label>Subheading</Label><Input value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Max items</Label>
          <Select value={String(content.maxItems || 4)} onValueChange={(v) => patchContent("maxItems", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="4">4</SelectItem><SelectItem value="6">6</SelectItem><SelectItem value="8">8</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Columns</Label>
          <Select value={String(content.columns || 4)} onValueChange={(v) => patchContent("columns", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderGiftFinderEditor = () => (
    <div className="space-y-3">
      <div><Label>Heading</Label><Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} /></div>
      <div><Label>Subheading</Label><Textarea value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} rows={2} /></div>
      <div><Label>Button text</Label><Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} /></div>
      <div><Label>Alignment</Label>
        <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">Gift finder tags are managed in the admin Gift Finder Tags settings. This block automatically displays all active tags.</p>
    </div>
  );

  const renderGenericEditor = () => (
    <div className="space-y-4">
      {Object.entries(content).map(([key, value]) => {
        if (Array.isArray(value)) return null;
        if (typeof value === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</p>
              </div>
              <Switch checked={value} onCheckedChange={(checked) => patchContent(key, checked)} />
            </div>
          );
        }
        if (typeof value === "string" && value.length > 100) {
          return (
            <div key={key}>
              <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
              <Textarea value={value} onChange={(e) => patchContent(key, e.target.value)} rows={4} />
            </div>
          );
        }
        return (
          <div key={key}>
            <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
            <Input value={String(value ?? "")} onChange={(e) => patchContent(key, e.target.value)} />
          </div>
        );
      })}
    </div>
  );

  if (!block) return null;

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display uppercase tracking-wider">
            Edit {block.block_type.replace(/_/g, " ")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Block title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Block visible</p>
                <p className="text-xs text-muted-foreground">Turn the whole block on or off</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {block.block_type === "faq" && renderFaqEditor()}
          {block.block_type === "how_it_works" && renderHowItWorksEditor()}
          {block.block_type === "trust_badges" && renderTrustBadgesEditor()}
          {block.block_type === "entry_cards" && renderEntryCardsEditor()}
          {block.block_type === "image" && renderImageCollectionEditor("image")}
          {block.block_type === "carousel" && renderImageCollectionEditor("carousel")}
          {block.block_type === "social_proof" && renderSocialProofEditor()}
          {block.block_type === "testimonials" && renderTestimonialsEditor()}
          {block.block_type === "gallery" && renderGalleryEditor()}
          {block.block_type === "hero" && renderHeroEditor()}
          {block.block_type === "cta" && renderCtaEditor()}
          {block.block_type === "video" && renderVideoEditor()}
          {block.block_type === "newsletter" && renderNewsletterEditor()}
          {block.block_type === "featured_products" && renderFeaturedProductsEditor()}
          {block.block_type === "categories" && renderCategoriesEditor()}
          {block.block_type === "countdown" && renderCountdownEditor()}
          {block.block_type === "divider" && renderDividerEditor()}
          {block.block_type === "recently_viewed" && renderRecentlyViewedEditor()}
          {block.block_type === "gift_finder" && renderGiftFinderEditor()}
          {!["faq", "how_it_works", "trust_badges", "entry_cards", "image", "carousel",
            "social_proof", "testimonials", "gallery", "hero", "cta", "video", "newsletter",
            "featured_products", "categories", "countdown", "divider", "recently_viewed", "gift_finder"
          ].includes(block.block_type) && renderGenericEditor()}

          <div className="flex gap-2 pt-2">
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
