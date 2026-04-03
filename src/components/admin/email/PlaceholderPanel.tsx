import { useState } from "react";
import { Copy, ChevronDown, ChevronRight, Globe, Shield, ShoppingBag, Receipt, Wrench, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PLACEHOLDER_CATEGORIES } from "./types";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Globe, Shield, ShoppingBag, Receipt, Wrench, MessageSquare, Sparkles,
};

interface Props {
  onInsert?: (placeholder: string) => void;
}

export default function PlaceholderPanel({ onInsert }: Props) {
  const [open, setOpen] = useState<string | null>('General');
  const { toast } = useToast();

  const handleClick = (key: string) => {
    if (onInsert) {
      onInsert(key);
    } else {
      navigator.clipboard.writeText(key);
      toast({ title: "Copied", description: key });
    }
  };

  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-2">Placeholders</h4>
      {PLACEHOLDER_CATEGORIES.map((cat) => {
        const Icon = ICON_MAP[cat.icon] || Globe;
        const isOpen = open === cat.name;
        return (
          <div key={cat.name}>
            <button
              onClick={() => setOpen(isOpen ? null : cat.name)}
              className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg hover:bg-accent/10 transition-colors text-xs"
            >
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium flex-1">{cat.name}</span>
              <span className="text-[10px] text-muted-foreground">{cat.items.length}</span>
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {isOpen && (
              <div className="pl-4 pb-1 space-y-0.5">
                {cat.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleClick(item.key)}
                    className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-accent/10 transition-colors group"
                    title={`Click to ${onInsert ? 'insert' : 'copy'}: ${item.key}`}
                  >
                    <code className="text-[10px] font-mono text-primary/80 bg-primary/5 px-1 py-0.5 rounded shrink-0">{item.key.replace(/\{\{|\}\}/g, '')}</code>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">{item.desc}</span>
                    <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
