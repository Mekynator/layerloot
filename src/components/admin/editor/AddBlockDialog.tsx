import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVisualEditor, pageDisplayTitle } from "@/contexts/VisualEditorContext";
import {
  Square, Type, Image, Columns, PlayCircle, MousePointer, Link2, Code, Globe, Mail,
  Truck, Star, HelpCircle, ShieldCheck, Layers, Package, FolderTree,
} from "lucide-react";

const BLOCK_TYPES = [
  { value: "hero", label: "Hero Banner", icon: Square, color: "border-l-primary" },
  { value: "shipping_banner", label: "Shipping Banner", icon: Truck, color: "border-l-amber-500" },
  { value: "entry_cards", label: "Entry Cards", icon: Layers, color: "border-l-cyan-500" },
  { value: "categories", label: "Categories", icon: FolderTree, color: "border-l-violet-500" },
  { value: "featured_products", label: "Products", icon: Star, color: "border-l-yellow-500" },
  { value: "how_it_works", label: "How It Works", icon: Package, color: "border-l-teal-500" },
  { value: "faq", label: "FAQ", icon: HelpCircle, color: "border-l-sky-500" },
  { value: "trust_badges", label: "Trust Badges", icon: ShieldCheck, color: "border-l-emerald-500" },
  { value: "text", label: "Text", icon: Type, color: "border-l-blue-500" },
  { value: "image", label: "Image Grid", icon: Image, color: "border-l-green-500" },
  { value: "carousel", label: "Carousel", icon: Columns, color: "border-l-purple-500" },
  { value: "video", label: "Video", icon: PlayCircle, color: "border-l-red-500" },
  { value: "banner", label: "Banner", icon: Square, color: "border-l-amber-500" },
  { value: "cta", label: "Call to Action", icon: MousePointer, color: "border-l-emerald-500" },
  { value: "button", label: "Button", icon: Link2, color: "border-l-cyan-500" },
  { value: "spacer", label: "Spacer", icon: Square, color: "border-l-muted-foreground" },
  { value: "html", label: "Custom HTML", icon: Code, color: "border-l-orange-500" },
  { value: "embed", label: "Embed", icon: Globe, color: "border-l-indigo-500" },
  { value: "newsletter", label: "Newsletter", icon: Mail, color: "border-l-pink-500" },
  { value: "instagram_auto_feed", label: "Instagram", icon: Globe, color: "border-l-fuchsia-500" },
];

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insertAtIndex?: number;
}

export default function AddBlockDialog({ open, onOpenChange, insertAtIndex }: AddBlockDialogProps) {
  const { addBlock, selectedPage } = useVisualEditor();

  const handleAdd = (type: string) => {
    addBlock(type, insertAtIndex);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wider">
            Add Section{selectedPage ? ` · ${pageDisplayTitle(selectedPage)}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {BLOCK_TYPES.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => handleAdd(value)}
              className={`group flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-3 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg border-l-[3px] ${color}`}
              style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.4)' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-foreground/80 group-hover:text-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
