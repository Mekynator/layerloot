import { useState, useRef } from "react";
import { Save, RotateCcw, Copy, X, ChevronDown, ChevronRight, Image, Palette, Type, Settings2, Send } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplate } from "./types";
import { TEMPLATE_DEFAULTS } from "./types";
import EmailLivePreview from "./EmailLivePreview";
import PlaceholderPanel from "./PlaceholderPanel";

interface Props {
  template: EmailTemplate;
  open: boolean;
  onClose: () => void;
  onSave: (t: EmailTemplate) => Promise<void>;
  onDuplicate?: (t: EmailTemplate) => void;
}

type Section = 'content' | 'design' | 'images' | 'advanced';

export default function TemplateEditorModal({ template: initial, open, onClose, onSave, onDuplicate }: Props) {
  const [t, setT] = useState<EmailTemplate>(initial);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('content');
  const { toast } = useToast();
  const lastFocusedRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Sync local state when a different template is selected
  useEffect(() => {
    setT(initial);
    setActiveSection('content');
  }, [initial.id]);

  const u = <K extends keyof EmailTemplate>(key: K, val: EmailTemplate[K]) => setT(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(t);
    setSaving(false);
  };

  const handleReset = () => {
    const defaults = TEMPLATE_DEFAULTS[t.trigger_key];
    if (defaults) {
      setT(prev => ({ ...prev, ...defaults }));
      toast({ title: "Reset to default" });
    }
  };

  const handleInsertPlaceholder = (ph: string) => {
    const el = lastFocusedRef.current;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const field = el.dataset.field as keyof EmailTemplate | undefined;
      if (field && typeof t[field] === 'string') {
        const val = t[field] as string;
        const newVal = val.slice(0, start) + ph + val.slice(end);
        u(field, newVal as any);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + ph.length, start + ph.length);
        });
      }
    } else {
      navigator.clipboard.writeText(ph);
      toast({ title: "Copied", description: ph });
    }
  };

  const trackFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    lastFocusedRef.current = e.target;
  };

  const Field = ({ label, field, multiline = false, mono = false }: { label: string; field: keyof EmailTemplate; multiline?: boolean; mono?: boolean }) => (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          value={(t[field] as string) || ''}
          onChange={e => u(field, e.target.value as any)}
          onFocus={trackFocus}
          data-field={field}
          rows={4}
          className={`text-xs mt-1 ${mono ? 'font-mono' : ''}`}
        />
      ) : (
        <Input
          value={(t[field] as string) || ''}
          onChange={e => u(field, e.target.value as any)}
          onFocus={trackFocus}
          data-field={field}
          className={`h-8 text-xs mt-1 ${mono ? 'font-mono' : ''}`}
        />
      )}
    </div>
  );

  const SectionToggle = ({ section, icon: Icon, label }: { section: Section; icon: any; label: string }) => {
    const isActive = activeSection === section;
    return (
      <button
        onClick={() => setActiveSection(isActive ? activeSection : section)}
        className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent/10 text-muted-foreground'}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="font-medium">{label}</span>
        {isActive ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">{t.name || 'Edit Template'}</h2>
            <div className="flex items-center gap-2">
              <Switch checked={t.is_active} onCheckedChange={v => u('is_active', v)} />
              <span className="text-[10px] text-muted-foreground">{t.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 text-[11px]">
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
            {onDuplicate && (
              <Button size="sm" variant="ghost" onClick={() => onDuplicate(t)} className="h-7 text-[11px]">
                <Copy className="mr-1 h-3 w-3" /> Duplicate
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-[11px]">
              <Save className="mr-1 h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: editor */}
          <div className="w-[420px] border-r border-border/30 flex flex-col overflow-hidden">
            {/* Section nav */}
            <div className="px-3 py-2 border-b border-border/20 space-y-0.5">
              <SectionToggle section="content" icon={Type} label="Content" />
              <SectionToggle section="design" icon={Palette} label="Design & Colors" />
              <SectionToggle section="images" icon={Image} label="Images" />
              <SectionToggle section="advanced" icon={Settings2} label="Sender & Settings" />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {activeSection === 'content' && (
                  <>
                    <Field label="Template Name" field="name" />
                    <Field label="Subject Line" field="subject" />
                    <Field label="Preheader" field="preheader" />
                    <Field label="Email Title" field="title" />
                    <Field label="Subtitle" field="subtitle" />
                    <Field label="Main Body" field="body" multiline />
                    <Field label="Highlight / Info Box" field="highlight_box" multiline />
                    <Field label="CTA Button Text" field="cta_text" />
                    <Field label="CTA Button URL" field="cta_url" mono />
                    <Field label="Secondary Button Text" field="secondary_cta_text" />
                    <Field label="Secondary Button URL" field="secondary_cta_url" mono />
                    <Field label="Signature" field="signature" />
                    <Field label="Footer Text" field="footer_text" />
                    <Field label="Support Block" field="support_block" multiline />
                  </>
                )}

                {activeSection === 'design' && (
                  <>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Border Radius</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Slider min={0} max={24} step={1} value={[t.border_radius]} onValueChange={([v]) => u('border_radius', v)} className="flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{t.border_radius}px</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Padding</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Slider min={10} max={50} step={1} value={[t.padding]} onValueChange={([v]) => u('padding', v)} className="flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{t.padding}px</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['bg_color', 'Background'],
                        ['card_color', 'Card Color'],
                        ['text_color', 'Text Color'],
                        ['accent_color', 'Accent / Button'],
                      ] as const).map(([key, label]) => (
                        <div key={key}>
                          <Label className="text-[11px] text-muted-foreground">{label}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="color" value={t[key]} onChange={e => u(key, e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                            <Input value={t[key]} onChange={e => u(key, e.target.value)} className="h-8 text-[10px] font-mono flex-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={t.show_divider} onCheckedChange={v => u('show_divider', v)} />
                        <Label className="text-[11px]">Show dividers</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={t.show_support} onCheckedChange={v => u('show_support', v)} />
                        <Label className="text-[11px]">Show support section</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={t.show_legal} onCheckedChange={v => u('show_legal', v)} />
                        <Label className="text-[11px]">Show legal section</Label>
                      </div>
                    </div>
                  </>
                )}

                {activeSection === 'images' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Switch checked={t.show_logo} onCheckedChange={v => u('show_logo', v)} />
                      <Label className="text-[11px]">Show logo</Label>
                    </div>
                    <Field label="Logo URL" field="logo_url" mono />
                    <Field label="Header Image URL" field="header_image_url" mono />
                    <Field label="Content Image URL" field="content_image_url" mono />
                    <Field label="Footer Image URL" field="footer_image_url" mono />
                    <p className="text-[10px] text-muted-foreground">Paste image URLs from your media library or upload images in the Media section first.</p>
                  </>
                )}

                {activeSection === 'advanced' && (
                  <>
                    <Field label="Sender Name" field="sender_name" />
                    <Field label="Sender Email" field="sender_email" mono />
                    <Field label="Reply-To Email" field="reply_to" mono />
                    <Field label="Trigger Key" field="trigger_key" mono />
                  </>
                )}

                {/* Placeholder panel always visible at bottom */}
                <div className="pt-4 border-t border-border/20">
                  <PlaceholderPanel onInsert={handleInsertPlaceholder} />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right: preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/20 p-4">
            <EmailLivePreview template={t} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
