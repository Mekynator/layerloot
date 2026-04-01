import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ArrowUp, ArrowDown, X, Palette, Type, Settings2, Layers, Sparkles, Monitor, Tablet, Smartphone } from "lucide-react";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

const ICON_OPTIONS = [
  "Truck", "Shield", "Star", "ShoppingBag", "Palette", "Upload", "Package",
  "HelpCircle", "Gift", "Heart", "Sparkles", "BadgeCheck", "Printer", "Box",
  "Mail", "ExternalLink", "CheckCircle2", "Gem", "Wrench", "Home", "Instagram",
];

const getRepeaterKey = (blockType?: string) => {
  switch (blockType) {
    case "faq": return "items";
    case "how_it_works": return "steps";
    case "trust_badges": return "badges";
    case "entry_cards": return "cards";
    case "image": return "items";
    case "carousel": return "slides";
    default: return null;
  }
};

export default function SettingsPanel() {
  const { selectedBlock, selectedBlockId, selectBlock } = useVisualEditor();

  if (!selectedBlock) {
    return (
      <div className="flex h-full flex-col border-l border-border/30 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">Settings</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Settings2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">Select a block to edit</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">Click any section on the canvas</p>
          </div>
        </div>
      </div>
    );
  }

  return <BlockSettings key={selectedBlockId} block={selectedBlock} />;
}

function BlockSettings({ block }: { block: SiteBlock }) {
  const { updateBlockContent, updateBlockMeta, selectBlock } = useVisualEditor();

  const content = useMemo(() => {
    const raw = typeof block.content === "object" && block.content ? { ...(block.content as Record<string, any>) } : {};
    const repeaterKey = getRepeaterKey(block.block_type);
    if (repeaterKey && !Array.isArray(raw[repeaterKey])) {
      raw[repeaterKey] = [];
    }
    return raw;
  }, [block]);

  const [localContent, setLocalContent] = useState<Record<string, any>>(content);
  const [title, setTitle] = useState(block.title || "");
  const [isActive, setIsActive] = useState(block.is_active ?? true);

  useEffect(() => {
    setLocalContent(content);
    setTitle(block.title || "");
    setIsActive(block.is_active ?? true);
  }, [block.id]);

  const repeaterKey = getRepeaterKey(block.block_type);
  const repeaterItems = repeaterKey ? (Array.isArray(localContent[repeaterKey]) ? localContent[repeaterKey] : []) : [];

  const commitContent = useCallback((next: Record<string, any>) => {
    setLocalContent(next);
    updateBlockContent(block.id, next);
  }, [block.id, updateBlockContent]);

  const patchContent = useCallback((key: string, value: any) => {
    commitContent({ ...localContent, [key]: value });
  }, [localContent, commitContent]);

  const patchItem = useCallback((index: number, patch: Record<string, any>) => {
    if (!repeaterKey) return;
    const items = Array.isArray(localContent[repeaterKey]) ? [...localContent[repeaterKey]] : [];
    items[index] = { ...items[index], ...patch };
    commitContent({ ...localContent, [repeaterKey]: items });
  }, [localContent, repeaterKey, commitContent]);

  const addItem = useCallback(() => {
    if (!repeaterKey) return;
    const items = Array.isArray(localContent[repeaterKey]) ? [...localContent[repeaterKey]] : [];
    const template: Record<string, any> = block.block_type === "faq"
      ? { question: "New question", answer: "Answer here", visible: true }
      : block.block_type === "how_it_works"
        ? { icon: "Star", title: "New Step", desc: "Description", visible: true }
        : block.block_type === "trust_badges"
          ? { icon: "Star", title: "New Badge", desc: "Description", visible: true }
          : block.block_type === "entry_cards"
            ? { icon: "Star", title: "New Card", desc: "Description", cta: "Learn More", visible: true }
            : { title: "New Item", visible: true };
    items.push({ ...template, order: items.length + 1 });
    commitContent({ ...localContent, [repeaterKey]: items });
  }, [localContent, repeaterKey, block.block_type, commitContent]);

  const removeItem = useCallback((index: number) => {
    if (!repeaterKey) return;
    const items = [...(localContent[repeaterKey] || [])];
    items.splice(index, 1);
    commitContent({ ...localContent, [repeaterKey]: items.map((item: any, i: number) => ({ ...item, order: i + 1 })) });
  }, [localContent, repeaterKey, commitContent]);

  const moveItem = useCallback((index: number, dir: -1 | 1) => {
    if (!repeaterKey) return;
    const items = [...(localContent[repeaterKey] || [])];
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    commitContent({ ...localContent, [repeaterKey]: items.map((item: any, i: number) => ({ ...item, order: i + 1 })) });
  }, [localContent, repeaterKey, commitContent]);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    updateBlockMeta(block.id, { title: value });
  }, [block.id, updateBlockMeta]);

  const handleActiveChange = useCallback((value: boolean) => {
    setIsActive(value);
    updateBlockMeta(block.id, { is_active: value });
  }, [block.id, updateBlockMeta]);

  return (
    <div className="flex h-full flex-col border-l border-border/30 bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">
            {block.block_type.replace(/_/g, " ")}
          </span>
        </div>
        <button onClick={() => selectBlock(null)} className="rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="content" className="gap-1 text-[10px]">
                <Type className="h-3 w-3" /> Content
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-1 text-[10px]">
                <Palette className="h-3 w-3" /> Style
              </TabsTrigger>
              <TabsTrigger value="responsive" className="gap-1 text-[10px]">
                <Monitor className="h-3 w-3" /> Device
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-[10px]">
                <Layers className="h-3 w-3" /> More
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-3 mt-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Block Label</Label>
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
              <ContentEditor
                blockType={block.block_type}
                content={localContent}
                patchContent={patchContent}
                repeaterItems={repeaterItems}
                patchItem={patchItem}
                addItem={addItem}
                removeItem={removeItem}
                moveItem={moveItem}
              />
            </TabsContent>

            <TabsContent value="style" className="space-y-3 mt-3">
              <AdvancedStyleEditor content={localContent} patchContent={patchContent} />
            </TabsContent>

            <TabsContent value="responsive" className="space-y-3 mt-3">
              <ResponsiveEditor content={localContent} patchContent={patchContent} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-3 mt-3">
              <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-foreground">Visible</p>
                  <p className="text-[10px] text-muted-foreground">Show on live site</p>
                </div>
                <Switch checked={isActive} onCheckedChange={handleActiveChange} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-foreground">Section Visible</p>
                  <p className="text-[10px] text-muted-foreground">Content-level visibility</p>
                </div>
                <Switch
                  checked={localContent.visibility !== false}
                  onCheckedChange={(checked) => patchContent("visibility", checked)}
                />
              </div>

              {/* Animation */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Animation</Label>
                <Select value={localContent.animation || "none"} onValueChange={(v) => patchContent("animation", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fadeUp">Fade Up</SelectItem>
                    <SelectItem value="fadeIn">Fade In</SelectItem>
                    <SelectItem value="slideLeft">Slide Left</SelectItem>
                    <SelectItem value="slideRight">Slide Right</SelectItem>
                    <SelectItem value="scaleIn">Scale In</SelectItem>
                    <SelectItem value="blur">Blur In</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Anchor ID */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Anchor ID</Label>
                <Input
                  value={localContent.anchorId || ""}
                  onChange={(e) => patchContent("anchorId", e.target.value)}
                  className="h-8 text-xs" placeholder="e.g. about-section"
                />
                <p className="mt-0.5 text-[9px] text-muted-foreground">For scroll-to links: #about-section</p>
              </div>

              {/* Custom CSS class */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custom CSS Class</Label>
                <Input
                  value={localContent.customClassName || ""}
                  onChange={(e) => patchContent("customClassName", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Content Editor ──────────────────────────────────────────────
function ContentEditor({
  blockType, content, patchContent,
  repeaterItems, patchItem, addItem, removeItem, moveItem,
}: {
  blockType: string;
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
  repeaterItems: any[];
  patchItem: (index: number, patch: Record<string, any>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  moveItem: (index: number, dir: -1 | 1) => void;
}) {
  const renderSectionTop = () => (
    <div className="space-y-2">
      {(content.heading !== undefined || ["categories", "featured_products", "how_it_works", "faq", "trust_badges", "entry_cards"].includes(blockType)) && (
        <div>
          <Label className="text-[10px]">Heading</Label>
          <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
        </div>
      )}
      {(content.subheading !== undefined || ["categories", "featured_products", "how_it_works", "entry_cards"].includes(blockType)) && (
        <div>
          <Label className="text-[10px]">Subheading</Label>
          <Input value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} className="h-8 text-xs" />
        </div>
      )}
    </div>
  );

  const renderRepeaterControls = (label: string) => (
    <div className="flex items-center justify-between">
      <Label className="text-[10px] uppercase tracking-wider">{label}</Label>
      <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-6 gap-1 text-[10px]">
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
  );

  const renderItemControls = (index: number) => (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0} className="h-6 text-[10px]">
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => moveItem(index, 1)} disabled={index === repeaterItems.length - 1} className="h-6 text-[10px]">
        <ArrowDown className="h-3 w-3" />
      </Button>
      <Button variant="destructive" size="sm" onClick={() => removeItem(index)} className="ml-auto h-6 text-[10px]">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  switch (blockType) {
    case "hero":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-[10px]">Eyebrow</Label>
            <Input value={content.eyebrow || ""} onChange={(e) => patchContent("eyebrow", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Heading</Label>
            <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Subheading</Label>
            <Textarea value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} rows={3} className="text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Background Image URL</Label>
            <Input value={content.bg_image || ""} onChange={(e) => patchContent("bg_image", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Alignment</Label>
              <Select value={content.alignment || "left"} onValueChange={(v) => patchContent("alignment", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Overlay</Label>
              <Slider
                value={[content.overlayOpacity ?? 50]}
                onValueChange={([v]) => patchContent("overlayOpacity", v)}
                min={0} max={100} step={5}
                className="mt-2"
              />
            </div>
          </div>

          {/* Buttons */}
          {Array.isArray(content.buttons) && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider">Buttons</Label>
              <Accordion type="multiple" className="space-y-1">
                {content.buttons.map((btn: any, i: number) => (
                  <AccordionItem key={i} value={`btn-${i}`} className="rounded-md border border-border/30 px-2">
                    <AccordionTrigger className="py-2 text-[11px]">{btn.text || `Button ${i + 1}`}</AccordionTrigger>
                    <AccordionContent className="space-y-2 pb-2">
                      <Input value={btn.text || ""} onChange={(e) => {
                        const buttons = [...content.buttons];
                        buttons[i] = { ...buttons[i], text: e.target.value };
                        patchContent("buttons", buttons);
                      }} className="h-7 text-xs" placeholder="Button text" />
                      <Select value={btn.actionType || "none"} onValueChange={(v) => {
                        const buttons = [...content.buttons];
                        buttons[i] = { ...buttons[i], actionType: v };
                        patchContent("buttons", buttons);
                      }}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No action</SelectItem>
                          <SelectItem value="internal_link">Internal page</SelectItem>
                          <SelectItem value="external_link">External URL</SelectItem>
                          <SelectItem value="scroll_to">Scroll to section</SelectItem>
                        </SelectContent>
                      </Select>
                      {btn.actionType && btn.actionType !== "none" && (
                        <Input value={btn.actionTarget || ""} onChange={(e) => {
                          const buttons = [...content.buttons];
                          buttons[i] = { ...buttons[i], actionTarget: e.target.value };
                          patchContent("buttons", buttons);
                        }} className="h-7 text-xs" placeholder={btn.actionType === "external_link" ? "https://..." : btn.actionType === "scroll_to" ? "#section-id" : "/page"} />
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={btn.variant || "default"} onValueChange={(v) => {
                          const buttons = [...content.buttons];
                          buttons[i] = { ...buttons[i], variant: v };
                          patchContent("buttons", buttons);
                        }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Primary</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={btn.icon || ""} onValueChange={(v) => {
                          const buttons = [...content.buttons];
                          buttons[i] = { ...buttons[i], icon: v };
                          patchContent("buttons", buttons);
                        }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Icon" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {ICON_OPTIONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      );

    case "shipping_banner":
    case "banner":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Text</Label>
            <Input value={content.text || content.heading || ""} onChange={(e) => patchContent(content.text !== undefined ? "text" : "heading", e.target.value)} className="h-8 text-xs" />
          </div>
          {blockType === "banner" && (
            <>
              <div>
                <Label className="text-[10px]">Badge</Label>
                <Input value={content.badge || ""} onChange={(e) => patchContent("badge", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Button Text</Label>
                <Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Button Link</Label>
                <Input value={content.button_link || ""} onChange={(e) => patchContent("button_link", e.target.value)} className="h-8 text-xs" />
              </div>
            </>
          )}
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Heading</Label>
            <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Body</Label>
            <Textarea value={content.body || ""} onChange={(e) => patchContent("body", e.target.value)} rows={6} className="text-xs" />
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Heading</Label>
            <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Subheading</Label>
            <Input value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Button Text</Label>
            <Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Button Link</Label>
            <Input value={content.button_link || ""} onChange={(e) => patchContent("button_link", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Background Image</Label>
            <Input value={content.bg_image || ""} onChange={(e) => patchContent("bg_image", e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      );

    case "spacer":
      return (
        <div>
          <Label className="text-[10px]">Height (px)</Label>
          <Slider
            value={[content.height || 40]}
            onValueChange={([v]) => patchContent("height", v)}
            min={8} max={200} step={4}
            className="mt-2"
          />
          <p className="mt-1 text-[10px] text-muted-foreground text-right">{content.height || 40}px</p>
        </div>
      );

    case "html":
      return (
        <div>
          <Label className="text-[10px]">HTML</Label>
          <Textarea value={content.html || ""} onChange={(e) => patchContent("html", e.target.value)} rows={10} className="font-mono text-xs" />
        </div>
      );

    case "embed":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Heading</Label>
            <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Embed URL</Label>
            <Input value={content.embed_url || ""} onChange={(e) => patchContent("embed_url", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Height (px)</Label>
            <Slider value={[content.height || 400]} onValueChange={([v]) => patchContent("height", v)} min={100} max={800} step={20} className="mt-2" />
            <p className="mt-1 text-[10px] text-muted-foreground text-right">{content.height || 400}px</p>
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Heading</Label>
            <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Video URL</Label>
            <Input value={content.video_url || ""} onChange={(e) => patchContent("video_url", e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      );

    case "newsletter":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Heading</Label>
            <Input value={content.heading || ""} onChange={(e) => patchContent("heading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Subheading</Label>
            <Input value={content.subheading || ""} onChange={(e) => patchContent("subheading", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Button Text</Label>
            <Input value={content.button_text || ""} onChange={(e) => patchContent("button_text", e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
      );

    case "categories":
    case "featured_products":
      return (
        <div className="space-y-2">
          {renderSectionTop()}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Limit</Label>
              <Input type="number" value={content.limit || 6} onChange={(e) => patchContent("limit", Number(e.target.value))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Alignment</Label>
              <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          {renderSectionTop()}
          {renderRepeaterControls("FAQ Items")}
          <Accordion type="multiple" className="space-y-1">
            {repeaterItems.map((item: any, index: number) => (
              <AccordionItem key={index} value={`faq-${index}`} className="rounded-md border border-border/30 px-2">
                <AccordionTrigger className="py-2 text-[11px]">{item.question || `Item ${index + 1}`}</AccordionTrigger>
                <AccordionContent className="space-y-2 pb-2">
                  <Input value={item.question || ""} onChange={(e) => patchItem(index, { question: e.target.value })} className="h-7 text-xs" placeholder="Question" />
                  <Textarea value={item.answer || ""} onChange={(e) => patchItem(index, { answer: e.target.value })} rows={3} className="text-xs" placeholder="Answer" />
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Visible</Label>
                    <Switch checked={item.visible !== false} onCheckedChange={(v) => patchItem(index, { visible: v })} />
                  </div>
                  {renderItemControls(index)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    case "how_it_works":
      return (
        <div className="space-y-3">
          {renderSectionTop()}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Columns</Label>
              <Select value={String(content.columns || 4)} onValueChange={(v) => patchContent("columns", Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Alignment</Label>
              <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {renderRepeaterControls("Steps")}
          <Accordion type="multiple" className="space-y-1">
            {repeaterItems.map((item: any, index: number) => (
              <AccordionItem key={index} value={`step-${index}`} className="rounded-md border border-border/30 px-2">
                <AccordionTrigger className="py-2 text-[11px]">{item.title || `Step ${index + 1}`}</AccordionTrigger>
                <AccordionContent className="space-y-2 pb-2">
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} className="h-7 text-xs" placeholder="Title" />
                  <Select value={item.icon || "Star"} onValueChange={(v) => patchItem(index, { icon: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea value={item.desc || ""} onChange={(e) => patchItem(index, { desc: e.target.value })} rows={2} className="text-xs" />
                  {renderItemControls(index)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    case "trust_badges":
      return (
        <div className="space-y-3">
          {renderSectionTop()}
          <div>
            <Label className="text-[10px]">Columns</Label>
            <Select value={String(content.columns || 3)} onValueChange={(v) => patchContent("columns", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderRepeaterControls("Badges")}
          <Accordion type="multiple" className="space-y-1">
            {repeaterItems.map((item: any, index: number) => (
              <AccordionItem key={index} value={`badge-${index}`} className="rounded-md border border-border/30 px-2">
                <AccordionTrigger className="py-2 text-[11px]">{item.title || `Badge ${index + 1}`}</AccordionTrigger>
                <AccordionContent className="space-y-2 pb-2">
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} className="h-7 text-xs" />
                  <Select value={item.icon || "Star"} onValueChange={(v) => patchItem(index, { icon: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={item.desc || ""} onChange={(e) => patchItem(index, { desc: e.target.value })} className="h-7 text-xs" placeholder="Description" />
                  {renderItemControls(index)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    case "entry_cards":
      return (
        <div className="space-y-3">
          {renderSectionTop()}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Columns</Label>
              <Select value={String(content.columns || 3)} onValueChange={(v) => patchContent("columns", Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Alignment</Label>
              <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {renderRepeaterControls("Cards")}
          <Accordion type="multiple" className="space-y-1">
            {repeaterItems.map((item: any, index: number) => (
              <AccordionItem key={index} value={`card-${index}`} className="rounded-md border border-border/30 px-2">
                <AccordionTrigger className="py-2 text-[11px]">{item.title || `Card ${index + 1}`}</AccordionTrigger>
                <AccordionContent className="space-y-2 pb-2">
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} className="h-7 text-xs" placeholder="Title" />
                  <Select value={item.icon || "Star"} onValueChange={(v) => patchItem(index, { icon: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea value={item.desc || ""} onChange={(e) => patchItem(index, { desc: e.target.value })} rows={2} className="text-xs" placeholder="Description" />
                  <Input value={item.cta || ""} onChange={(e) => patchItem(index, { cta: e.target.value })} className="h-7 text-xs" placeholder="Button label" />
                  <Input value={item.link || ""} onChange={(e) => patchItem(index, { link: e.target.value, actionType: "internal_link", actionTarget: e.target.value })} className="h-7 text-xs" placeholder="/page-link" />
                  <Input value={item.image || ""} onChange={(e) => patchItem(index, { image: e.target.value })} className="h-7 text-xs" placeholder="Image URL (optional)" />
                  {renderItemControls(index)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    case "image":
    case "carousel":
      return (
        <div className="space-y-3">
          {renderSectionTop()}
          {blockType === "image" && (
            <div>
              <Label className="text-[10px]">Columns</Label>
              <Select value={String(content.columns || 3)} onValueChange={(v) => patchContent("columns", Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {renderRepeaterControls(blockType === "image" ? "Images" : "Slides")}
          <Accordion type="multiple" className="space-y-1">
            {repeaterItems.map((item: any, index: number) => (
              <AccordionItem key={index} value={`${blockType}-${index}`} className="rounded-md border border-border/30 px-2">
                <AccordionTrigger className="py-2 text-[11px]">{item.title || `${blockType === "image" ? "Image" : "Slide"} ${index + 1}`}</AccordionTrigger>
                <AccordionContent className="space-y-2 pb-2">
                  <Input value={item.image || ""} onChange={(e) => patchItem(index, { image: e.target.value })} className="h-7 text-xs" placeholder="Image URL" />
                  <Input value={item.title || ""} onChange={(e) => patchItem(index, { title: e.target.value })} className="h-7 text-xs" placeholder="Title" />
                  <Input value={item.subtitle || ""} onChange={(e) => patchItem(index, { subtitle: e.target.value })} className="h-7 text-xs" placeholder="Subtitle" />
                  <Input value={item.alt || ""} onChange={(e) => patchItem(index, { alt: e.target.value })} className="h-7 text-xs" placeholder="Alt text" />
                  <Select value={item.objectFit || "cover"} onValueChange={(v) => patchItem(index, { objectFit: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                    </SelectContent>
                  </Select>
                  {renderItemControls(index)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    case "instagram_auto_feed":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Title</Label>
            <Input value={content.title || ""} onChange={(e) => patchContent("title", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Subtitle</Label>
            <Input value={content.subtitle || ""} onChange={(e) => patchContent("subtitle", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Username</Label>
            <Input value={content.instagramUsername || ""} onChange={(e) => patchContent("instagramUsername", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Items to show</Label>
            <Input type="number" value={content.itemsToShow || 10} onChange={(e) => patchContent("itemsToShow", Number(e.target.value))} className="h-8 text-xs" />
          </div>
        </div>
      );

    case "button":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Button Text</Label>
            <Input value={content.text || ""} onChange={(e) => patchContent("text", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Link</Label>
            <Input value={content.link || ""} onChange={(e) => patchContent("link", e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Variant</Label>
            <Select value={content.variant || "default"} onValueChange={(v) => patchContent("variant", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Primary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Alignment</Label>
            <Select value={content.alignment || "center"} onValueChange={(v) => patchContent("alignment", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          {Object.entries(content).map(([key, value]) => {
            if (Array.isArray(value) || typeof value === "object") return null;
            if (typeof value === "boolean") {
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                  <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                  <Switch checked={value} onCheckedChange={(v) => patchContent(key, v)} />
                </div>
              );
            }
            if (typeof value === "string" && value.length > 100) {
              return (
                <div key={key}>
                  <Label className="text-[10px] capitalize">{key.replace(/_/g, " ")}</Label>
                  <Textarea value={String(value)} onChange={(e) => patchContent(key, e.target.value)} rows={4} className="text-xs" />
                </div>
              );
            }
            return (
              <div key={key}>
                <Label className="text-[10px] capitalize">{key.replace(/_/g, " ")}</Label>
                <Input value={String(value ?? "")} onChange={(e) => patchContent(key, e.target.value)} className="h-8 text-xs" />
              </div>
            );
          })}
        </div>
      );
  }
}

// ─── Advanced Style Editor ───────────────────────────────────────
function AdvancedStyleEditor({ content, patchContent }: { content: Record<string, any>; patchContent: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      {/* Colors */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Palette className="h-3 w-3" /> Colors
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Background</Label>
            <div className="flex gap-1">
              <Input value={content.backgroundColor || ""} onChange={(e) => patchContent("backgroundColor", e.target.value)} className="h-8 text-xs flex-1" placeholder="transparent" />
              <input type="color" value={content.backgroundColor || "#000000"} onChange={(e) => patchContent("backgroundColor", e.target.value)} className="h-8 w-8 rounded border border-border/30 cursor-pointer" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Text</Label>
            <div className="flex gap-1">
              <Input value={content.textColor || ""} onChange={(e) => patchContent("textColor", e.target.value)} className="h-8 text-xs flex-1" placeholder="inherit" />
              <input type="color" value={content.textColor || "#ffffff"} onChange={(e) => patchContent("textColor", e.target.value)} className="h-8 w-8 rounded border border-border/30 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div>
        <Label className="text-[10px]">Background Image</Label>
        <Input value={content.backgroundImage || ""} onChange={(e) => patchContent("backgroundImage", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
      </div>

      {/* Spacing */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Padding</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Top</Label>
            <Slider value={[content.paddingTop ?? 0]} onValueChange={([v]) => patchContent("paddingTop", v)} min={0} max={120} step={4} />
            <p className="text-[9px] text-muted-foreground text-right">{content.paddingTop ?? 0}px</p>
          </div>
          <div>
            <Label className="text-[10px]">Bottom</Label>
            <Slider value={[content.paddingBottom ?? 0]} onValueChange={([v]) => patchContent("paddingBottom", v)} min={0} max={120} step={4} />
            <p className="text-[9px] text-muted-foreground text-right">{content.paddingBottom ?? 0}px</p>
          </div>
          <div>
            <Label className="text-[10px]">Left</Label>
            <Slider value={[content.paddingLeft ?? 0]} onValueChange={([v]) => patchContent("paddingLeft", v)} min={0} max={120} step={4} />
            <p className="text-[9px] text-muted-foreground text-right">{content.paddingLeft ?? 0}px</p>
          </div>
          <div>
            <Label className="text-[10px]">Right</Label>
            <Slider value={[content.paddingRight ?? 0]} onValueChange={([v]) => patchContent("paddingRight", v)} min={0} max={120} step={4} />
            <p className="text-[9px] text-muted-foreground text-right">{content.paddingRight ?? 0}px</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Top</Label>
            <Slider value={[content.marginTop ?? 0]} onValueChange={([v]) => patchContent("marginTop", v)} min={0} max={120} step={4} />
            <p className="text-[9px] text-muted-foreground text-right">{content.marginTop ?? 0}px</p>
          </div>
          <div>
            <Label className="text-[10px]">Bottom</Label>
            <Slider value={[content.marginBottom ?? 0]} onValueChange={([v]) => patchContent("marginBottom", v)} min={0} max={120} step={4} />
            <p className="text-[9px] text-muted-foreground text-right">{content.marginBottom ?? 0}px</p>
          </div>
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Border Radius</Label>
        <Slider value={[content.borderRadius ?? 0]} onValueChange={([v]) => patchContent("borderRadius", v)} min={0} max={32} step={2} />
        <p className="text-[9px] text-muted-foreground text-right">{content.borderRadius ?? 0}px</p>
      </div>

      {/* Shadow */}
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Shadow</Label>
        <Select value={content.shadow || "none"} onValueChange={(v) => patchContent("shadow", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
            <SelectItem value="xl">Extra Large</SelectItem>
            <SelectItem value="2xl">2XL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section Width */}
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Section Width</Label>
        <Select value={content.sectionWidth || "default"} onValueChange={(v) => patchContent("sectionWidth", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="narrow">Narrow</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
            <SelectItem value="full">Full Width</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Opacity */}
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Opacity</Label>
        <Slider value={[content.opacity ?? 100]} onValueChange={([v]) => patchContent("opacity", v)} min={0} max={100} step={5} />
        <p className="text-[9px] text-muted-foreground text-right">{content.opacity ?? 100}%</p>
      </div>
    </div>
  );
}

// ─── Responsive Editor ───────────────────────────────────────────
function ResponsiveEditor({ content, patchContent }: { content: Record<string, any>; patchContent: (key: string, value: any) => void }) {
  const responsive = content.responsive || {};

  const patchResponsive = useCallback((device: string, key: string, value: any) => {
    const updated = {
      ...responsive,
      [device]: { ...(responsive[device] || {}), [key]: value },
    };
    patchContent("responsive", updated);
  }, [responsive, patchContent]);

  const devices = [
    { key: "tablet", label: "Tablet", icon: Tablet },
    { key: "mobile", label: "Mobile", icon: Smartphone },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-muted-foreground">
        Override settings per device. Desktop uses default values.
      </p>

      {devices.map(({ key: device, label, icon: Icon }) => (
        <div key={device} className="space-y-2 rounded-lg border border-border/30 p-2">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{label}</span>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Hide on {label}</Label>
            <Switch
              checked={responsive[device]?.hidden ?? false}
              onCheckedChange={(v) => patchResponsive(device, "hidden", v)}
            />
          </div>

          <div>
            <Label className="text-[10px]">Font Scale</Label>
            <Select value={responsive[device]?.fontScale || "default"} onValueChange={(v) => patchResponsive(device, "fontScale", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="0.75">75%</SelectItem>
                <SelectItem value="0.85">85%</SelectItem>
                <SelectItem value="1">100%</SelectItem>
                <SelectItem value="1.15">115%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px]">Alignment</Label>
            <Select value={responsive[device]?.alignment || "default"} onValueChange={(v) => patchResponsive(device, "alignment", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px]">Stack Direction</Label>
            <Select value={responsive[device]?.stack || "default"} onValueChange={(v) => patchResponsive(device, "stack", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="vertical">Vertical (stack)</SelectItem>
                <SelectItem value="horizontal">Horizontal (row)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Padding Top</Label>
              <Input type="number" value={responsive[device]?.paddingTop ?? ""} onChange={(e) => patchResponsive(device, "paddingTop", e.target.value ? Number(e.target.value) : undefined)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Padding Bottom</Label>
              <Input type="number" value={responsive[device]?.paddingBottom ?? ""} onChange={(e) => patchResponsive(device, "paddingBottom", e.target.value ? Number(e.target.value) : undefined)} className="h-7 text-xs" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
