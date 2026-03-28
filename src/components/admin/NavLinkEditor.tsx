import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, Trash2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type NavSource = "manual" | "site_page";

export interface NavItem {
  label: string;
  to: string;
  source?: NavSource;
  pageId?: string;
  openInNewTab?: boolean;
  visible?: boolean;
}

type NavEditorItem = NavItem & {
  source: NavSource;
  pageId?: string;
  openInNewTab?: boolean;
  visible?: boolean;
};

type SitePageOption = {
  id: string;
  name: string;
  title: string | null;
  full_path: string;
  slug: string;
  page_type: string;
  parent_id?: string | null;
  show_in_header?: boolean;
  show_in_footer?: boolean;
  is_published: boolean;
};

const defaultNav: NavEditorItem[] = [
  { label: "Home", to: "/", source: "manual", openInNewTab: false, visible: true },
  { label: "Products", to: "/products", source: "manual", openInNewTab: false, visible: true },
  { label: "Create Your Own", to: "/create", source: "manual", openInNewTab: false, visible: true },
  { label: "About", to: "/about", source: "manual", openInNewTab: false, visible: true },
];

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const toEditorItem = (item: NavItem): NavEditorItem => ({
  label: item.label || "Untitled",
  to: normalizePath(item.to || "/"),
  source: item.source === "site_page" ? "site_page" : "manual",
  pageId: item.pageId,
  openInNewTab: Boolean(item.openInNewTab),
  visible: item.visible !== false,
});

const buildPageLabel = (page: SitePageOption, allPages: SitePageOption[]) => {
  const own = page.title || page.name || page.slug;
  if (!page.parent_id) return own;

  const parent = allPages.find((item) => item.id === page.parent_id);
  if (!parent) return own;

  const parentLabel = parent.title || parent.name || parent.slug;
  return `${parentLabel} / ${own}`;
};

const dedupeNavItems = (items: NavItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.visible === false) return false;
    const key = `${normalizePath(item.to)}|${item.label.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeNavigation = (manualLinks: NavItem[], sitePages: SitePageOption[], target: "header" | "footer") => {
  const pageFlag = target === "header" ? "show_in_header" : "show_in_footer";
  const autoPages: NavItem[] = sitePages
    .filter((page) => page.is_published && page.page_type !== "global" && Boolean(page[pageFlag]))
    .map((page) => ({
      label: buildPageLabel(page, sitePages),
      to: normalizePath(page.full_path),
      source: "site_page",
      pageId: page.id,
      openInNewTab: false,
      visible: true,
    }));

  const manual = manualLinks
    .map(toEditorItem)
    .filter((item) => item.visible !== false)
    .map((item) => ({
      ...item,
      to: normalizePath(item.to),
    }));

  return dedupeNavItems([...manual, ...autoPages]);
};

function useMergedNavLinks(target: "header" | "footer") {
  const [links, setLinks] = useState<NavItem[]>(defaultNav);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [navRes, pagesRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "nav_links").maybeSingle(),
        supabase
          .from("site_pages")
          .select("id,name,title,full_path,slug,page_type,parent_id,show_in_header,show_in_footer,is_published")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!mounted) return;

      const manualLinks = Array.isArray(navRes.data?.value) ? (navRes.data.value as NavItem[]) : defaultNav;
      const pages = (pagesRes.data as SitePageOption[] | null) ?? [];
      setLinks(mergeNavigation(manualLinks, pages, target));
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [target]);

  return links;
}

export const useNavLinks = () => useMergedNavLinks("header");
export const useFooterNavLinks = () => useMergedNavLinks("footer");

const NavLinkEditor = () => {
  const [links, setLinks] = useState<NavEditorItem[]>(defaultNav);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sitePages, setSitePages] = useState<SitePageOption[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [navRes, pagesRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "nav_links").maybeSingle(),
        supabase
          .from("site_pages")
          .select("id,name,title,full_path,slug,page_type,parent_id,show_in_header,show_in_footer,is_published")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (navRes.data?.value && Array.isArray(navRes.data.value)) {
        setLinks((navRes.data.value as NavItem[]).map(toEditorItem));
      }

      setSitePages((pagesRes.data as SitePageOption[]) ?? []);
    };

    void load();
  }, []);

  const headerPages = useMemo(
    () =>
      sitePages
        .filter((page) => page.page_type !== "global" && page.is_published && page.show_in_header)
        .map((page) => ({
          ...page,
          displayLabel: buildPageLabel(page, sitePages),
        })),
    [sitePages],
  );

  const save = async () => {
    const payload: NavItem[] = links.map((item) => ({
      label: item.label,
      to: normalizePath(item.to),
      source: "manual",
      pageId: undefined,
      openInNewTab: Boolean(item.openInNewTab),
      visible: item.visible !== false,
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
    setLinks((prev) => [
      ...prev,
      { label: "New Page", to: "/new-page", source: "manual", openInNewTab: false, visible: true },
    ]);

  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, j) => j !== i));

  const updateLink = (i: number, field: keyof NavEditorItem, value: string | boolean) => {
    setLinks((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
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

      <SheetContent className="overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-display uppercase">Header Navigation</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Manual links are managed here. Pages with{" "}
            <span className="font-medium text-foreground">Show in header</span> enabled are added automatically below.
          </div>

          {links.map((link, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDragEnd(i)}
              className="space-y-2 rounded-lg border border-border p-2"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />

                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs">Source</Label>
                    <Select value="manual" disabled>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    value={link.label}
                    onChange={(e) => updateLink(i, "label", e.target.value)}
                    placeholder="Label"
                    className="h-8 text-xs"
                  />

                  <Input
                    value={link.to}
                    onChange={(e) => updateLink(i, "to", e.target.value)}
                    placeholder="/path"
                    className="h-8 text-xs"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={link.visible !== false}
                        onChange={(e) => updateLink(i, "visible", e.target.checked)}
                      />
                      Visible
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(link.openInNewTab)}
                        onChange={(e) => updateLink(i, "openInNewTab", e.target.checked)}
                      />
                      New tab
                    </label>
                  </div>
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
          ))}

          <Button variant="outline" size="sm" onClick={addLink} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Add Link
          </Button>

          <Button onClick={save} className="w-full font-display uppercase tracking-wider">
            <Save className="mr-1 h-4 w-4" /> Save Navigation
          </Button>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Auto pages from Page Settings</p>
            </div>

            {headerPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published pages currently have Show in header enabled.</p>
            ) : (
              <div className="space-y-2">
                {headerPages.map((page) => (
                  <div key={page.id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{page.displayLabel}</p>
                    <p className="text-xs text-muted-foreground">{normalizePath(page.full_path)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavLinkEditor;
