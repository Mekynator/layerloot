import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, X, Search, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PageOption {
  title: string;
  slug: string;
}

const STATIC_PAGES: PageOption[] = [
  { title: "Home", slug: "/" },
  { title: "Products", slug: "/products" },
  { title: "Cart", slug: "/cart" },
  { title: "About", slug: "/about" },
  { title: "Contact", slug: "/contact" },
  { title: "Gallery", slug: "/gallery" },
  { title: "Creations", slug: "/creations" },
  { title: "Create Your Own", slug: "/create" },
  { title: "Submit Design", slug: "/submit-design" },
  { title: "Account", slug: "/account" },
  { title: "Auth", slug: "/auth" },
  { title: "Policies", slug: "/policies" },
];

let cachedDynamic: PageOption[] | null = null;

interface AdminPageMultiSelectProps {
  label?: string;
  value: string[];
  onChange: (v: string[]) => void;
  allowAllPages?: boolean;
  className?: string;
}

export default function AdminPageMultiSelect({ label, value, onChange, allowAllPages = true, className }: AdminPageMultiSelectProps) {
  const [dynamicPages, setDynamicPages] = useState<PageOption[]>(cachedDynamic ?? []);
  const [search, setSearch] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [customPattern, setCustomPattern] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cachedDynamic) return;
    (async () => {
      const result: { data: { title: string; slug: string }[] | null } = await (supabase as any)
        .from("site_pages")
        .select("title, slug")
        .eq("is_active", true)
        .order("title");
      const pages: PageOption[] = (result.data ?? []).map((p) => ({ title: p.title, slug: `/${p.slug}` }));
      cachedDynamic = pages;
      setDynamicPages(pages);
    })();
  }, []);

  const allPages = [
    ...STATIC_PAGES,
    ...dynamicPages.filter((d) => !STATIC_PAGES.some((s) => s.slug === d.slug)),
  ];

  const isAllSelected = value.includes("*");
  const filtered = allPages.filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const togglePage = (slug: string) => {
    if (slug === "*") {
      onChange(isAllSelected ? [] : ["*"]);
      return;
    }
    const next = value.includes(slug) ? value.filter((v) => v !== slug && v !== "*") : [...value.filter((v) => v !== "*"), slug];
    onChange(next);
  };

  const removePage = (slug: string) => {
    onChange(value.filter((v) => v !== slug));
  };

  const addCustom = () => {
    const trimmed = customPattern.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value.filter((v) => v !== "*"), trimmed]);
      setCustomPattern("");
    }
  };

  const getPageLabel = (slug: string) => {
    const p = allPages.find((pg) => pg.slug === slug);
    return p ? p.title : slug;
  };

  return (
    <div className={className}>
      {label && <Label className="text-xs mb-1 block">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-auto min-h-[2rem] py-1 px-2 text-xs font-normal">
            <div className="flex flex-wrap gap-1 flex-1">
              {value.length === 0 && <span className="text-muted-foreground">Select pages...</span>}
              {isAllSelected && <Badge variant="secondary" className="text-[10px]">All Pages</Badge>}
              {!isAllSelected && value.slice(0, 4).map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px] gap-0.5">
                  {getPageLabel(v)}
                  <X className="h-2.5 w-2.5 cursor-pointer ml-0.5" onClick={(e) => { e.stopPropagation(); removePage(v); }} />
                </Badge>
              ))}
              {!isAllSelected && value.length > 4 && <Badge variant="outline" className="text-[10px]">+{value.length - 4}</Badge>}
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-7 pl-7 text-xs" placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {allowAllPages && (
              <label className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-xs font-medium">
                <Checkbox checked={isAllSelected} onCheckedChange={() => togglePage("*")} />
                All Pages
              </label>
            )}
            {filtered.map((p) => (
              <label key={p.slug} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer text-xs">
                <Checkbox checked={isAllSelected || value.includes(p.slug)} onCheckedChange={() => togglePage(p.slug)} disabled={isAllSelected} />
                <span className="flex-1">{p.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{p.slug}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 border-t border-border/50 pt-2">
            <div className="flex items-center gap-2 mb-1">
              <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} className="scale-75" />
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Code className="h-3 w-3" /> Advanced pattern</span>
            </div>
            {advancedMode && (
              <div className="flex gap-1">
                <Input className="h-7 text-xs font-mono flex-1" placeholder="/products/*" value={customPattern} onChange={(e) => setCustomPattern(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} />
                <Button size="sm" variant="secondary" className="h-7 text-xs px-2" onClick={addCustom}>Add</Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
