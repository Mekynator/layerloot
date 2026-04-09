import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StaticSection } from "@/lib/static-page-sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Settings2, Layers, Monitor, Tablet, Smartphone, MousePointerClick, Square, X } from "lucide-react";
import { useVisualEditor, type SelectedElement } from "@/contexts/VisualEditorContext";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import SliderField from "./controls/SliderField";
import ColorPickerField from "./controls/ColorPickerField";
import ImageUploadField from "./controls/ImageUploadField";
import TypographyControls from "./controls/TypographyControls";
import BorderControls from "./controls/BorderControls";
import BackgroundSlideshowControls from "./controls/BackgroundSlideshowControls";
import ImageEffectsControls from "./controls/ImageEffectsControls";
import AnimationControls from "./controls/AnimationControls";
import VisualEffectsControls from "./controls/VisualEffectsControls";
import { getBlockSchema } from "./editable-schema";
import BlockFieldGroups from "./BlockFieldGroups";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tr } from "@/lib/translate";

const getRepeaterKey = (blockType?: string) => {
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

export default function SettingsPanel() {
  const { selectedBlock, selectedBlockId, selectBlock, selectedElement, selectElement, selectedStatic, selectedStaticId, selectStaticSection, staticSettings, updateStaticSettings } = useVisualEditor();

  if (selectedStatic && selectedStaticId) {
    return <StaticSectionSettings section={selectedStatic} sectionId={selectedStaticId} settings={staticSettings[selectedStaticId] || {}} onUpdate={updateStaticSettings} onClose={() => selectStaticSection(null)} />;
  }

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
  const { updateBlockContent, updateBlockMeta, selectBlock, pages } = useVisualEditor();

  const content = useMemo(() => {
    const raw = typeof block.content === "object" && block.content ? { ...(block.content as Record<string, unknown>) } : {};
    const repeaterKey = getRepeaterKey(block.block_type);
    if (repeaterKey && !Array.isArray(raw[repeaterKey])) {
      raw[repeaterKey] = [];
    }
    return raw as Record<string, unknown>;
  }, [block]);

  const [localContent, setLocalContent] = useState<Record<string, unknown>>(content);
  const [title, setTitle] = useState(typeof block.title === "string" ? block.title : tr(block.title, ""));
  const [isActive, setIsActive] = useState(block.is_active ?? true);

  useEffect(() => {
    setLocalContent(content);
    setTitle(typeof block.title === "string" ? block.title : tr(block.title, ""));
    setIsActive(block.is_active ?? true);
  }, [block.id]);

  const repeaterKey = getRepeaterKey(block.block_type);
  const repeaterItems = repeaterKey ? (Array.isArray(localContent[repeaterKey]) ? localContent[repeaterKey] as Record<string, unknown>[] : []) : [];

  const commitContent = useCallback((next: Record<string, unknown>) => {
    setLocalContent(next);
    updateBlockContent(block.id, next);
  }, [block.id, updateBlockContent]);

  const patchContent = useCallback((key: string, value: unknown) => {
    commitContent({ ...localContent, [key]: value });
  }, [localContent, commitContent]);

  const patchItem = useCallback((index: number, patch: Record<string, unknown>) => {
    if (!repeaterKey) return;
    const items = Array.isArray(localContent[repeaterKey]) ? [...(localContent[repeaterKey] as Record<string, unknown>[])] : [];
    items[index] = { ...items[index], ...patch };
    commitContent({ ...localContent, [repeaterKey]: items });
  }, [localContent, repeaterKey, commitContent]);

  const addItem = useCallback(() => {
    if (!repeaterKey) return;
    const items = Array.isArray(localContent[repeaterKey]) ? [...(localContent[repeaterKey] as Record<string, unknown>[])] : [];
    const template: Record<string, unknown> = block.block_type === "faq"
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
    const items = [...(localContent[repeaterKey] as Record<string, unknown>[] || [])];
    items.splice(index, 1);
    commitContent({ ...localContent, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) });
  }, [localContent, repeaterKey, commitContent]);

  const moveItem = useCallback((index: number, dir: -1 | 1) => {
    if (!repeaterKey) return;
    const items = [...(localContent[repeaterKey] as Record<string, unknown>[] || [])];
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    commitContent({ ...localContent, [repeaterKey]: items.map((item, i) => ({ ...item, order: i + 1 })) });
  }, [localContent, repeaterKey, commitContent]);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    updateBlockMeta(block.id, { title: value });
  }, [block.id, updateBlockMeta]);

  const handleActiveChange = useCallback((value: boolean) => {
    setIsActive(value);
    updateBlockMeta(block.id, { is_active: value });
  }, [block.id, updateBlockMeta]);

  const handleTypographyChange = useCallback((elementKey: string, typoKey: string, value: unknown) => {
    const typoPath = `_typography_${elementKey}`;
    const current = (localContent[typoPath] as Record<string, unknown>) || {};
    patchContent(typoPath, { ...current, [typoKey]: value });
  }, [localContent, patchContent]);

  const getTypography = useCallback((elementKey: string) => {
    return (localContent[`_typography_${elementKey}`] as Record<string, unknown>) || {};
  }, [localContent]);

  const isElementSelected = selectedElement?.blockId === block.id;
  const selectedNodeKey = isElementSelected ? selectedElement?.nodeKey : null;
  const selectedNodeType = isElementSelected ? selectedElement?.nodeType : null;

  const schema = getBlockSchema(block.block_type);

  // Page paths for BlockFieldGroups action editor
  const pageList = useMemo(
    () => pages.map(p => p.full_path || `/${p.slug}`),
    [pages],
  );

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
                  {schema.nodes.find(n => n.key === selectedNodeKey && n.type === "text") && (
                    <div>
                      <Label className="text-[10px]">Text</Label>
                      {(schema.nodes.find(n => n.key === selectedNodeKey) as { multiline?: boolean })?.multiline ? (
                        <Textarea
                          value={String(localContent[selectedNodeKey] || "")}
                          onChange={(e) => patchContent(selectedNodeKey, e.target.value)}
                          rows={4} className="text-xs"
                        />
                      ) : (
                        <Input
                          value={String(localContent[selectedNodeKey] || "")}
                          onChange={(e) => patchContent(selectedNodeKey, e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  )}
                  <TypographyControls
                    typography={getTypography(selectedNodeKey)}
                    onChange={(key, val) => handleTypographyChange(selectedNodeKey, key, val)}
                  />
                </div>
              )}

              {/* Unified BlockFieldGroups — replaces the old per-block ContentEditor */}
              <BlockFieldGroups
                blockType={block.block_type}
                content={localContent}
                patchContent={patchContent}
                repeaterItems={repeaterItems}
                patchItem={patchItem}
                addItem={addItem}
                removeItem={removeItem}
                moveItem={moveItem}
                compact
                pages={pageList}
              />
            </TabsContent>

            <TabsContent value="style" className="space-y-3 mt-3">
              <AdvancedStyleEditor content={localContent} patchContent={patchContent} />
              <ImageEffectsControls content={localContent} patchContent={patchContent} />
              <BackgroundSlideshowControls content={localContent} patchContent={patchContent} />
              <VisualEffectsControls content={localContent} patchContent={patchContent} />
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

              <AnimationControls content={localContent} patchContent={patchContent} />

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Anchor ID</Label>
                <Input
                  value={String(localContent.anchorId || "")}
                  onChange={(e) => patchContent("anchorId", e.target.value)}
                  className="h-8 text-xs" placeholder="e.g. about-section"
                />
                <p className="mt-0.5 text-[9px] text-muted-foreground">For scroll-to links: #about-section</p>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Custom CSS Class</Label>
                <Input
                  value={String(localContent.customClassName || "")}
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

// ─── Advanced Style Editor ───────────────────────────────────────
function AdvancedStyleEditor({ content, patchContent }: { content: Record<string, unknown>; patchContent: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Palette className="h-3 w-3" /> Colors
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <ColorPickerField label="Background" value={String(content.backgroundColor || "")} onChange={(v) => patchContent("backgroundColor", v)} />
          <ColorPickerField label="Text" value={String(content.textColor || "")} onChange={(v) => patchContent("textColor", v)} />
        </div>
      </div>

      <ImageUploadField label="Background Image" value={String(content.backgroundImage || "")} onChange={(v) => patchContent("backgroundImage", v)} />

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Padding</Label>
        <div className="grid grid-cols-2 gap-2">
          <SliderField label="Top" value={(content.paddingTop as number) ?? 0} onChange={(v) => patchContent("paddingTop", v)} min={0} max={120} step={4} />
          <SliderField label="Bottom" value={(content.paddingBottom as number) ?? 0} onChange={(v) => patchContent("paddingBottom", v)} min={0} max={120} step={4} />
          <SliderField label="Left" value={(content.paddingLeft as number) ?? 0} onChange={(v) => patchContent("paddingLeft", v)} min={0} max={120} step={4} />
          <SliderField label="Right" value={(content.paddingRight as number) ?? 0} onChange={(v) => patchContent("paddingRight", v)} min={0} max={120} step={4} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin</Label>
        <div className="grid grid-cols-2 gap-2">
          <SliderField label="Top" value={(content.marginTop as number) ?? 0} onChange={(v) => patchContent("marginTop", v)} min={0} max={120} step={4} />
          <SliderField label="Bottom" value={(content.marginBottom as number) ?? 0} onChange={(v) => patchContent("marginBottom", v)} min={0} max={120} step={4} />
        </div>
      </div>

      <SliderField label="Content Gap" value={(content.gap as number) ?? 0} onChange={(v) => patchContent("gap", v)} min={0} max={60} step={4} />

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Section Width</Label>
        <Select value={String(content.sectionWidth || "default")} onValueChange={(v) => patchContent("sectionWidth", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="narrow">Narrow</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
            <SelectItem value="full">Full Width</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SliderField label="Min Height" value={(content.minHeight as number) ?? 0} onChange={(v) => patchContent("minHeight", v)} min={0} max={800} step={20} />
      <SliderField label="Section Opacity" value={(content.opacity as number) ?? 100} onChange={(v) => patchContent("opacity", v)} min={0} max={100} step={5} unit="%" />

      <ColorPickerField label="Overlay Color" value={String(content.overlayColor || "")} onChange={(v) => patchContent("overlayColor", v)} />
      {content.overlayColor && (
        <SliderField label="Overlay Opacity" value={(content.overlayOpacity as number) ?? 50} onChange={(v) => patchContent("overlayOpacity", v)} min={0} max={100} step={5} unit="%" />
      )}
    </div>
  );
}

// ─── Responsive Editor ───────────────────────────────────────────
function ResponsiveEditor({ content, patchContent }: { content: Record<string, unknown>; patchContent: (key: string, value: unknown) => void }) {
  const responsive = (content.responsive as Record<string, Record<string, unknown>>) || {};

  const patchResponsive = useCallback((device: string, key: string, value: unknown) => {
    const updated = {
      ...responsive,
      [device]: { ...(responsive[device] || {}), [key]: value },
    };
    patchContent("responsive", updated);
  }, [responsive, patchContent]);

  const devices = [
    { key: "tablet", label: "Tablet", icon: Tablet },
    { key: "mobile", label: "Mobile", icon: Smartphone },
  ] as const;

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
              checked={(responsive[device]?.hidden as boolean) ?? false}
              onCheckedChange={(v) => patchResponsive(device, "hidden", v)}
            />
          </div>

          <div>
            <Label className="text-[10px]">Font Scale</Label>
            <Select value={String(responsive[device]?.fontScale || "default")} onValueChange={(v) => patchResponsive(device, "fontScale", v)}>
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
            <Select value={String(responsive[device]?.alignment || "default")} onValueChange={(v) => patchResponsive(device, "alignment", v)}>
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
            <Select value={String(responsive[device]?.stack || "default")} onValueChange={(v) => patchResponsive(device, "stack", v)}>
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
              value={(responsive[device]?.paddingTop as number) ?? 0}
              onChange={(v) => patchResponsive(device, "paddingTop", v)}
              min={0} max={80} step={4}
            />
            <SliderField
              label="Padding Bottom"
              value={(responsive[device]?.paddingBottom as number) ?? 0}
              onChange={(v) => patchResponsive(device, "paddingBottom", v)}
              min={0} max={80} step={4}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Static Section Settings Panel ─── */

function StaticSectionSettings({ section, sectionId, settings, onUpdate, onClose }: {
  section: StaticSection;
  sectionId: string;
  settings: Record<string, unknown>;
  onUpdate: (sectionId: string, key: string, value: unknown) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-l border-border/30 bg-card/80 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">
            {section.label}
          </span>
        </div>
        <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <p className="text-[10px] text-muted-foreground">{section.description}</p>

          {section.fields.map((field) => {
            const value = settings[field.key] ?? field.defaultValue ?? "";

            if (field.type === "switch") {
              return (
                <div key={field.key} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                  <Label className="text-xs">{field.label}</Label>
                  <Switch
                    checked={value as boolean ?? true}
                    onCheckedChange={(v) => onUpdate(sectionId, field.key, v)}
                  />
                </div>
              );
            }

            if (field.type === "select" && field.options) {
              return (
                <div key={field.key}>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                  <Select value={String(value)} onValueChange={(v) => onUpdate(sectionId, field.key, v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {field.options.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (field.type === "number") {
              return (
                <div key={field.key}>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                  <Input
                    type="number"
                    value={String(value)}
                    onChange={(e) => onUpdate(sectionId, field.key, Number(e.target.value))}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              );
            }

            if (field.type === "textarea") {
              return (
                <div key={field.key}>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                  <Textarea
                    value={String(value)}
                    onChange={(e) => onUpdate(sectionId, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="mt-1 text-xs"
                  />
                </div>
              );
            }

            return (
              <div key={field.key}>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                <Input
                  value={String(value)}
                  onChange={(e) => onUpdate(sectionId, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
