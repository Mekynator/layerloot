import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StaticSection } from "@/lib/static-page-sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy, Eye, EyeOff, Palette, Type, Settings2, Layers, Monitor, Tablet, Smartphone, MousePointerClick, Square, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useVisualEditor, type SelectedElement } from "@/contexts/VisualEditorContext";
import { useDesignSystemSafe } from "@/contexts/DesignSystemContext";
import { useAuth } from "@/contexts/AuthContext";
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
import { getBlockSchema, type EditableNode, type BlockEditableSchema } from "./editable-schema";
import BlockFieldGroups from "./BlockFieldGroups";
import PageStylePresetsPanel from "./PageStylePresetsPanel";
import PersonalizationPanel from "./PersonalizationPanel";
import ABTestPanel from "./ABTestPanel";
import AIAssistantPanel from "./AIAssistantPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tr } from "@/lib/translate";
import { buildReusableInstanceContent, detachReusableContent, getReusableKind, upsertReusableFromBlock } from "@/lib/reusable-blocks";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import { toast } from "sonner";

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
        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2 transition-colors duration-200">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-foreground">Settings</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Settings2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">Select something to edit</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">Click any section or element on the canvas</p>
          </div>
        </div>
      </div>
    );
  }

  return <BlockSettings key={selectedBlockId} block={selectedBlock} selectedElement={selectedElement} onSelectElement={selectElement} />;
}

function BlockSettings({ block, selectedElement, onSelectElement }: { block: SiteBlock; selectedElement: SelectedElement | null; onSelectElement: (el: SelectedElement | null) => void }) {
  const { updateBlockContent, updateBlockMeta, selectBlock, pages } = useVisualEditor();
  const { user } = useAuth();
  const { track } = useAnalyticsSafe();

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

  const duplicateItem = useCallback((index: number) => {
    if (!repeaterKey) return;
    const items = [...(localContent[repeaterKey] as Record<string, unknown>[] || [])];
    const source = items[index];
    if (!source) return;
    items.splice(index + 1, 0, { ...source, order: index + 2 });
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

  const reusableInfo = useMemo(() => {
    if (!localContent._reusableId) return null;
    return {
      id: String(localContent._reusableId),
      name: String(localContent._reusableName || title || block.block_type.replace(/_/g, " ")),
      category: String(localContent._reusableCategory || "General"),
      kind: getReusableKind(undefined, localContent as Record<string, any>),
      syncMode: String(localContent._reusableSyncMode || "global"),
      version: Number(localContent._reusableVersion || 1),
    };
  }, [localContent, title, block.block_type]);

  const setReusableSyncMode = useCallback((mode: "global" | "override") => {
    if (!reusableInfo) return;
    commitContent({ ...localContent, _reusableSyncMode: mode });
    track(mode === "override" ? "component_override_local" : "component_resynced", { id: reusableInfo.id, name: reusableInfo.name, kind: reusableInfo.kind, block_type: block.block_type });
    toast.success(mode === "override" ? "Local overrides enabled" : "This instance is now fully synced again");
  }, [commitContent, localContent, reusableInfo]);

  const detachReusableInstance = useCallback(() => {
    if (!reusableInfo) return;
    if (!window.confirm("Detach this instance from the reusable source? It will stop receiving synced updates.")) return;
    commitContent(detachReusableContent(localContent as Record<string, any>));
    track("component_detached", { id: reusableInfo.id, name: reusableInfo.name, kind: reusableInfo.kind, block_type: block.block_type });
    toast.success("Instance detached");
  }, [commitContent, localContent, reusableInfo]);

  const editGlobally = useCallback(async () => {
    if (!reusableInfo) return;
    const confirmed = window.confirm(`Update “${reusableInfo.name}” globally? This will refresh every synced instance using it.`);
    if (!confirmed) return;

    try {
      const result = await upsertReusableFromBlock({
        block: { ...block, title, content: localContent } as SiteBlock,
        reusableId: reusableInfo.id,
        name: reusableInfo.name,
        category: reusableInfo.category,
        kind: reusableInfo.kind,
        userId: user?.id ?? null,
      });
      commitContent(buildReusableInstanceContent(result, "global", reusableInfo.kind));
      track("component_global_edit", { id: reusableInfo.id, name: reusableInfo.name, kind: reusableInfo.kind, block_type: block.block_type });
      toast.success("Global component updated");
    } catch (error: any) {
      toast.error(error?.message || "Could not update the global component");
    }
  }, [block, title, localContent, reusableInfo, user?.id, commitContent]);

  const isElementSelected = selectedElement?.blockId === block.id;
  const selectedNodeKey = isElementSelected ? selectedElement?.nodeKey : null;
  const selectedNodeType = isElementSelected ? selectedElement?.nodeType : null;

  const schema = getBlockSchema(block.block_type);
  const selectedNode = useMemo<EditableNode | null>(() => {
    if (!selectedNodeKey) return null;
    return schema.nodes.find((node) => node.key === selectedNodeKey)
      ?? schema.repeaterItemNodes?.find((node) => node.key === selectedNodeKey)
      ?? null;
  }, [schema, selectedNodeKey]);
  const selectedRepeaterIndex = isElementSelected ? selectedElement?.repeaterIndex : undefined;
  const selectedRepeaterItem = typeof selectedRepeaterIndex === "number"
    ? repeaterItems[selectedRepeaterIndex] ?? null
    : null;

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
          <Accordion type="multiple" defaultValue={["content", "appearance", "layout", "advanced"]} className="w-full">

            <AccordionItem value="content" className="border-b border-border/30">
              <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider hover:no-underline">Content &amp; Elements</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Block Label</Label>
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>

              <ElementNavigator
                blockId={block.id}
                schema={schema}
                repeaterItems={repeaterItems}
                selectedElement={isElementSelected ? selectedElement : null}
                onSelectElement={onSelectElement}
              />

              {isElementSelected && selectedNodeKey && selectedNode && (
                <ElementInspector
                  node={selectedNode}
                  value={selectedRepeaterItem?.[selectedNodeKey] ?? localContent[selectedNodeKey]}
                  repeaterLabel={typeof selectedRepeaterIndex === "number" ? `${selectedRepeaterIndex + 1}` : null}
                  isVisible={typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.visible !== false : null}
                  onToggleVisibility={typeof selectedRepeaterIndex === "number" ? (checked) => patchItem(selectedRepeaterIndex, { visible: checked }) : undefined}
                  onDuplicate={typeof selectedRepeaterIndex === "number" ? () => duplicateItem(selectedRepeaterIndex) : undefined}
                  onDelete={typeof selectedRepeaterIndex === "number" ? () => {
                    removeItem(selectedRepeaterIndex);
                    onSelectElement(null);
                  } : undefined}
                  mediaSettings={selectedNode.type === "media" ? {
                    fit: String((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.objectFit : (selectedNodeKey === "bg_image" || selectedNodeKey === "backgroundImage") ? localContent.bgImageFit : localContent.imageFit) || ((selectedNodeKey === "bg_image" || selectedNodeKey === "backgroundImage") ? "cover" : "contain")),
                    opacity: Number((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.opacity : (selectedNodeKey === "bg_image" || selectedNodeKey === "backgroundImage") ? localContent.bgImageOpacity : localContent.imageOpacity) ?? 100),
                    radius: Number((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.borderRadius : localContent.imageBorderRadius) ?? 16),
                    shadow: String((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.shadow : localContent.imageShadow) || "none"),
                    posX: String((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.positionX : (selectedNodeKey === "bg_image" || selectedNodeKey === "backgroundImage") ? localContent.bgImagePositionX : localContent.imagePositionX) || "center"),
                    posY: String((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.positionY : (selectedNodeKey === "bg_image" || selectedNodeKey === "backgroundImage") ? localContent.bgImagePositionY : localContent.imagePositionY) || "center"),
                    alt: String((typeof selectedRepeaterIndex === "number" ? selectedRepeaterItem?.alt : localContent.alt) || ""),
                    isBackground: selectedNodeKey === "bg_image" || selectedNodeKey === "backgroundImage",
                  } : null}
                  onPatchMediaSetting={selectedNode.type === "media" ? (key, nextValue) => {
                    if (typeof selectedRepeaterIndex === "number") {
                      patchItem(selectedRepeaterIndex, { [key]: nextValue });
                      return;
                    }
                    patchContent(key, nextValue);
                  } : undefined}
                  onBack={() => onSelectElement(null)}
                  onChange={(value) => {
                    if (typeof selectedRepeaterIndex === "number") {
                      patchItem(selectedRepeaterIndex, { [selectedNodeKey]: value });
                      return;
                    }
                    patchContent(selectedNodeKey, value);
                  }}
                >
                  {selectedNode.type === "text" && (
                    <TypographyControls
                      typography={getTypography(selectedNodeKey)}
                      onChange={(key, val) => handleTypographyChange(selectedNodeKey, key, val)}
                    />
                  )}
                </ElementInspector>
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
                duplicateItem={duplicateItem}
                moveItem={moveItem}
                compact
                pages={pageList}
              />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="appearance" className="border-b border-border/30">
              <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider hover:no-underline">Appearance</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
              <PageStylePresetsPanel blockType={block.block_type} content={localContent} onApplyPatch={(patch) => commitContent({ ...localContent, ...patch })} />
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
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="layout" className="border-b border-border/30">
              <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider hover:no-underline">Layout &amp; Border</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <BorderControls content={localContent} patchContent={patchContent} />
                  <ResponsiveEditor content={localContent} patchContent={patchContent} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced">
              <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider hover:no-underline">Advanced</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
              {reusableInfo && (
                <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                        {reusableInfo.kind === "component" ? "Global component" : "Reusable section"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">{reusableInfo.name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {reusableInfo.syncMode === "override"
                          ? "This instance is keeping local overrides while staying linked to the source."
                          : "This block is synced to a reusable source and can be updated or detached safely."}
                      </p>
                    </div>
                    <Badge variant={reusableInfo.syncMode === "override" ? "outline" : "secondary"} className="text-[9px]">
                      {reusableInfo.syncMode === "override" ? "Override active" : "Synced"} · v{reusableInfo.version}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={editGlobally} className="rounded-md border border-primary/30 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10">
                      Edit globally
                    </button>
                    <button type="button" onClick={() => setReusableSyncMode("override")} className="rounded-md border border-border/40 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground transition-colors hover:border-primary/30">
                      Override locally
                    </button>
                    <button type="button" onClick={() => setReusableSyncMode("global")} className="rounded-md border border-border/40 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground transition-colors hover:border-primary/30">
                      Re-sync instance
                    </button>
                    <button type="button" onClick={detachReusableInstance} className="rounded-md border border-destructive/30 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/5">
                      Detach instance
                    </button>
                  </div>
                </div>
              )}

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

              <AIAssistantPanel content={localContent} patchContent={patchContent} blockType={block.block_type} blockTitle={block.title} />

              <PersonalizationPanel content={localContent} patchContent={patchContent} />

              <ABTestPanel entityType="section" entityId={block.id} content={localContent} patchContent={patchContent} />

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
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

function ElementNavigator({
  blockId,
  schema,
  repeaterItems,
  selectedElement,
  onSelectElement,
}: {
  blockId: string;
  schema: BlockEditableSchema;
  repeaterItems: Record<string, unknown>[];
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
}) {
  const hasPrimaryNodes = schema.nodes.length > 0;
  const hasRepeaterNodes = !!schema.repeaterKey && !!schema.repeaterItemNodes?.length && repeaterItems.length > 0;

  if (!hasPrimaryNodes && !hasRepeaterNodes) return null;

  const isActive = (nodeKey: string, repeaterIndex?: number) => (
    selectedElement?.nodeKey === nodeKey && selectedElement?.repeaterIndex === repeaterIndex
  );

  return (
    <div className="space-y-2 rounded-lg border border-border/30 bg-background/40 p-2 transition-all duration-200 ease-out">
      <div className="flex items-center gap-1.5">
        <MousePointerClick className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Element map</span>
      </div>

      {hasPrimaryNodes && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Block elements</p>
          <div className="flex flex-wrap gap-1">
            {schema.nodes.map((node) => (
              <button
                key={node.key}
                type="button"
                onClick={() => onSelectElement({ blockId, nodeKey: node.key, nodeType: node.type })}
                className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${isActive(node.key) ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
              >
                {node.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasRepeaterNodes && schema.repeaterItemNodes && (
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Nested items</p>
          {repeaterItems.map((item, index) => (
            <div key={`${schema.repeaterKey}-${index}`} className="rounded-lg border border-border/30 p-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-medium text-foreground">{schema.repeaterKey?.replace(/_/g, " ")} {index + 1}</p>
                <span className="truncate text-[9px] text-muted-foreground">{String(item.title || item.question || item.name || item.label || "Item")}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {schema.repeaterItemNodes.map((node) => (
                  <button
                    key={`${schema.repeaterKey}-${index}-${node.key}`}
                    type="button"
                    onClick={() => onSelectElement({ blockId, nodeKey: node.key, nodeType: node.type, repeaterIndex: index })}
                    className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${isActive(node.key, index) ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
                  >
                    {node.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ElementInspector({
  node,
  value,
  repeaterLabel,
  isVisible,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  mediaSettings,
  onPatchMediaSetting,
  onBack,
  onChange,
  children,
}: {
  node: EditableNode;
  value: unknown;
  repeaterLabel: string | null;
  isVisible?: boolean | null;
  onToggleVisibility?: (checked: boolean) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  mediaSettings?: {
    fit: string;
    opacity: number;
    radius: number;
    shadow: string;
    posX: string;
    posY: string;
    alt: string;
    isBackground: boolean;
  } | null;
  onPatchMediaSetting?: (key: string, value: unknown) => void;
  onBack: () => void;
  onChange: (value: unknown) => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-2 shadow-[0_12px_28px_-20px_rgba(99,102,241,0.45)] transition-all duration-200 ease-out">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <MousePointerClick className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Editing: {node.label}{repeaterLabel ? ` · item ${repeaterLabel}` : ""}
          </span>
        </div>
        <button type="button" onClick={onBack} className="text-[9px] text-muted-foreground hover:text-foreground underline">
          Back to block
        </button>
      </div>

      {node.type === "text" && (
        <div>
          <Label className="text-[10px]">Text</Label>
          {node.multiline ? (
            <Textarea value={String(value || "")} onChange={(e) => onChange(e.target.value)} rows={4} className="text-xs" />
          ) : (
            <Input value={String(value || "")} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" />
          )}
        </div>
      )}

      {node.type === "layout" && (
        <div>
          <Label className="text-[10px]">Layout</Label>
          <Select value={String(value || node.options[0]?.value || "")} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {node.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {node.type === "icon" && (
        <div>
          <Label className="text-[10px]">Icon name</Label>
          <Input value={String(value || "")} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" placeholder="e.g. Star" />
        </div>
      )}

      {node.type === "media" && (
        <>
          <ImageUploadField label={node.label} value={String(value || "")} onChange={onChange} />
          {mediaSettings && onPatchMediaSetting && (
            <div className="space-y-2 rounded-lg border border-border/30 bg-background/60 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quick image styling</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Fit</Label>
                  <Select value={mediaSettings.fit} onValueChange={(nextValue) => onPatchMediaSetting(mediaSettings.isBackground ? "bgImageFit" : repeaterLabel ? "objectFit" : "imageFit", nextValue)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Shadow</Label>
                  <Select value={mediaSettings.shadow} onValueChange={(nextValue) => onPatchMediaSetting(repeaterLabel ? "shadow" : "imageShadow", nextValue)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="sm">Soft</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SliderField label="Opacity" value={mediaSettings.opacity} onChange={(nextValue) => onPatchMediaSetting(mediaSettings.isBackground ? "bgImageOpacity" : repeaterLabel ? "opacity" : "imageOpacity", nextValue)} min={0} max={100} step={5} unit="%" />
                {!mediaSettings.isBackground && (
                  <SliderField label="Roundness" value={mediaSettings.radius} onChange={(nextValue) => onPatchMediaSetting(repeaterLabel ? "borderRadius" : "imageBorderRadius", nextValue)} min={0} max={48} step={2} unit="px" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Horizontal</Label>
                  <Select value={mediaSettings.posX} onValueChange={(nextValue) => onPatchMediaSetting(mediaSettings.isBackground ? "bgImagePositionX" : repeaterLabel ? "positionX" : "imagePositionX", nextValue)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Vertical</Label>
                  <Select value={mediaSettings.posY} onValueChange={(nextValue) => onPatchMediaSetting(mediaSettings.isBackground ? "bgImagePositionY" : repeaterLabel ? "positionY" : "imagePositionY", nextValue)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!mediaSettings.isBackground && (
                <div>
                  <Label className="text-[10px]">Alt text</Label>
                  <Input value={mediaSettings.alt} onChange={(event) => onPatchMediaSetting("alt", event.target.value)} className="h-8 text-xs" placeholder="Describe the image for accessibility" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {(onDuplicate || onDelete || onToggleVisibility) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/30 bg-background/60 p-2">
          {typeof isVisible === "boolean" && onToggleVisibility && (
            <button type="button" onClick={() => onToggleVisibility(!isVisible)} className="inline-flex items-center gap-1 rounded-md border border-border/30 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {isVisible ? "Hide" : "Show"}
            </button>
          )}
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1 rounded-md border border-border/30 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
              <Copy className="h-3 w-3" /> Duplicate item
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[10px] text-destructive transition-colors hover:bg-destructive/5">
              <Trash2 className="h-3 w-3" /> Delete item
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

// ─── Advanced Style Editor ───────────────────────────────────────
function AdvancedStyleEditor({ content, patchContent }: { content: Record<string, unknown>; patchContent: (key: string, value: unknown) => void }) {
  const { tokens } = useDesignSystemSafe();

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
        <div>
          <Label className="text-[10px]">Vertical Rhythm</Label>
          <Select onValueChange={(value) => {
            if (value === "custom") return;
            const spacing = tokens.spacing[value as keyof typeof tokens.spacing];
            patchContent("paddingTop", spacing);
            patchContent("paddingBottom", spacing);
          }} value="custom">
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Apply shared spacing" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="xs">Extra Tight</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Balanced</SelectItem>
              <SelectItem value="lg">Comfortable</SelectItem>
              <SelectItem value="xl">Spacious</SelectItem>
              <SelectItem value="section">Section</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SliderField label="Top" value={(content.paddingTop as number) ?? 0} onChange={(v) => patchContent("paddingTop", v)} min={0} max={120} step={4} />
          <SliderField label="Bottom" value={(content.paddingBottom as number) ?? 0} onChange={(v) => patchContent("paddingBottom", v)} min={0} max={120} step={4} />
          <SliderField label="Left" value={(content.paddingLeft as number) ?? 0} onChange={(v) => patchContent("paddingLeft", v)} min={0} max={120} step={4} />
          <SliderField label="Right" value={(content.paddingRight as number) ?? 0} onChange={(v) => patchContent("paddingRight", v)} min={0} max={120} step={4} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin</Label>
        <div>
          <Label className="text-[10px]">Breathing Room</Label>
          <Select onValueChange={(value) => {
            if (value === "custom") return;
            const spacing = tokens.spacing[value as keyof typeof tokens.spacing];
            patchContent("marginTop", spacing);
            patchContent("marginBottom", spacing);
          }} value="custom">
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Apply shared spacing" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="xs">Extra Tight</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Balanced</SelectItem>
              <SelectItem value="lg">Comfortable</SelectItem>
              <SelectItem value="xl">Spacious</SelectItem>
              <SelectItem value="section">Section</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
