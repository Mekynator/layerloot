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
import { Trash2, Plus, ArrowUp, ArrowDown, X, Palette, Type, Settings2, Layers, Monitor, Tablet, Smartphone, MousePointerClick, Square } from "lucide-react";
import { useVisualEditor, type SelectedElement } from "@/contexts/VisualEditorContext";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import SliderField from "./controls/SliderField";
import TileSectionControls from "./controls/TileSectionControls";
import ColorPickerField from "./controls/ColorPickerField";
import ImageUploadField from "./controls/ImageUploadField";
import IconPickerField from "./controls/IconPickerField";
import TypographyControls from "./controls/TypographyControls";
import BorderControls from "./controls/BorderControls";
import BackgroundSlideshowControls from "./controls/BackgroundSlideshowControls";
import ImageEffectsControls from "./controls/ImageEffectsControls";
import AnimationControls from "./controls/AnimationControls";
import VisualEffectsControls from "./controls/VisualEffectsControls";
import { getBlockSchema, type EditableNode } from "./editable-schema";

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
  const { selectedBlock, selectedBlockId, selectBlock, selectedElement, selectElement } = useVisualEditor();

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

  return <BlockSettings key={selectedBlockId} block={selectedBlock} selectedElement={selectedElement} onSelectElement={selectElement} />;
}

function BlockSettings({ block, selectedElement, onSelectElement }: { block: SiteBlock; selectedElement: SelectedElement | null; onSelectElement: (el: SelectedElement | null) => void }) {
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

  // Typography controls for a specific text element
  const handleTypographyChange = useCallback((elementKey: string, typoKey: string, value: any) => {
    const typoPath = `_typography_${elementKey}`;
    const current = localContent[typoPath] || {};
    patchContent(typoPath, { ...current, [typoKey]: value });
  }, [localContent, patchContent]);

  const getTypography = useCallback((elementKey: string) => {
    return localContent[`_typography_${elementKey}`] || {};
  }, [localContent]);

  // Check if an element is currently selected
  const isElementSelected = selectedElement?.blockId === block.id;
  const selectedNodeKey = isElementSelected ? selectedElement?.nodeKey : null;
  const selectedNodeType = isElementSelected ? selectedElement?.nodeType : null;

  const schema = getBlockSchema(block.block_type);

  return (
    <div className="flex h-full flex-col border-l border-border/30 bg-card/80 backdrop-blur-xl">
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
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="content" className="gap-1 text-[10px]">
                <Type className="h-3 w-3" /> Content
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-1 text-[10px]">
                <Palette className="h-3 w-3" /> Style
              </TabsTrigger>
              <TabsTrigger value="border" className="gap-1 text-[10px]">
                <Square className="h-3 w-3" /> Border
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

              {/* Element-level selection panel */}
              {isElementSelected && selectedNodeKey && selectedNodeType === "text" && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MousePointerClick className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Editing: {schema.nodes.find(n => n.key === selectedNodeKey)?.label || selectedNodeKey}
                      </span>
                    </div>
                    <button onClick={() => onSelectElement(null)} className="text-[9px] text-muted-foreground hover:text-foreground underline">
                      Back to block
                    </button>
                  </div>
                  {/* Element text input */}
                  {schema.nodes.find(n => n.key === selectedNodeKey && n.type === "text") && (
                    <div>
                      <Label className="text-[10px]">Text</Label>
                      {(schema.nodes.find(n => n.key === selectedNodeKey) as any)?.multiline ? (
                        <Textarea
                          value={localContent[selectedNodeKey] || ""}
                          onChange={(e) => patchContent(selectedNodeKey, e.target.value)}
                          rows={4} className="text-xs"
                        />
                      ) : (
                        <Input
                          value={localContent[selectedNodeKey] || ""}
                          onChange={(e) => patchContent(selectedNodeKey, e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  )}
                  {/* Typography controls for the selected text element */}
                  <TypographyControls
                    typography={getTypography(selectedNodeKey)}
                    onChange={(key, val) => handleTypographyChange(selectedNodeKey, key, val)}
                  />
                </div>
              )}

              <ContentEditor
                blockType={block.block_type}
                content={localContent}
                patchContent={patchContent}
                repeaterItems={repeaterItems}
                patchItem={patchItem}
                addItem={addItem}
                removeItem={removeItem}
                moveItem={moveItem}
                onSelectElement={(nodeKey, nodeType) => onSelectElement({ blockId: block.id, nodeKey, nodeType })}
                selectedNodeKey={selectedNodeKey}
              />
            </TabsContent>

            <TabsContent value="style" className="space-y-3 mt-3">
              <AdvancedStyleEditor content={localContent} patchContent={patchContent} />
              <ImageEffectsControls content={localContent} patchContent={patchContent} />
              <BackgroundSlideshowControls content={localContent} patchContent={patchContent} />
              <VisualEffectsControls content={localContent} patchContent={patchContent} />
              {/* Per-element typography when an element is selected */}
              {isElementSelected && selectedNodeKey && selectedNodeType === "text" && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                  <TypographyControls
                    typography={getTypography(selectedNodeKey)}
                    onChange={(key, val) => handleTypographyChange(selectedNodeKey, key, val)}
                    compact
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="border" className="space-y-3 mt-3">
              <BorderControls content={localContent} patchContent={patchContent} />
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

              {/* Animation & Motion Controls */}
              <AnimationControls content={localContent} patchContent={patchContent} />

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Anchor ID</Label>
                <Input
                  value={localContent.anchorId || ""}
                  onChange={(e) => patchContent("anchorId", e.target.value)}
                  className="h-8 text-xs" placeholder="e.g. about-section"
                />
                <p className="mt-0.5 text-[9px] text-muted-foreground">For scroll-to links: #about-section</p>
              </div>

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
  onSelectElement, selectedNodeKey,
}: {
  blockType: string;
  content: Record<string, any>;
  patchContent: (key: string, value: any) => void;
  repeaterItems: any[];
  patchItem: (index: number, patch: Record<string, any>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  moveItem: (index: number, dir: -1 | 1) => void;
  onSelectElement: (nodeKey: string, nodeType: "text" | "icon" | "button" | "media" | "layout") => void;
  selectedNodeKey: string | null;
}) {
  const schema = getBlockSchema(blockType);

  const renderEditableNode = (node: EditableNode) => {
    const isSelected = selectedNodeKey === node.key;
    const wrapperClass = isSelected ? "ring-1 ring-primary/40 rounded-md p-1 bg-primary/5" : "";

    switch (node.type) {
      case "text":
        return (
          <div key={node.key} className={wrapperClass} onClick={() => onSelectElement(node.key, "text")}>
            <Label className="text-[10px] cursor-pointer hover:text-primary transition-colors">{node.label}</Label>
            {node.multiline ? (
              <Textarea
                value={content[node.key] || ""}
                onChange={(e) => patchContent(node.key, e.target.value)}
                rows={3} className="text-xs" placeholder={node.placeholder}
              />
            ) : (
              <Input
                value={content[node.key] || ""}
                onChange={(e) => patchContent(node.key, e.target.value)}
                className="h-8 text-xs" placeholder={node.placeholder}
              />
            )}
          </div>
        );
      case "icon":
        return (
          <div key={node.key} className={wrapperClass}>
            <IconPickerField
              label={node.label}
              value={content[node.key] || ""}
              onChange={(v) => patchContent(node.key, v)}
            />
            {node.sizeKey && (
              <SliderField
                label="Icon Size"
                value={content[node.sizeKey] ?? 24}
                onChange={(v) => patchContent(node.sizeKey!, v)}
                min={12} max={64} step={2}
              />
            )}
            {node.colorKey && (
              <ColorPickerField
                label="Icon Color"
                value={content[node.colorKey] || ""}
                onChange={(v) => patchContent(node.colorKey!, v)}
              />
            )}
          </div>
        );
      case "media":
        return (
          <ImageUploadField
            key={node.key}
            label={node.label}
            value={content[node.key] || ""}
            onChange={(v) => patchContent(node.key, v)}
          />
        );
      case "layout":
        return (
          <div key={node.key}>
            <Label className="text-[10px]">{node.label}</Label>
            <Select value={String(content[node.key] || node.options[0]?.value || "")} onValueChange={(v) => patchContent(node.key, v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {node.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

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

  // Render schema-driven nodes first
  const schemaNodes = schema.nodes.length > 0;

  // Special handling for blocks with buttons array (hero)
  const renderHeroButtons = () => {
    if (blockType !== "hero" || !Array.isArray(content.buttons)) return null;
    return (
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
                  <IconPickerField
                    label=""
                    value={btn.icon || ""}
                    onChange={(v) => {
                      const buttons = [...content.buttons];
                      buttons[i] = { ...buttons[i], icon: v };
                      patchContent("buttons", buttons);
                    }}
                  />
                </div>
                <SliderField
                  label="Border Radius"
                  value={btn.borderRadius ?? 8}
                  onChange={(v) => {
                    const buttons = [...content.buttons];
                    buttons[i] = { ...buttons[i], borderRadius: v };
                    patchContent("buttons", buttons);
                  }}
                  min={0} max={32} step={2}
                />
                <ColorPickerField
                  label="Button Color"
                  value={btn.bgColor || ""}
                  onChange={(v) => {
                    const buttons = [...content.buttons];
                    buttons[i] = { ...buttons[i], bgColor: v };
                    patchContent("buttons", buttons);
                  }}
                />
                <ColorPickerField
                  label="Text Color"
                  value={btn.textColor || ""}
                  onChange={(v) => {
                    const buttons = [...content.buttons];
                    buttons[i] = { ...buttons[i], textColor: v };
                    patchContent("buttons", buttons);
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  };

  // Render repeater items with schema-driven per-item nodes
  const renderSchemaRepeater = () => {
    if (!schema.repeaterKey || !schema.repeaterItemNodes) return null;
    const repeaterLabel = schema.repeaterKey === "items" ? "Items" :
      schema.repeaterKey === "steps" ? "Steps" :
      schema.repeaterKey === "badges" ? "Badges" :
      schema.repeaterKey === "cards" ? "Cards" :
      schema.repeaterKey === "slides" ? "Slides" : "Items";

    return (
      <div className="space-y-2">
        {renderRepeaterControls(repeaterLabel)}
        <Accordion type="multiple" className="space-y-1">
          {repeaterItems.map((item: any, index: number) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-md border border-border/30 px-2">
              <AccordionTrigger className="py-2 text-[11px]">
                {item.title || item.question || item.text || `${repeaterLabel.slice(0, -1)} ${index + 1}`}
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-2">
                {schema.repeaterItemNodes!.map((node) => {
                  switch (node.type) {
                    case "text":
                      return (
                        <div key={node.key}>
                          <Label className="text-[10px]">{node.label}</Label>
                          {node.multiline ? (
                            <Textarea
                              value={item[node.key] || ""}
                              onChange={(e) => patchItem(index, { [node.key]: e.target.value })}
                              rows={2} className="text-xs" placeholder={node.placeholder}
                            />
                          ) : (
                            <Input
                              value={item[node.key] || ""}
                              onChange={(e) => patchItem(index, { [node.key]: e.target.value })}
                              className="h-7 text-xs" placeholder={node.placeholder || node.label}
                            />
                          )}
                        </div>
                      );
                    case "icon":
                      return (
                        <IconPickerField
                          key={node.key}
                          label={node.label}
                          value={item[node.key] || "Star"}
                          onChange={(v) => patchItem(index, { [node.key]: v })}
                        />
                      );
                    case "media":
                      return (
                        <ImageUploadField
                          key={node.key}
                          label={node.label}
                          value={item[node.key] || ""}
                          onChange={(v) => patchItem(index, { [node.key]: v })}
                        />
                      );
                    default:
                      return null;
                  }
                })}
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Visible</Label>
                  <Switch checked={item.visible !== false} onCheckedChange={(v) => patchItem(index, { visible: v })} />
                </div>
                {/* Action/link for items that support it */}
                {(blockType === "entry_cards" || blockType === "how_it_works" || blockType === "trust_badges") && (
                  <div className="space-y-1">
                    <Label className="text-[10px]">Link</Label>
                    <Input
                      value={item.link || item.actionTarget || ""}
                      onChange={(e) => patchItem(index, { link: e.target.value, actionType: e.target.value ? "internal_link" : "none", actionTarget: e.target.value })}
                      className="h-7 text-xs" placeholder="/page-link"
                    />
                  </div>
                )}
                {renderItemControls(index)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  };

  // Use schema-driven approach for all blocks
  if (schemaNodes) {
    return (
      <div className="space-y-3">
        {/* Render top-level editable nodes */}
        {schema.nodes.map(renderEditableNode)}

        {/* Hero-specific buttons */}
        {renderHeroButtons()}

        {/* Overlay opacity for hero */}
        {blockType === "hero" && (
          <SliderField
            label="Overlay Opacity"
            value={content.overlayOpacity ?? 50}
            onChange={(v) => patchContent("overlayOpacity", v)}
            min={0} max={100} step={5} unit="%"
          />
        )}

        {/* Spacer height */}
        {blockType === "spacer" && (
          <SliderField
            label="Height"
            value={content.height || 40}
            onChange={(v) => patchContent("height", v)}
            min={8} max={200} step={4}
          />
        )}

        {/* Embed height */}
        {blockType === "embed" && (
          <SliderField
            label="Height"
            value={content.height || 400}
            onChange={(v) => patchContent("height", v)}
            min={100} max={800} step={20}
          />
        )}

        {/* Limit for categories/featured */}
        {(blockType === "categories" || blockType === "featured_products") && (
          <SliderField
            label="Items to Show"
            value={content.limit || 6}
            onChange={(v) => patchContent("limit", v)}
            min={1} max={24} step={1} unit=""
          />
        )}

        {/* Product source for featured_products */}
        {blockType === "featured_products" && (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground">Product Source</Label>
            <Select value={(content.productSource as string) || "featured"} onValueChange={(v) => patchContent("productSource", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="best_sellers">Best Sellers</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="discounted">Discounted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Category source controls */}
        {blockType === "categories" && (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground">Category Source</Label>
            <Select value={(content.categorySource as string) || "automatic"} onValueChange={(v) => patchContent("categorySource", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic (by sort order)</SelectItem>
                <SelectItem value="manual">Manual Selection</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Hide Empty Categories</Label>
              <Switch checked={content.hideEmpty === true} onCheckedChange={(v) => patchContent("hideEmpty", v)} />
            </div>
          </div>
        )}

        {/* Tile section settings for featured_products and categories */}
        {(blockType === "featured_products" || blockType === "categories") && (
          <TileSectionControls content={content} patchContent={patchContent} />
        )}

        {/* Instagram feed specifics */}
        {blockType === "instagram_auto_feed" && (
          <SliderField
            label="Items to Show"
            value={content.itemsToShow || 10}
            onChange={(v) => patchContent("itemsToShow", v)}
            min={1} max={30} step={1} unit=""
          />
        )}

        {/* Button block specifics */}
        {blockType === "button" && (
          <div className="space-y-2">
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
        )}

        {/* Schema-driven repeater items */}
        {renderSchemaRepeater()}

        {/* Image/carousel special: objectFit in items */}
        {(blockType === "image" || blockType === "carousel") && repeaterItems.length > 0 && (
          <div className="space-y-1">
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
          </div>
        )}
      </div>
    );
  }

  // Fallback for unknown block types - render all content keys
  return (
    <div className="space-y-2">
      {Object.entries(content).map(([key, value]) => {
        if (Array.isArray(value) || typeof value === "object") return null;
        if (key.startsWith("_")) return null;
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
          <ColorPickerField
            label="Background"
            value={content.backgroundColor || ""}
            onChange={(v) => patchContent("backgroundColor", v)}
          />
          <ColorPickerField
            label="Text"
            value={content.textColor || ""}
            onChange={(v) => patchContent("textColor", v)}
          />
        </div>
      </div>

      {/* Background Image */}
      <ImageUploadField
        label="Background Image"
        value={content.backgroundImage || ""}
        onChange={(v) => patchContent("backgroundImage", v)}
      />

      {/* Spacing */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Padding</Label>
        <div className="grid grid-cols-2 gap-2">
          <SliderField label="Top" value={content.paddingTop ?? 0} onChange={(v) => patchContent("paddingTop", v)} min={0} max={120} step={4} />
          <SliderField label="Bottom" value={content.paddingBottom ?? 0} onChange={(v) => patchContent("paddingBottom", v)} min={0} max={120} step={4} />
          <SliderField label="Left" value={content.paddingLeft ?? 0} onChange={(v) => patchContent("paddingLeft", v)} min={0} max={120} step={4} />
          <SliderField label="Right" value={content.paddingRight ?? 0} onChange={(v) => patchContent("paddingRight", v)} min={0} max={120} step={4} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin</Label>
        <div className="grid grid-cols-2 gap-2">
          <SliderField label="Top" value={content.marginTop ?? 0} onChange={(v) => patchContent("marginTop", v)} min={0} max={120} step={4} />
          <SliderField label="Bottom" value={content.marginBottom ?? 0} onChange={(v) => patchContent("marginBottom", v)} min={0} max={120} step={4} />
        </div>
      </div>

      {/* Gap */}
      <SliderField
        label="Content Gap"
        value={content.gap ?? 0}
        onChange={(v) => patchContent("gap", v)}
        min={0} max={60} step={4}
      />

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

      {/* Min Height */}
      <SliderField
        label="Min Height"
        value={content.minHeight ?? 0}
        onChange={(v) => patchContent("minHeight", v)}
        min={0} max={800} step={20}
      />

      {/* Section Opacity */}
      <SliderField
        label="Section Opacity"
        value={content.opacity ?? 100}
        onChange={(v) => patchContent("opacity", v)}
        min={0} max={100} step={5} unit="%"
      />

      {/* Overlay Color + Opacity */}
      <ColorPickerField
        label="Overlay Color"
        value={content.overlayColor || ""}
        onChange={(v) => patchContent("overlayColor", v)}
      />
      {content.overlayColor && (
        <SliderField
          label="Overlay Opacity"
          value={content.overlayOpacity ?? 50}
          onChange={(v) => patchContent("overlayOpacity", v)}
          min={0} max={100} step={5} unit="%"
        />
      )}
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
            <SliderField
              label="Padding Top"
              value={responsive[device]?.paddingTop ?? 0}
              onChange={(v) => patchResponsive(device, "paddingTop", v)}
              min={0} max={80} step={4}
            />
            <SliderField
              label="Padding Bottom"
              value={responsive[device]?.paddingBottom ?? 0}
              onChange={(v) => patchResponsive(device, "paddingBottom", v)}
              min={0} max={80} step={4}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
