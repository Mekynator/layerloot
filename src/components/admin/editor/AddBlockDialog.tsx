import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useVisualEditor, pageDisplayTitle } from "@/contexts/VisualEditorContext";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Search } from "lucide-react";
import {
  Square, Type, Image, Columns, PlayCircle, MousePointer, Link2, Code, Globe, Mail,
  Truck, Star, HelpCircle, ShieldCheck, Layers, Package, FolderTree,
  Clock, MessageSquare, Eye, Gift, Minus, Sparkles, Wand2, Store, LayoutTemplate, ThumbsUp,
  TrendingUp, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BlockDef {
  value: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}

interface Category {
  name: string;
  blocks: BlockDef[];
}

interface PageTemplateDef {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  blocks: string[];
}

const CATEGORIES: Category[] = [
  {
    name: "Content",
    blocks: [
      { value: "hero", label: "Hero Banner", desc: "Full-width banner with heading, buttons, and background image", icon: Square, color: "border-l-primary" },
      { value: "text", label: "Text", desc: "Heading and body text block", icon: Type, color: "border-l-blue-500" },
      { value: "banner", label: "Banner", desc: "Promotional banner with message and optional link", icon: Square, color: "border-l-amber-500" },
      { value: "shipping_banner", label: "Shipping Banner", desc: "Scrolling top bar for shipping info or notices", icon: Truck, color: "border-l-amber-500" },
      { value: "how_it_works", label: "How It Works", desc: "Step-by-step process explanation", icon: Package, color: "border-l-teal-500" },
      { value: "faq", label: "FAQ", desc: "Expandable frequently asked questions", icon: HelpCircle, color: "border-l-sky-500" },
      { value: "countdown", label: "Countdown", desc: "Timer counting down to a specific date", icon: Clock, color: "border-l-red-500" },
    ],
  },
  {
    name: "Commerce",
    blocks: [
      { value: "featured_products", label: "Products", desc: "Grid of products from your catalog", icon: Star, color: "border-l-yellow-500" },
      { value: "categories", label: "Categories", desc: "Category cards linking to filtered product views", icon: FolderTree, color: "border-l-violet-500" },
      { value: "entry_cards", label: "Entry Cards", desc: "Action cards for key user journeys (shop, customize, upload)", icon: Layers, color: "border-l-cyan-500" },
      { value: "recently_viewed", label: "Recently Viewed", desc: "Show products the visitor recently looked at", icon: Eye, color: "border-l-slate-500" },
      { value: "gift_finder", label: "Gift Finder", desc: "Interactive quiz-style product recommendation tool", icon: Gift, color: "border-l-pink-500" },
    ],
  },
  {
    name: "Social Proof",
    blocks: [
      { value: "trust_badges", label: "Trust Badges", desc: "Icons with short trust signals (shipping, secure, quality)", icon: ShieldCheck, color: "border-l-emerald-500" },
      { value: "social_proof", label: "Social Proof", desc: "Customer count, reviews summary, popularity indicators", icon: ThumbsUp, color: "border-l-rose-500" },
      { value: "testimonials", label: "Testimonials", desc: "Customer quotes in a carousel or grid", icon: MessageSquare, color: "border-l-orange-500" },
      { value: "instagram_auto_feed", label: "Instagram", desc: "Auto-synced Instagram feed grid", icon: Globe, color: "border-l-fuchsia-500" },
    ],
  },
  {
    name: "Media",
    blocks: [
      { value: "image", label: "Image Grid", desc: "Single image or multi-image grid display", icon: Image, color: "border-l-green-500" },
      { value: "gallery", label: "Gallery", desc: "Masonry or grid gallery with lightbox", icon: Image, color: "border-l-lime-500" },
      { value: "carousel", label: "Carousel", desc: "Sliding image or content carousel", icon: Columns, color: "border-l-purple-500" },
      { value: "video", label: "Video", desc: "Embedded video player (YouTube, Vimeo, or upload)", icon: PlayCircle, color: "border-l-red-500" },
    ],
  },
  {
    name: "Conversion",
    blocks: [
      { value: "cta", label: "Call to Action", desc: "Eye-catching action section with heading and button", icon: MousePointer, color: "border-l-emerald-500" },
      { value: "smart_funnel", label: "Smart Funnel", desc: "Personalized recommendation section tuned to the visitor's funnel stage", icon: TrendingUp, color: "border-l-violet-500" },
      { value: "button", label: "Button", desc: "Standalone button linking to any page or URL", icon: Link2, color: "border-l-cyan-500" },
      { value: "newsletter", label: "Newsletter", desc: "Email signup form for your mailing list", icon: Mail, color: "border-l-pink-500" },
    ],
  },
  {
    name: "Layout",
    blocks: [
      { value: "divider", label: "Divider", desc: "Horizontal line to separate sections", icon: Minus, color: "border-l-muted-foreground" },
      { value: "spacer", label: "Spacer", desc: "Empty vertical space between sections", icon: Square, color: "border-l-muted-foreground" },
      { value: "html", label: "Custom HTML", desc: "Raw HTML code block for advanced content", icon: Code, color: "border-l-orange-500" },
      { value: "embed", label: "Embed", desc: "iFrame embed for external widgets or maps", icon: Globe, color: "border-l-indigo-500" },
    ],
  },
];

const PAGE_TEMPLATES: PageTemplateDef[] = [
  {
    id: "starter-storefront",
    name: "Storefront Starter",
    desc: "Hero, featured products, trust signals, and a CTA-ready finish.",
    icon: Store,
    blocks: ["hero", "featured_products", "trust_badges", "testimonials", "cta"],
  },
  {
    id: "brand-story",
    name: "Brand Story",
    desc: "Ideal for About or custom landing pages with narrative sections.",
    icon: LayoutTemplate,
    blocks: ["hero", "text", "how_it_works", "gallery", "faq"],
  },
  {
    id: "campaign-launch",
    name: "Campaign Launch",
    desc: "A conversion-focused sequence for promos, launches, and seasonal offers.",
    icon: Wand2,
    blocks: ["banner", "countdown", "entry_cards", "social_proof", "cta"],
  },
  {
    id: "high-converting-homepage",
    name: "High-Converting Homepage",
    desc: "Full conversion stack: hero, products, trust, urgency timer, social proof, and newsletter.",
    icon: TrendingUp,
    blocks: ["hero", "featured_products", "smart_funnel", "trust_badges", "countdown", "testimonials", "social_proof", "cta", "newsletter"],
  },
  {
    id: "gift-campaign-landing",
    name: "Gift Campaign Landing",
    desc: "Gift finder, featured products, trust strips, and a newsletter capture for gifting occasions.",
    icon: Gift,
    blocks: ["hero", "gift_finder", "featured_products", "trust_badges", "newsletter"],
  },
  {
    id: "seasonal-promo",
    name: "Seasonal Promo",
    desc: "Countdown urgency, product highlights, social proof, and a closing CTA.",
    icon: Clock,
    blocks: ["banner", "countdown", "featured_products", "social_proof", "cta"],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    desc: "Entry cards, featured grid, testimonials, FAQ, and a launch CTA.",
    icon: Sparkles,
    blocks: ["hero", "entry_cards", "featured_products", "testimonials", "faq", "cta"],
  },
  {
    id: "custom-order-funnel",
    name: "Custom Order Funnel",
    desc: "How it works, trust signals, product FAQ, and a custom order CTA.",
    icon: ShoppingBag,
    blocks: ["hero", "how_it_works", "trust_badges", "faq", "cta"],
  },
];

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insertAtIndex?: number;
}

export default function AddBlockDialog({ open, onOpenChange, insertAtIndex }: AddBlockDialogProps) {
  const { addBlock, selectedPage } = useVisualEditor();
  const [search, setSearch] = useState("");

  const handleAdd = (type: string) => {
    addBlock(type, insertAtIndex);
    onOpenChange(false);
    setSearch("");
  };

  const handleAddTemplate = (template: PageTemplateDef) => {
    template.blocks.forEach((blockType, offset) => {
      addBlock(blockType, typeof insertAtIndex === "number" ? insertAtIndex + offset : undefined);
    });
    toast.success(`Added \"${template.name}\" template`);
    onOpenChange(false);
    setSearch("");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES
      .map(cat => ({
        ...cat,
        blocks: cat.blocks.filter(b =>
          b.label.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q) || b.value.includes(q)
        ),
      }))
      .filter(cat => cat.blocks.length > 0);
  }, [search]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(""); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider">
            Add Section{selectedPage ? ` · ${pageDisplayTitle(selectedPage)}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="h-8 pl-8 text-xs"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {!search.trim() && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Quick start templates</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAGE_TEMPLATES.map(({ id, name, desc, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleAddTemplate(PAGE_TEMPLATES.find((template) => template.id === id)!)}
                    className="rounded-xl border border-border/40 bg-background/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{name}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No blocks match "{search}"</p>
          )}
          {filtered.map(cat => (
            <Collapsible key={cat.name} defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3 transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
                {cat.name}
                <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">{cat.blocks.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-1.5 px-1 pb-2 sm:grid-cols-3">
                  {cat.blocks.map(({ value, label, desc, icon: Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => handleAdd(value)}
                      className={cn(
                        "group flex items-start gap-2.5 rounded-xl border border-border/40 bg-card/60 px-3 py-2.5 text-left backdrop-blur-xl transition-all duration-200",
                        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg border-l-[3px]",
                        color,
                      )}
                      style={{ boxShadow: '0 2px 12px -3px hsl(228 33% 2% / 0.3)' }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-display text-[10px] font-semibold uppercase tracking-wider text-foreground/90 group-hover:text-foreground">
                          {label}
                        </span>
                        <span className="block mt-0.5 text-[9px] leading-tight text-muted-foreground line-clamp-2">
                          {desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
