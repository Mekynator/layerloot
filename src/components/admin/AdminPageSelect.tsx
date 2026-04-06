import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Link2, Code } from "lucide-react";
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

interface AdminPageSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  allowAdvanced?: boolean;
  className?: string;
}

export default function AdminPageSelect({ label, value, onChange, allowAdvanced = true, className }: AdminPageSelectProps) {
  const [dynamicPages, setDynamicPages] = useState<PageOption[]>(cachedDynamic ?? []);
  const [advancedMode, setAdvancedMode] = useState(() => {
    // Auto-detect advanced patterns like /products/*
    return value.includes("*") || (value.startsWith("/") && !STATIC_PAGES.some((s) => s.slug === value));
  });
  const [isExternal, setIsExternal] = useState(() => value.startsWith("http"));

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

  if (isExternal) {
    return (
      <div className={className}>
        {label && <Label className="text-xs">{label}</Label>}
        <div className="flex gap-1.5">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="h-8 flex-1 text-xs font-mono" />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Switch to page selector" onClick={() => { setIsExternal(false); onChange("/"); }}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (advancedMode) {
    return (
      <div className={className}>
        {label && <Label className="text-xs">{label}</Label>}
        <div className="flex gap-1.5">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/products/*" className="h-8 flex-1 text-xs font-mono" />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Switch to page selector" onClick={() => { setAdvancedMode(false); if (value.includes("*")) onChange("/"); }}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="flex gap-1.5">
        <Select value={allPages.some((p) => p.slug === value) ? value : "__custom__"} onValueChange={(v) => { if (v !== "__custom__") onChange(v); }}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            {allPages.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                {p.title} <span className="ml-1 text-muted-foreground font-mono text-[10px]">{p.slug}</span>
              </SelectItem>
            ))}
            {!allPages.some((p) => p.slug === value) && value && (
              <SelectItem value="__custom__">{value}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <div className="flex gap-0.5">
          {allowAdvanced && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Advanced pattern" onClick={() => setAdvancedMode(true)}>
              <Code className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Enter external URL" onClick={() => { setIsExternal(true); onChange("https://"); }}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
