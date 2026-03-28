import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, Trash2, Save } from "lucide-react";
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
  show_in_header: boolean;
  is_published: boolean;
};

const defaultNav: NavEditorItem[] = [
  { label: "Home", to: "/", source: "manual", openInNewTab: false, visible: true },
  { label: "Shop", to: "/products", source: "manual", openInNewTab: false, visible: true },
  { label: "Create Your Own", to: "/create", source: "manual", openInNewTab: false, visible: true },
  { label: "Gallery", to: "/gallery", source: "manual", openInNewTab: false, visible: true },
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

export const useNavLinks = () => {
  const [links, setLinks] = useState<NavItem[]>(defaultNav);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav_links")
      .single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setLinks((data.value as NavItem[]).map(toEditorItem).filter((item) => item.visible !== false));
        }
      });
  }, []);

  return links;
};

const NavLinkEditor = () => {
  const [links, setLinks] = useState<NavEditorItem[]>(defaultNav);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sitePages, setSitePages] = useState<SitePageOption[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav_links")
      .single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setLinks((data.value as NavItem[]).map(toEditorItem));
        }
      });

    supabase
      .from("site_pages")
      .select("id,name,title,full_path,slug,page_type,show_in_header,is_published")
      .eq("is_published", true)
      .eq("show_in_header", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setSitePages((data as SitePageOption[]) ?? []);
      });
  }, []);

  const headerPages = useMemo(() => sitePages.filter((page) => page.page_type !== "global"), [sitePages]);

  const save = async () => {
    const payload: NavItem[] = links.map((item) => ({
      label: item.label,
      to: normalizePath(item.to),
      source: item.source,
      pageId: item.pageId,
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

  const removeLink = (i: number) => setLinks(links.filter((_, j) => j != i));

  const updateLink = (i: number, field: keyof NavEditorItem, value: string | boolean) => {
    setLinks((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };

  const applySitePage = (i: number, pageId: string) => {
    const page = headerPages.find((item) => item.id === pageId);
    if (!page) return;

    setLinks((prev) => {
      const updated = [...prev];
      updated[i] = {
        ...updated[i],
        source: "site_page",
        pageId: page.id,
        label: page.title || page.name || page.slug,
        to: normalizePath(page.full_path),
      };
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

        <div className="mt-6 space-y-3">
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
                    <Select value={link.source} onValueChange={(value: NavSource) => updateLink(i, "source", value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="site_page">Site page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {link.source === "site_page" && (
                    <div>
                      <Label className="text-xs">Page</Label>
                      <Select value={link.pageId || ""} onValueChange={(value) => applySitePage(i, value)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Choose page" />
                        </SelectTrigger>
                        <SelectContent>
                          {headerPages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.title || page.name || page.slug}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                    disabled={link.source === "site_page"}
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
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavLinkEditor;
