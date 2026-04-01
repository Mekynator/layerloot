import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ArrowUp, ArrowDown, X, Palette, Type, Settings2, Layers } from "lucide-react";
import { useVisualEditor } from "@/contexts/VisualEditorContext";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

const ICON_OPTIONS = [
  "Truck", "Shield", "Star", "ShoppingBag", "Palette", "Upload", "Package",
  "HelpCircle", "Gift", "Heart", "Sparkles", "BadgeCheck", "Printer", "Box",
  "Mail", "ExternalLink", "CheckCircle2", "Gem", "Wrench", "Home", "Instagram",
];

type ActionType = "none" | "internal_link" | "external_link";

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
  const { selectedBlock, selectedBlockId, selectBlock, updateBlockContent, updateBlockMeta, pages } = useVisualEditor();

  if (!selectedBlock) {
    return (
      <div className="flex h-full flex-col border-l border-border/30 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">Settings</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-xs text-muted-foreground">Select a block to edit its settings</p>
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

  // Debounced update to context
  const commitContent = useCallback((next: Record<string, any>) => {
    setLocalContent(next);
    updateBlockContent(block.id, next);
  }, [block.id, updateBlockContent]);

  const patchContent = useCallback((key: string, value: any) => {
    const next = { ...localContent, [key]: value };
    commitContent(next);
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
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1 gap-1 text-[10px]">
                <Type className="h-3 w-3" /> Content
              </TabsTrigger>
              <TabsTrigger value="style" className="flex-1 gap-1 text-[10px]">
                <Palette className="h-3 w-3" /> Style
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 gap-1 text-[10px]">
                <Layers className="h-3 w-3" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-3 mt-3">
              {/* Block title */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Block Label</Label>
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>

              {/* Content fields based on block type */}
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
              <StyleEditor content={localContent} patchContent={patchContent} />
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
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

// Content editor for different block types
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
  // Section heading/subheading (common)
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
              <Label className="text-[10px]">Icon</Label>
              <Select value={content.icon || ""} onValueChange={(v) => patchContent("icon", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                </SelectContent>
              </Select>
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
                        </SelectContent>
                      </Select>
                      {btn.actionType !== "none" && (
                        <Input value={btn.actionTarget || ""} onChange={(e) => {
                          const buttons = [...content.buttons];
                          buttons[i] = { ...buttons[i], actionTarget: e.target.value };
                          patchContent("buttons", buttons);
                        }} className="h-7 text-xs" placeholder={btn.actionType === "external_link" ? "https://..." : "/page"} />
                      )}
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
            <div>
              <Label className="text-[10px]">Badge</Label>
              <Input value={content.badge || ""} onChange={(e) => patchContent("badge", e.target.value)} className="h-8 text-xs" />
            </div>
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
        </div>
      );

    case "spacer":
      return (
        <div>
          <Label className="text-[10px]">Height (px)</Label>
          <Input type="number" value={content.height || 40} onChange={(e) => patchContent("height", Number(e.target.value))} className="h-8 text-xs" />
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
            <Input value={content.embed_url || ""} onChange={(e) => patchContent("embed_url", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-[10px]">Height (px)</Label>
            <Input type="number" value={content.height || 400} onChange={(e) => patchContent("height", Number(e.target.value))} className="h-8 text-xs" />
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
                  <Input value={item.link || item.actionTarget || ""} onChange={(e) => patchItem(index, { link: e.target.value, actionType: "internal_link", actionTarget: e.target.value })} className="h-7 text-xs" placeholder="/page-link" />
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

    default:
      // Generic editor for unknown block types
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

// Style editor
function StyleEditor({ content, patchContent }: { content: Record<string, any>; patchContent: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px]">Background Color</Label>
        <Input value={content.backgroundColor || content.bg_color || ""} onChange={(e) => patchContent("backgroundColor", e.target.value)} className="h-8 text-xs" placeholder="#000000 or hsl(...)" />
      </div>
      <div>
        <Label className="text-[10px]">Text Color</Label>
        <Input value={content.textColor || content.text_color || ""} onChange={(e) => patchContent("textColor", e.target.value)} className="h-8 text-xs" placeholder="#ffffff or hsl(...)" />
      </div>
      <div>
        <Label className="text-[10px]">Background Image</Label>
        <Input value={content.backgroundImage || content.bg_image || ""} onChange={(e) => patchContent("backgroundImage", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Padding Top (px)</Label>
          <Input type="number" value={content.paddingTop ?? ""} onChange={(e) => patchContent("paddingTop", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-[10px]">Padding Bottom (px)</Label>
          <Input type="number" value={content.paddingBottom ?? ""} onChange={(e) => patchContent("paddingBottom", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Margin Top (px)</Label>
          <Input type="number" value={content.marginTop ?? ""} onChange={(e) => patchContent("marginTop", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-[10px]">Margin Bottom (px)</Label>
          <Input type="number" value={content.marginBottom ?? ""} onChange={(e) => patchContent("marginBottom", e.target.value ? Number(e.target.value) : undefined)} className="h-8 text-xs" />
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Custom CSS Class</Label>
        <Input value={content.customClassName || content.className || ""} onChange={(e) => patchContent("customClassName", e.target.value)} className="h-8 text-xs" />
      </div>
    </div>
  );
}
