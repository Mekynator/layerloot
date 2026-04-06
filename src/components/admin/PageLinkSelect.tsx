import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link2 } from "lucide-react";
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
  { title: "Create Your Own", slug: "/create-your-own" },
  { title: "Submit Design", slug: "/submit-design" },
  { title: "Order Tracking", slug: "/order-tracking" },
  { title: "Account", slug: "/account" },
  { title: "Auth", slug: "/auth" },
];

let cachedDynamic: PageOption[] | null = null;

interface PageLinkSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export default function PageLinkSelect({ label, value, onChange, className }: PageLinkSelectProps) {
  const [dynamicPages, setDynamicPages] = useState<PageOption[]>(cachedDynamic ?? []);
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
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="h-8 flex-1 text-xs font-mono"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Switch to page selector"
            onClick={() => { setIsExternal(false); onChange("/"); }}
          >
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
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            {allPages.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                {p.title} <span className="ml-1 text-muted-foreground font-mono text-[10px]">{p.slug}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Enter external URL"
          onClick={() => { setIsExternal(true); onChange("https://"); }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
