import { useMemo, useState, useEffect } from "react";
import { GripVertical, Plus, Trash2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SitePageRecord } from "@/hooks/use-page-blocks";

export interface NavItem {
  label: string;
  to: string;
}

type NavEditorItem = NavItem & {
  source: "manual" | "site_page";
  pageId?: string | null;
  openInNewTab?: boolean;
  visible?: boolean;
};

const defaultNav: NavEditorItem[] = [
  { label: "Home", to: "/", source: "manual", visible: true },
  { label: "Shop", to: "/products", source: "manual", visible: true },
  { label: "Create Your Own", to: "/create", source: "manual", visible: true },
  { label: "Gallery", to: "/gallery", source: "manual", visible: true },
  { label: "About", to: "/about", source: "manual", visible: true },
];

const buildPagePath = (page: SitePageRecord) => {
  if (page.is_home) return "/";
  return page.full_path || `/${page.slug}`;
};

const prettifyPath = (page: SitePageRecord, parentMap: Map<string, SitePageRecord>) => {
  if (!page.parent_id) return page.title || page.name || page.slug;
  const parent = parentMap.get(page.parent_id);
  return `${parent?.title || parent?.name || parent?.slug || "Parent"} / ${page.title || page.name || page.slug}`;
};

const normalizeStoredLinks = (value: unknown): NavEditorItem[] => {
  if (!Array.isArray(value)) return defaultNav;
  return value
    .filter(Boolean)
    .map((item: any) => ({
      label: String(item?.label || ""),
      to: String(item?.to || "/"),
      source: item?.source === "site_page" ? "site_page" : "manual",
      pageId: item?.pageId || null,
      openInNewTab: Boolean(item?.openInNewTab),
      visible: item?.visible !== false,
    }))
    .filter((item) => item.label && item.to);
};

export const useNavLinks = () => {
  const [links, setLinks] = useState<NavItem[]>(defaultNav);

  useEffect(() => {
    let mounted = true;

    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav_links")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const normalized = normalizeStoredLinks(data?.value);
        setLinks(normalized.filter((link) => link.visible !== false).map(({ label, to }) => ({ label, to })));
      });

    return () => {
      mounted = false;
    };
  }, []);

  return links;
};

const NavLinkEditor = () => {
  const [links, setLinks] = useState<NavEditorItem[]>(defaultNav);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pages, setPages] = useState<SitePageRecord[]>([]);
  const [pageSearch, setPageSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [navRes, pagesRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "nav_links").maybeSingle(),
        supabase
          .from("site_pages")
          .select("*")
          .eq("is_published", true)
          .neq("page_type", "global")
          .order("sort_order")
          .order("title"),
      ]);

      if (!mounted) return;

      setLinks(normalizeStoredLinks(navRes.data?.value));
      setPages(((pagesRes.data as SitePageRecord[] | null) ?? []).filter((page) => page.is_published));
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const parentMap = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);

  const filteredPages = useMemo(() => {
    const query = pageSearch.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) => {
      const haystack = [page.name, page.title, page.slug, page.full_path, prettifyPath(page, parentMap)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [pageSearch, pages, parentMap]);

  const save = async () => {
    const payload = links
      .filter((link) => link.label && link.to)
      .map((link) => ({
        label: link.label,
        to: link.to,
        source: link.source,
        pageId: link.pageId || null,
        openInNewTab: Boolean(link.openInNewTab),
        visible: link.visible !== false,
      }));

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "nav_links", value: payload as any }, { onConflict: "key" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Navigation saved!" });
  };

  const addLink = () =>
    setLinks([...links, { label: "New Page", to: "/new-page", source: "manual", visible: true, openInNewTab: false }]);

  const addPageLink = (page: SitePageRecord) => {
    const nextItem: NavEditorItem = {
      label: page.title || page.name || page.slug,
      to: buildPagePath(page),
      source: "site_page",
      pageId: page.id,
      visible: true,
      openInNewTab: false,
    };
    setLinks((prev) => [...prev, nextItem]);
  };

  const removeLink = (i: number) => setLinks(links.filter((_, j) => j !== i));

  const updateLink = (i: number, field: keyof NavEditorItem, value: string | boolean) => {
    const updated = [...links];
    updated[i] = { ...updated[i], [field]: value };
    setLinks(updated);
  };

  const handleDragEnd = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...links];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setLinks(reordered);
    setDragIndex(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-display text-xs uppercase tracking-wider text-foreground hover:text-primary-foreground"
        >
          Edit Nav Links
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display uppercase">Header Navigation</SheetTitle>
        </SheetHeader>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-display text-xs uppercase tracking-wider">Navigation links</Label>
              <Badge variant="secondary">{links.length}</Badge>
            </div>

            {links.map((link, i) => (
              <div
                key={`${link.to}-${i}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDragEnd(i)}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                  <Badge variant="outline">{link.source === "site_page" ? "Page" : "Manual"}</Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground">Visible</Label>
                      <Switch
                        checked={link.visible !== false}
                        onCheckedChange={(checked) => updateLink(i, "visible", checked)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLink(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Label</Label>
                  <Input
                    value={link.label}
                    onChange={(e) => updateLink(i, "label", e.target.value)}
                    placeholder="Label"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Destination</Label>
                  <Input
                    value={link.to}
                    onChange={(e) => updateLink(i, "to", e.target.value)}
                    placeholder="/path"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Source type</Label>
                    <Select
                      value={link.source}
                      onValueChange={(value) => updateLink(i, "source", value as NavEditorItem["source"])}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="site_page">Site page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2 pb-2">
                      <Switch
                        checked={Boolean(link.openInNewTab)}
                        onCheckedChange={(checked) => updateLink(i, "openInNewTab", checked)}
                      />
                      <Label className="text-[11px] text-muted-foreground">New tab</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addLink} className="w-full">
              <Plus className="mr-1 h-4 w-4" /> Add Manual Link
            </Button>
            <Button onClick={save} className="w-full font-display uppercase tracking-wider">
              <Save className="mr-1 h-4 w-4" /> Save Navigation
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <Label className="font-display text-xs uppercase tracking-wider">Add from site pages</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                placeholder="Search pages..."
                className="pl-8"
              />
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {filteredPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => addPageLink(page)}
                  className="w-full rounded-lg border border-border p-3 text-left transition hover:border-primary hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{prettifyPath(page, parentMap)}</p>
                      <p className="text-xs text-muted-foreground">{buildPagePath(page)}</p>
                    </div>
                    <Badge variant="outline">{page.page_type}</Badge>
                  </div>
                </button>
              ))}

              {filteredPages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No pages found.
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavLinkEditor;
