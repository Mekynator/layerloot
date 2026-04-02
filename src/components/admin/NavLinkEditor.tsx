import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, Trash2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import { saveDraftSetting, publishDraftSetting, loadDraftSetting, discardDraftSetting } from "@/hooks/use-draft-publish";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

type NavSource = "manual" | "site_page";
type LocalizedText = string | Partial<Record<SupportedLanguage, string>>;

export interface NavItem {
  label: LocalizedText;
  to: string;
  source?: NavSource;
  pageId?: string;
  openInNewTab?: boolean;
  visible?: boolean;
}

type NavEditorItem = {
  label: Partial<Record<SupportedLanguage, string>>;
  to: string;
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

const currentLang = () => (i18n.resolvedLanguage || i18n.language || "en").split("-")[0] as SupportedLanguage;

const getLocalizedValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  const lang = currentLang();
  const map = value as Partial<Record<SupportedLanguage, string>>;
  return map[lang] || map.en || fallback;
};

const sanitizeLocalizedLabel = (value: unknown): Partial<Record<SupportedLanguage, string>> => {
  if (typeof value === "string") {
    return { en: value };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { en: "" };
  }

  const next: Partial<Record<SupportedLanguage, string>> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    const raw = (value as Record<string, unknown>)[lang];
    if (typeof raw === "string") next[lang] = raw;
  }

  if (!next.en) next.en = "";
  return next;
};

const isNavItem = (value: unknown): value is NavItem => {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;
  return "label" in item && typeof item.to === "string";
};

const normalizePath = (value?: string | null) => {
  if (!value) return "/";
  if (value === "/") return "/";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const asNavItems = (value: unknown): NavItem[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(isNavItem).map((item) => ({
    label: typeof item.label === "string" || (item.label && typeof item.label === "object") ? item.label : "",
    to: normalizePath(item.to),
    source: item.source === "site_page" ? "site_page" : "manual",
    pageId: item.pageId,
    openInNewTab: Boolean(item.openInNewTab),
    visible: item.visible !== false,
  }));
};

const makeLabel = (en: string, da = en, de = en, es = en, ro = en): Partial<Record<SupportedLanguage, string>> => ({
  en,
  da,
  de,
  es,
  ro,
});

const defaultHeaderNav: NavEditorItem[] = [
  {
    label: makeLabel("Home", "Hjem", "Startseite", "Inicio", "Acasă"),
    to: "/",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("Products", "Produkter", "Produkte", "Productos", "Produse"),
    to: "/products",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("Create Your Own", "Skab Din Egen", "Erstelle Dein Eigenes", "Crea el Tuyo", "Creează Al Tău"),
    to: "/create",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("Creations", "Kreationer", "Kreationen", "Creaciones", "Creații"),
    to: "/creations",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("About", "Om Os", "Über Uns", "Acerca de", "Despre"),
    to: "/about",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
];

const defaultFooterNav: NavEditorItem[] = [
  {
    label: makeLabel("Home", "Hjem", "Startseite", "Inicio", "Acasă"),
    to: "/",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("Products", "Produkter", "Produkte", "Productos", "Produse"),
    to: "/products",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("About", "Om Os", "Über Uns", "Acerca de", "Despre"),
    to: "/about",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
  {
    label: makeLabel("Contact", "Kontakt", "Kontakt", "Contacto", "Contact"),
    to: "/contact",
    source: "manual",
    openInNewTab: false,
    visible: true,
  },
];

const toEditorItem = (item: NavItem): NavEditorItem => ({
  label: sanitizeLocalizedLabel(item.label),
  to: normalizePath(item.to || "/"),
  source: item.source === "site_page" ? "site_page" : "manual",
  pageId: item.pageId,
  openInNewTab: Boolean(item.openInNewTab),
  visible: item.visible !== false,
});

const buildPageLabelMap = (
  page: SitePageOption,
  allPages: SitePageOption[],
): Partial<Record<SupportedLanguage, string>> => {
  const own = page.title || page.name || page.slug;
  if (!page.parent_id) return { en: own };

  const parent = allPages.find((item) => item.id === page.parent_id);
  if (!parent) return { en: own };

  const parentLabel = parent.title || parent.name || parent.slug;
  return { en: `${parentLabel} / ${own}` };
};

function useStoredNavLinks(key: "nav_links" | "footer_nav_links", fallback: NavEditorItem[]) {
  const [links, setLinks] = useState<NavItem[]>(fallback);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();

      if (!mounted) return;

      const storedItems = asNavItems(data?.value);
      if (storedItems.length > 0) {
        setLinks(storedItems.map(toEditorItem).filter((item) => item.visible !== false));
      } else {
        setLinks(fallback.filter((item) => item.visible !== false));
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [key, fallback]);

  return links;
}

export const useNavLinks = () => useStoredNavLinks("nav_links", defaultHeaderNav);
export const useFooterNavLinks = () => useStoredNavLinks("footer_nav_links", defaultFooterNav);

const NavLinkEditor = () => {
  const [mode, setMode] = useState<"header" | "footer">("header");
  const [links, setLinks] = useState<NavEditorItem[]>(defaultHeaderNav);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sitePages, setSitePages] = useState<SitePageOption[]>([]);
  const [editingLanguage, setEditingLanguage] = useState<SupportedLanguage>(currentLang());
  const [hasDraft, setHasDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;

  const storageKey = mode === "header" ? "nav_links" : "footer_nav_links";
  const fallbackLinks = mode === "header" ? defaultHeaderNav : defaultFooterNav;

  useEffect(() => {
    const load = async () => {
      const [draftResult, pagesRes] = await Promise.all([
        loadDraftSetting(storageKey),
        supabase
          .from("site_pages")
          .select("id,name,title,full_path,slug,page_type,parent_id,show_in_header,show_in_footer,is_published")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (draftResult) {
        const source = draftResult.hasDraft && draftResult.draft ? draftResult.draft : draftResult.live;
        const storedItems = asNavItems(source);
        setHasDraft(draftResult.hasDraft);
        if (storedItems.length > 0) {
          setLinks(storedItems.map(toEditorItem));
        } else {
          setLinks(fallbackLinks);
        }
      } else {
        setLinks(fallbackLinks);
        setHasDraft(false);
      }

      setSitePages((pagesRes.data as SitePageOption[]) ?? []);
    };

    void load();
  }, [storageKey, fallbackLinks]);

  const availablePages = useMemo(
    () =>
      sitePages
        .filter((page) => page.page_type !== "global" && page.is_published)
        .map((page) => ({
          ...page,
          displayLabelMap: buildPageLabelMap(page, sitePages),
          displayLabel: getLocalizedValue(buildPageLabelMap(page, sitePages), page.title || page.name || page.slug),
          path: normalizePath(page.full_path),
        })),
    [sitePages, editingLanguage],
  );

  const save = async () => {
    const payload: NavItem[] = links.map((item) => ({
      label: sanitizeLocalizedLabel(item.label),
      to: normalizePath(item.to),
      source: item.source,
      pageId: item.pageId,
      openInNewTab: Boolean(item.openInNewTab),
      visible: item.visible !== false,
    }));

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: storageKey, value: payload as any }, { onConflict: "key" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `${mode === "header" ? "Header" : "Footer"} navigation saved!` });
  };

  const addManualLink = () =>
    setLinks((prev) => [
      ...prev,
      {
        label: { en: "New Page" },
        to: "/new-page",
        source: "manual",
        openInNewTab: false,
        visible: true,
      },
    ]);

  const addSitePageLink = () => {
    const firstAvailable = availablePages.find(
      (page) => !links.some((link) => link.pageId === page.id || normalizePath(link.to) === page.path),
    );

    if (!firstAvailable) {
      toast({ title: "No more pages to add" });
      return;
    }

    setLinks((prev) => [
      ...prev,
      {
        label: firstAvailable.displayLabelMap,
        to: firstAvailable.path,
        source: "site_page",
        pageId: firstAvailable.id,
        openInNewTab: false,
        visible: true,
      },
    ]);
  };

  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, j) => j !== i));

  const updateLink = (i: number, field: keyof NavEditorItem, value: string | boolean) => {
    setLinks((prev) => {
      const updated = [...prev];
      if (field === "label" && typeof value === "string") {
        updated[i] = {
          ...updated[i],
          label: {
            ...updated[i].label,
            [editingLanguage]: value,
            ...(editingLanguage !== "en" && !updated[i].label.en ? { en: value } : {}),
          },
        };
      } else {
        updated[i] = { ...updated[i], [field]: value };
      }
      return updated;
    });
  };

  const applySitePage = (i: number, pageId: string) => {
    const page = availablePages.find((item) => item.id === pageId);
    if (!page) return;

    setLinks((prev) => {
      const updated = [...prev];
      updated[i] = {
        ...updated[i],
        source: "site_page",
        pageId: page.id,
        label: page.displayLabelMap,
        to: page.path,
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
          <SheetTitle className="font-display uppercase">Navigation Manager</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <Label className="text-xs">Editing</Label>
            <Select value={mode} onValueChange={(value: "header" | "footer") => setMode(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header navigation</SelectItem>
                <SelectItem value="footer">Footer quick links</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Editing label language</Label>
            <Select value={editingLanguage} onValueChange={(value: SupportedLanguage) => setEditingLanguage(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()} — {LANGUAGE_LABELS[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            This editor is the source of truth for visible navigation order. Labels are now stored per language. If a
            translation is missing, English is used as fallback.
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
                          {availablePages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.displayLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Input
                    value={link.label[editingLanguage] || (editingLanguage !== "en" ? link.label.en || "" : "")}
                    onChange={(e) => updateLink(i, "label", e.target.value)}
                    placeholder={`Label (${editingLanguage.toUpperCase()})`}
                    className="h-8 text-xs"
                  />

                  <Input
                    value={link.to}
                    onChange={(e) => updateLink(i, "to", e.target.value)}
                    placeholder="/path"
                    className="h-8 text-xs"
                    disabled={link.source === "site_page"}
                  />

                  <div className="rounded-md border border-border bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
                    Preview: {getLocalizedValue(link.label, "Untitled")}
                  </div>

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

          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" onClick={addManualLink} className="w-full">
              <Plus className="mr-1 h-4 w-4" /> Add Manual Link
            </Button>

            <Button variant="outline" size="sm" onClick={addSitePageLink} className="w-full">
              <FileText className="mr-1 h-4 w-4" /> Add Site Page Link
            </Button>
          </div>

          <Button onClick={save} className="w-full font-display uppercase tracking-wider">
            <Save className="mr-1 h-4 w-4" /> Save Navigation
          </Button>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Available site pages</p>
            </div>

            {availablePages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published pages available.</p>
            ) : (
              <div className="space-y-2">
                {availablePages.map((page) => (
                  <div key={page.id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{page.displayLabel}</p>
                    <p className="text-xs text-muted-foreground">{page.path}</p>
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
