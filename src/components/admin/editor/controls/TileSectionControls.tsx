import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SliderField from "./SliderField";

interface TileSectionControlsProps {
  content: Record<string, unknown>;
  patchContent: (key: string, value: unknown) => void;
  /** Hide layout mode selector when parent already controls it */
  hideLayoutMode?: boolean;
  /** Hide columns selector when parent already controls it */
  hideColumns?: boolean;
}

export default function TileSectionControls({ content, patchContent, hideLayoutMode, hideColumns }: TileSectionControlsProps) {
  const layoutMode = (content.tileLayoutMode as string) || "grid";

  return (
    <Accordion type="single" collapsible className="mt-2">
      <AccordionItem value="tile-settings" className="rounded-md border border-border/30 px-2">
        <AccordionTrigger className="py-2 text-[11px] font-semibold uppercase tracking-wider">
          Tile &amp; Layout Settings
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          {/* Layout mode */}
          {!hideLayoutMode && (
            <div>
              <Label className="text-[10px]">Layout Mode</Label>
              <Select value={layoutMode} onValueChange={(v) => patchContent("tileLayoutMode", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Grid columns */}
          {!hideColumns && layoutMode === "grid" && (
            <div>
              <Label className="text-[10px]">Columns</Label>
              <Select
                value={String((content.tileGridColumns as number) ?? 4)}
                onValueChange={(v) => patchContent("tileGridColumns", Number(v))}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Spacing */}
          <SliderField
            label="Spacing (px)"
            value={(content.tileSpacing as number) ?? 16}
            onChange={(v) => patchContent("tileSpacing", v)}
            min={4} max={48} step={2}
          />

          {/* Card min width (carousel) */}
          {layoutMode === "carousel" && (
            <SliderField
              label="Card Min Width"
              value={(content.tileCardMinWidth as number) ?? 260}
              onChange={(v) => patchContent("tileCardMinWidth", v)}
              min={150} max={400} step={10}
            />
          )}

          {/* Card height */}
          <SliderField
            label="Card Height (0=auto)"
            value={(content.tileCardHeight as number) ?? 0}
            onChange={(v) => patchContent("tileCardHeight", v)}
            min={0} max={600} step={10}
          />

          {/* Visibility toggles */}
          <ToggleRow label="Show Title" checked={content.tileShowTitle !== false} onChange={(v) => patchContent("tileShowTitle", v)} />
          <ToggleRow label="Show Subtitle" checked={content.tileShowSubtitle !== false} onChange={(v) => patchContent("tileShowSubtitle", v)} />
          <ToggleRow label="Show Badge" checked={content.tileShowBadge === true} onChange={(v) => patchContent("tileShowBadge", v)} />

          {/* Carousel controls */}
          <ToggleRow label="Show Arrows" checked={content.tileShowArrows !== false} onChange={(v) => patchContent("tileShowArrows", v)} />
          <ToggleRow label="Show Dots" checked={content.tileShowDots !== false} onChange={(v) => patchContent("tileShowDots", v)} />
          <ToggleRow label="Auto Slideshow" checked={content.tileAutoSlideshow === true} onChange={(v) => patchContent("tileAutoSlideshow", v)} />

          {content.tileAutoSlideshow && (
            <SliderField
              label="Slideshow Speed (ms)"
              value={(content.tileSlideshowSpeed as number) ?? 5000}
              onChange={(v) => patchContent("tileSlideshowSpeed", v)}
              min={1000} max={15000} step={500} unit="ms"
            />
          )}

          <ToggleRow label="Loop" checked={content.tileLoop !== false} onChange={(v) => patchContent("tileLoop", v)} />
          <ToggleRow label="Drag/Scroll" checked={content.tileDragEnabled !== false} onChange={(v) => patchContent("tileDragEnabled", v)} />

          {/* Mobile overrides */}
          <div className="mt-2 border-t border-border/20 pt-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile Overrides</p>
            <div>
              <Label className="text-[10px]">Mobile Columns</Label>
              <Select
                value={String((content.tileMobileColumns as number) ?? 2)}
                onValueChange={(v) => patchContent("tileMobileColumns", Number(v))}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-1">
              <Label className="text-[10px]">Mobile Layout</Label>
              <Select
                value={(content.tileMobileLayoutMode as string) || "carousel"}
                onValueChange={(v) => patchContent("tileMobileLayoutMode", v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-[10px]">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
