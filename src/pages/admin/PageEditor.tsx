import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  X,
  Trash2,
  ArrowLeft,
  FileText,
  Square,
  Type,
  Image,
  Columns,
  PlayCircle,
  MousePointer,
  Link2,
  Code,
  Globe,
  Mail,
  LayoutGrid,
  Eye,
  EyeOff,
  GripVertical,
  PanelLeft,
  PanelLeftClose,
  Truck,
  Star,
  HelpCircle,
  ShieldCheck,
  Layers,
  Package,
  FolderTree,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SiteBlock } from "@/components/blocks/BlockRenderer";
import BlockEditorPanel from "@/components/admin/BlockEditorPanel";
import NavLinkEditor from "@/components/admin/NavLinkEditor";
import PageBackgroundEditor from "@/components/admin/PageBackgroundEditor";
import EditorPreviewFrame from "@/components/admin/EditorPreviewFrame";
import { tr } from "@/lib/translate";

type SitePage = Tables<"site_pages">;

type PageFormState = {
  name: string;
  title: string;
  slug: string;
  pageType: "main" | "child";
  parentId: string;
  isPublished: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  isHome: boolean;
};

const emptyPageForm: PageFormState = {
  name: "",
  title: "",
  slug: "",
  pageType: "main",
  parentId: "",
  isPublished: true,
  showInHeader: false,
  showInFooter: false,
  isHome: false,
};

const blockTypes = [
  { value: "hero", label: "Hero Banner", icon: Square },
  { value: "shipping_banner", label: "Shipping Banner", icon: Truck },
  { value: "entry_cards", label: "Entry Cards", icon: Layers },
  { value: "categories", label: "Categories Grid", icon: FolderTree },
  { value: "featured_products", label: "Featured Products", icon: Star },
  { value: "how_it_works", label: "How It Works", icon: Package },
  { value: "faq", label: "FAQ Section", icon: HelpCircle },
  { value: "trust_badges", label: "Trust Badges", icon: ShieldCheck },
  { value: "text", label: "Text Block", icon: Type },
  { value: "image", label: "Image Block", icon: Image },
  { value: "carousel", label: "Image Carousel", icon: Columns },
  { value: "video", label: "Video Section", icon: PlayCircle },
  { value: "banner", label: "Promo Banner", icon: Square },
  { value: "cta", label: "Call to Action", icon: MousePointer },
  { value: "button", label: "Button with Link", icon: Link2 },
  { value: "spacer", label: "Spacer", icon: Square },
  { value: "html", label: "Custom HTML", icon: Code },
  { value: "embed", label: "Embed / iFrame", icon: Globe },
  { value: "newsletter", label: "Newsletter Form", icon: Mail },
  { value: "instagram_auto_feed", label: "Instagram Auto Feed", icon: Globe },
];

const BLOCK_COLORS: Record<string, string> = {
  hero: "border-l-primary bg-primary/5",
  shipping_banner: "border-l-amber-500 bg-amber-500/5",
  entry_cards: "border-l-cyan-500 bg-cyan-500/5",
  categories: "border-l-violet-500 bg-violet-500/5",
  featured_products: "border-l-yellow-500 bg-yellow-500/5",
  how_it_works: "border-l-teal-500 bg-teal-500/5",
  faq: "border-l-sky-500 bg-sky-500/5",
  trust_badges: "border-l-emerald-500 bg-emerald-500/5",
  text: "border-l-blue-500 bg-blue-500/5",
  image: "border-l-green-500 bg-green-500/5",
  carousel: "border-l-purple-500 bg-purple-500/5",
  video: "border-l-red-500 bg-red-500/5",
  banner: "border-l-amber-500 bg-amber-500/5",
  cta: "border-l-emerald-500 bg-emerald-500/5",
  button: "border-l-cyan-500 bg-cyan-500/5",
  spacer: "border-l-muted-foreground bg-muted/30",
  html: "border-l-orange-500 bg-orange-500/5",
  embed: "border-l-indigo-500 bg-indigo-500/5",
  newsletter: "border-l-pink-500 bg-pink-500/5",
  instagram_auto_feed: "border-l-fuchsia-500 bg-fuchsia-500/5",
};

const sortBlocks = (list: SiteBlock[]) => [...list].sort((a, b) => a.sort_order - b.sort_order);

const normalizeSlugSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_/]+|[-_/]+$/g, "");

const prettyLabel = (value: string) =>
  value
    .replace(/^global_/, "Global ")
    .replace(/\//g, " / ")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const isGlobalPage = (page?: Pick<SitePage, "page_type" | "slug"> | null) =>
  page?.page_type === "global" || page?.slug?.startsWith("global_");

const pageToEditorKey = (page: Pick<SitePage, "slug" | "full_path" | "is_home" | "page_type">) => {
  if (isGlobalPage(page)) return page.slug;
  if (page.is_home || page.full_path === "/") return "home";
  return page.full_path.replace(/^\/+|\/+$/g, "");
};

const pageToRealPath = (page?: Pick<SitePage, "slug" | "full_path" | "is_home" | "page_type"> | null) => {
  if (!page) return "/";
  if (isGlobalPage(page)) return "/";
  if (page.is_home || page.full_path === "/") return "/";
  return page.full_path.startsWith("/") ? page.full_path : `/${page.full_path}`;
};

const pageDisplayTitle = (page?: Pick<SitePage, "name" | "title" | "slug" | "full_path" | "is_home"> | null) => {
  if (!page) return "";
  return tr(page.title, page.name || prettyLabel(page.is_home ? "home" : page.full_path || page.slug));
};

const placementLabel = (pageKey: string, placement?: string) => {
  if (!placement) return "Default";
  const map: Record<string, Record<string, string>> = {
    products: { after_products: "After products" },
    contact: { after_contact: "After contact" },
    gallery: { after_gallery: "After gallery" },
    create: { after_create_your_own: "After tools" },
    creations: { after_creations: "After creations" },
    "submit-design": { after_submit_design: "After submit form" },
  };
  return map[pageKey]?.[placement] || placement;
};

const createDefaultContent = (type: string) => {
  switch (type) {
    case "categories":
      return { heading: "Shop by Category", subheading: "Find exactly what you need", limit: 6 };
    case "featured_products":
      return { heading: "Best Sellers", subheading: "Our most popular 3D printed items", limit: 8 };
    case "how_it_works":
      return { heading: "How It Works", subheading: "From idea to your doorstep in 4 simple steps" };
    case "faq":
      return { heading: "Frequently Asked Questions" };
    case "shipping_banner":
      return {
        text: "Free shipping on orders over 500 kr",
        section_actionType: "none",
        section_actionTarget: "",
        section_openInNewTab: false,
        visibility: true,
      };
    case "hero":
      return {
        eyebrow: "3D Printing Essentials",
        heading: "New hero title",
        subheading: "Describe the section here",
        button_text: "Explore",
        button_link: "/products",
        secondary_button_text: "Custom Order",
        secondary_button_link: "/create",
        alignment: "left",
        buttonAlignment: "left",
        visibility: true,
        buttons: [
          {
            text: "Explore",
            icon: "ArrowRight",
            iconPosition: "right",
            variant: "default",
            actionType: "internal_link",
            actionTarget: "/products",
            openInNewTab: false,
            visible: true,
          },
          {
            text: "Custom Order",
            icon: "",
            iconPosition: "left",
            variant: "outline",
            actionType: "internal_link",
            actionTarget: "/create",
            openInNewTab: false,
            visible: true,
          },
        ],
      };
    case "entry_cards":
      return {
        cards: [
          { icon: "ShoppingBag", title: "Shop Products", desc: "Card description", link: "/products", cta: "Browse" },
          { icon: "Palette", title: "Customize", desc: "Card description", link: "/create", cta: "Customize" },
          { icon: "Upload", title: "Upload Idea", desc: "Card description", link: "/submit-design", cta: "Upload" },
        ],
      };
    case "trust_badges":
      return {
        badges: [
          { icon: "Truck", title: "Free Shipping", desc: "On orders over 500 kr", visible: true },
          { icon: "Shield", title: "Secure Checkout", desc: "Protected checkout", visible: true },
          { icon: "Star", title: "Rewards", desc: "Earn points on purchases", visible: true },
        ],
        columns: 3,
        visibility: true,
      };
    case "instagram_auto_feed":
      return {
        title: "Follow us on Instagram",
        subtitle: "Latest posts and reels",
        instagramUsername: "layerloot3d",
        itemsToShow: 10,
        layout: "slider",
        autoplay: true,
        showCaptions: false,
        showProfileButton: true,
        visibility: true,
      };
    default:
      return {};
  }
};

const PageEditor = () => {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activePage, setActivePage] = useState("home");
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [pageDialogMode, setPageDialogMode] = useState<"create" | "edit">("create");
  const [pageForm, setPageForm] = useState<PageFormState>(emptyPageForm);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [deletePageOpen, setDeletePageOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [sDragIndex, setSDragIndex] = useState<number | null>(null);
  const [sDragOverIndex, setSDragOverIndex] = useState<number | null>(null);
  const [backgroundEditorOpen, setBackgroundEditorOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const loadPages = async () => {
    const { data, error } = await supabase.from("site_pages").select("*").order("sort_order").order("created_at");

    if (error) {
      toast({ title: "Error loading pages", description: error.message, variant: "destructive" });
      return;
    }

    const nextPages = (data ?? []) as SitePage[];
    setPages(nextPages);

    const activeExists = nextPages.some((page) => pageToEditorKey(page) === activePage);
    if (!activeExists) {
      const homePage = nextPages.find((page) => page.is_home) || nextPages[0];
      if (homePage) setActivePage(pageToEditorKey(homePage));
    }
  };

  useEffect(() => {
    void loadPages();
  }, []);

  const selectedPage = useMemo(
    () => pages.find((page) => pageToEditorKey(page) === activePage) ?? null,
    [pages, activePage],
  );

  const frontendPages = useMemo(() => pages.filter((page) => page.page_type !== "global"), [pages]);
  const globalPages = useMemo(() => pages.filter((page) => page.page_type === "global"), [pages]);
  const childCandidates = useMemo(
    () => frontendPages.filter((page) => page.id !== editingPageId),
    [frontendPages, editingPageId],
  );
  const pageKeys = useMemo(() => pages.map((page) => pageToEditorKey(page)), [pages]);

  const fetchBlocks = async () => {
    const { data, error } = await supabase.from("site_blocks").select("*").eq("page", activePage).order("sort_order");

    if (error) {
      toast({ title: "Error loading blocks", description: error.message, variant: "destructive" });
      return;
    }

    setBlocks((data as SiteBlock[]) ?? []);
  };

  useEffect(() => {
    if (!activePage) return;
    void fetchBlocks();
  }, [activePage]);

  const pageBlocks = useMemo(() => sortBlocks(blocks.filter((b) => b.page === activePage)), [activePage, blocks]);
  const selectedBlock = pageBlocks.find((b) => b.id === selectedBlockId) || null;

  // Auto-open editor panel when a section is selected to provide immediate editing flow.
  useEffect(() => {
    if (selectedBlockId) {
      // open editor panel when a block is selected
      setEditPanelOpen(true);
    }
  }, [selectedBlockId]);

  const replacePageBlocks = (nextPageBlocks: SiteBlock[]) => {
    setBlocks((prev) => {
      const otherPages = prev.filter((b) => b.page !== activePage);
      return sortBlocks([...otherPages, ...nextPageBlocks]);
    });
  };

  const openCreatePageDialog = () => {
    setPageDialogMode("create");
    setEditingPageId(null);
    setPageForm(emptyPageForm);
    setPageDialogOpen(true);
  };

  const openEditPageDialog = () => {
    if (!selectedPage) return;

    setPageDialogMode("edit");
    setEditingPageId(selectedPage.id);
    setPageForm({
      name: selectedPage.name || "",
      title: tr(selectedPage.title ?? "", selectedPage.name || ""),
      slug: selectedPage.is_home ? "home" : selectedPage.slug || "",
      pageType: selectedPage.page_type === "child" ? "child" : "main",
      parentId: selectedPage.parent_id || "",
      isPublished: selectedPage.is_published,
      showInHeader: selectedPage.show_in_header,
      showInFooter: selectedPage.show_in_footer,
      isHome: selectedPage.is_home,
    });
    setPageDialogOpen(true);
  };

  const savePage = async () => {
    const isEditing = pageDialogMode === "edit" && Boolean(editingPageId);
    const parent = childCandidates.find((page) => page.id === pageForm.parentId) ?? null;
    const rawSlug = pageForm.isHome ? "home" : normalizeSlugSegment(pageForm.slug || pageForm.name);

    if (!pageForm.name.trim()) {
      toast({ title: "Page name required" });
      return;
    }

    if (!rawSlug) {
      toast({ title: "Page slug required" });
      return;
    }

    if (pageForm.pageType === "child" && !pageForm.parentId) {
      toast({ title: "Parent page required", description: "Choose the main page this child page belongs to." });
      return;
    }

    if (pageForm.pageType === "child" && !parent) {
      toast({ title: "Invalid parent page" });
      return;
    }

    const fullPath = pageForm.isHome
      ? "/"
      : pageForm.pageType === "child" && parent
        ? `${pageToRealPath(parent).replace(/\/+$/, "")}/${rawSlug}`.replace(/\/+ /g, "/")
        : `/${rawSlug}`;

    const normalizedFullPath = fullPath.replace(/\/{2,}/g, "/");
    const nextEditorKey = pageForm.isHome ? "home" : normalizedFullPath.replace(/^\/+|\/+$/g, "");

    if (pageForm.isHome) {
      const resetQuery = supabase.from("site_pages").update({ is_home: false }).eq("is_home", true);
      const { error: resetError } =
        isEditing && editingPageId ? await resetQuery.neq("id", editingPageId) : await resetQuery;
      if (resetError) {
        toast({ title: "Homepage update failed", description: resetError.message, variant: "destructive" });
        return;
      }
    }

    const payload: Tables<"site_pages"> extends never ? never : any = {
      name: pageForm.name.trim(),
      title: pageForm.title.trim() || pageForm.name.trim(),
      slug: rawSlug,
      full_path: normalizedFullPath,
      parent_id: pageForm.pageType === "child" ? pageForm.parentId : null,
      page_type: pageForm.pageType,
      is_home: pageForm.isHome,
      is_published: pageForm.isPublished,
      show_in_header: pageForm.showInHeader,
      show_in_footer: pageForm.showInFooter,
    };

    const oldPageKey = selectedPage ? pageToEditorKey(selectedPage) : null;
    const { error } = isEditing
      ? await supabase.from("site_pages").update(payload).eq("id", editingPageId!)
      : await supabase.from("site_pages").insert(payload);

    if (error) {
      toast({
        title: isEditing ? "Page update failed" : "Page creation failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (isEditing && oldPageKey && oldPageKey !== nextEditorKey) {
      const { error: blockPageError } = await supabase
        .from("site_blocks")
        .update({ page: nextEditorKey })
        .eq("page", oldPageKey);
      if (blockPageError) {
        toast({
          title: "Page saved, but block migration failed",
          description: blockPageError.message,
          variant: "destructive",
        });
      }
    }

    await loadPages();
    setActivePage(nextEditorKey);
    setPageDialogOpen(false);
    setEditingPageId(null);
    setPageForm(emptyPageForm);
    toast({ title: isEditing ? "Page updated" : "Page created" });
  };

  const deletePage = async () => {
    if (!selectedPage) return;

    const pageKey = pageToEditorKey(selectedPage);

    if (selectedPage.is_home) {
      toast({ title: "Home page cannot be deleted", description: "Set another page as homepage first." });
      return;
    }

    const { error: blocksError } = await supabase.from("site_blocks").delete().eq("page", pageKey);
    if (blocksError) {
      toast({ title: "Delete failed", description: blocksError.message, variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("site_pages").delete().eq("id", selectedPage.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

    setDeletePageOpen(false);
    setSelectedBlockId(null);
    await loadPages();

    const nextHome =
      pages.find((page) => page.id !== selectedPage.id && page.is_home) ||
      pages.find((page) => page.id !== selectedPage.id);
    if (nextHome) setActivePage(pageToEditorKey(nextHome));

    setBlocks([]);
    toast({ title: "Page deleted" });
  };

  const addBlock = async (type: string) => {
    const nextLocalBlocks = [...pageBlocks];
    const insertIndex = insertAtIndex ?? pageBlocks.length;
    const defaultContent = createDefaultContent(type);
    const tempId = `temp-${crypto.randomUUID()}`;

    const optimisticBlock: SiteBlock = {
      id: tempId,
      page: activePage,
      block_type: type,
      title: blockTypes.find((bt) => bt.value === type)?.label || type,
      content: defaultContent,
      sort_order: insertIndex,
      is_active: true,
    };

    nextLocalBlocks.splice(insertIndex, 0, optimisticBlock);
    const normalizedLocal = nextLocalBlocks.map((block, index) => ({ ...block, sort_order: index }));
    replacePageBlocks(normalizedLocal);
    setAddBlockOpen(false);
    setInsertAtIndex(null);

    const orderUpdates = pageBlocks
      .filter((b) => b.sort_order >= insertIndex)
      .map((b) =>
        supabase
          .from("site_blocks")
          .update({ sort_order: b.sort_order + 1 })
          .eq("id", b.id),
      );

    const insertResult = await supabase
      .from("site_blocks")
      .insert({
        page: activePage,
        block_type: type,
        title: optimisticBlock.title,
        content: defaultContent,
        sort_order: insertIndex,
        is_active: true,
      })
      .select()
      .single();

    const shiftedResults = await Promise.all(orderUpdates);
    const shiftError = shiftedResults.find((result) => result.error)?.error;

    if (insertResult.error || shiftError) {
      await fetchBlocks();
      toast({
        title: "Error",
        description: insertResult.error?.message || shiftError?.message || "Could not add block.",
        variant: "destructive",
      });
      return;
    }

    replacePageBlocks(normalizedLocal.map((block) => (block.id === tempId ? (insertResult.data as SiteBlock) : block)));
    toast({ title: "Block added" });
  };

  const deleteBlock = async (id: string) => {
    const previousPageBlocks = pageBlocks;
    const filtered = pageBlocks
      .filter((block) => block.id !== id)
      .map((block, index) => ({ ...block, sort_order: index }));

    replacePageBlocks(filtered);
    setSelectedBlockId(null);
    setEditPanelOpen(false);

    const deleteResult = await supabase.from("site_blocks").delete().eq("id", id);
    const reorderResults = await Promise.all(
      filtered.map((block, index) => supabase.from("site_blocks").update({ sort_order: index }).eq("id", block.id)),
    );
    const reorderError = reorderResults.find((result) => result.error)?.error;

    if (deleteResult.error || reorderError) {
      replacePageBlocks(previousPageBlocks);
      toast({
        title: "Delete failed",
        description: deleteResult.error?.message || reorderError?.message || "Could not delete block.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Block deleted" });
  };

  const toggleActive = async (id: string, active: boolean) => {
    const previousPageBlocks = pageBlocks;
    replacePageBlocks(pageBlocks.map((block) => (block.id === id ? { ...block, is_active: active } : block)));

    const { error } = await supabase.from("site_blocks").update({ is_active: active }).eq("id", id);

    if (error) {
      replacePageBlocks(previousPageBlocks);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  };

  const reorderBlocks = async (nextBlocks: SiteBlock[]) => {
    const previousPageBlocks = pageBlocks;
    const normalized = nextBlocks.map((block, index) => ({ ...block, sort_order: index }));

    replacePageBlocks(normalized);

    const results = await Promise.all(
      normalized.map((block, index) => supabase.from("site_blocks").update({ sort_order: index }).eq("id", block.id)),
    );

    const error = results.find((result) => result.error)?.error;
    if (error) {
      replacePageBlocks(previousPageBlocks);
      toast({ title: "Reorder failed", description: error.message, variant: "destructive" });
    }
  };

  const handleMoveBlock = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const reordered = [...pageBlocks];
    const draggedIndex = reordered.findIndex((block) => block.id === draggedId);
    const targetIndex = reordered.findIndex((block) => block.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await reorderBlocks(reordered);
    setSelectedBlockId(draggedId);
    toast({ title: "Block reordered" });
  };

  const handleStructureDragEnd = async () => {
    if (sDragIndex !== null && sDragOverIndex !== null && sDragIndex !== sDragOverIndex) {
      const reordered = [...pageBlocks];
      const [moved] = reordered.splice(sDragIndex, 1);
      reordered.splice(sDragOverIndex, 0, moved);
      await reorderBlocks(reordered);
      toast({ title: "Layout updated" });
    }
    setSDragIndex(null);
    setSDragOverIndex(null);
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="sticky top-0 z-40 border-b border-border/30 bg-card/95 backdrop-blur-xl text-foreground">
        <div className="flex h-12 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Admin
            </Button>

            <div className="h-5 w-px bg-border/30" />

            <Select
              value={activePage}
              onValueChange={(value) => {
                if (value === "__new__") {
                  openCreatePageDialog();
                  return;
                }
                setActivePage(value);
                setSelectedBlockId(null);
              }}
            >
              <SelectTrigger className="w-72 border-border/40 bg-background-secondary/50 text-foreground">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {frontendPages.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Site Pages
                    </SelectLabel>
                    {frontendPages.map((page) => (
                      <SelectItem key={page.id} value={pageToEditorKey(page)}>
                        {pageDisplayTitle(page)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {globalPages.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Global Layout
                    </SelectLabel>
                    {globalPages.map((page) => (
                      <SelectItem key={page.id} value={pageToEditorKey(page)}>
                        {pageDisplayTitle(page)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                <SelectItem value="__new__" className="font-semibold text-primary">
                  + Create Page
                </SelectItem>
              </SelectContent>
            </Select>

            {selectedPage && (
              <Badge variant="secondary" className="hidden md:inline-flex">
                {pageDisplayTitle(selectedPage)}
              </Badge>
            )}

            {selectedPage && selectedPage.page_type !== "global" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(pageToRealPath(selectedPage))}
                className="text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              >
                Open real page
              </Button>
            )}

            {selectedPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={openEditPageDialog}
                className="text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              >
                <Settings2 className="mr-1 h-3.5 w-3.5" /> Page Settings
              </Button>
            )}

            {selectedPage && !selectedPage.is_home && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletePageOpen(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive/80"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Page
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPanelCollapsed(!panelCollapsed)}
              className="text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            >
              {panelCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>

            <NavLinkEditor />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setBackgroundEditorOpen(true)}
              className="font-display text-xs uppercase tracking-wider text-foreground hover:text-primary-foreground"
            >
              Page Background
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setInsertAtIndex(null);
                setAddBlockOpen(true);
              }}
              className="font-display text-xs uppercase tracking-wider"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" /> Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`shrink-0 overflow-y-auto border-r border-border/30 bg-card/80 backdrop-blur-xl transition-all duration-300 ${
            panelCollapsed ? "w-0 overflow-hidden" : "w-72 lg:w-80"
          }`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/30 bg-card/95 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <div>
                <div className="font-display text-[11px] font-bold uppercase tracking-wider text-foreground">Sections</div>
                <div className="text-[10px] text-muted-foreground">Page sections & ordering</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px]">{pageBlocks.length}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setInsertAtIndex(null); setAddBlockOpen(true); }} className="text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
              </Button>
            </div>
          </div>

          <div className="border-b border-border/30 bg-background-secondary/50 px-4 py-3">
            <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">Editing</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {selectedPage ? pageDisplayTitle(selectedPage) : prettyLabel(activePage)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedPage?.page_type === "global"
                ? "This area appears across the site."
                : selectedPage?.page_type === "child"
                  ? "This is a child/slave page inside the site structure."
                  : "This controls the live public page layout."}
            </p>
          </div>

          {pageBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-display text-xs uppercase text-muted-foreground">Empty page</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  setInsertAtIndex(null);
                  setAddBlockOpen(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {pageBlocks.map((block, index) => {
                const bt = blockTypes.find((b) => b.value === block.block_type);
                const Icon = bt?.icon ?? Square;
                const colorClass = BLOCK_COLORS[block.block_type] ?? "border-l-muted-foreground bg-muted/30";
                const isSelected = selectedBlockId === block.id;
                const placement = (block.content as Record<string, any> | null)?.placement as string | undefined;
                  return (
                    <div key={block.id}>
                      {sDragOverIndex === index && sDragIndex !== index && (
                        <div className="mx-2 h-0.5 rounded bg-primary" />
                      )}

                      <div
                        draggable
                        onDragStart={() => setSDragIndex(index)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setSDragOverIndex(index);
                        }}
                        onDragEnd={handleStructureDragEnd}
                        onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                        className={`group relative flex cursor-pointer items-center gap-3 rounded-lg border-l-[4px] px-3 py-3 text-sm transition-all duration-200 ${colorClass} ${
                          isSelected ? "bg-background/60 ring-2 ring-primary/60 ring-offset-1 ring-offset-card shadow-[0_6px_24px_-8px_hsl(217_91%_60%/0.08)]" : "hover:bg-accent/30"
                        } ${!block.is_active ? "opacity-50" : ""}`}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Icon className="h-4 w-4 shrink-0 text-foreground/70" />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-display text-[12px] font-semibold uppercase tracking-wider text-foreground">
                              {bt?.label ?? block.block_type}
                            </span>
                            {Boolean(tr(block.title, "")) && tr(block.title, "") !== bt?.label && (
                              <span className="text-[11px] text-muted-foreground">{tr(block.title, "")}</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {placementLabel(activePage, placement)}
                            </span>
                            {!block.is_active && <span className="text-[10px] text-amber-600">Hidden</span>}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleActive(block.id, !(block.is_active ?? true));
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            aria-label="Toggle visibility"
                          >
                            {block.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBlockId(block.id);
                              setEditPanelOpen(true);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            aria-label="Edit section"
                          >
                            <PanelLeft className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteBlock(block.id);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                            aria-label="Delete section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
              })}

              {sDragOverIndex === pageBlocks.length && <div className="mx-2 h-0.5 rounded bg-primary" />}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setSDragOverIndex(pageBlocks.length);
                }}
                className="h-2"
              />

              <button
                onClick={() => {
                  setInsertAtIndex(null);
                  setAddBlockOpen(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="font-display text-[10px] uppercase tracking-wider">Add Section</span>
              </button>

              <div className="mt-4 rounded-xl border border-border/30 bg-card/60 p-3 backdrop-blur-xl" style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.3)' }}>
                <h3 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Summary
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-display text-lg font-bold text-foreground">{pageBlocks.length}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-primary">
                      {pageBlocks.filter((b) => b.is_active).length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Visible</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-muted-foreground">
                      {pageBlocks.filter((b) => !b.is_active).length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Hidden</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-hidden bg-background">
          <EditorPreviewFrame
            page={activePage}
            pagePath={pageToRealPath(selectedPage)}
            blocks={pageBlocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={(id) => setSelectedBlockId(id)}
            onEditBlock={(id) => {
              setSelectedBlockId(id);
              setEditPanelOpen(true);
            }}
            onToggleActive={(id) => {
              const block = pageBlocks.find((b) => b.id === id);
              if (block) void toggleActive(id, !(block.is_active ?? true));
            }}
            onAddBefore={(id) => {
              const blockIndex = pageBlocks.findIndex((b) => b.id === id);
              if (blockIndex === -1) return;
              setInsertAtIndex(blockIndex);
              setAddBlockOpen(true);
            }}
            onAddAtIndex={(index) => { setInsertAtIndex(index); setAddBlockOpen(true); }}
            onMoveBlock={handleMoveBlock}
          />
        </main>
      </div>

      <BlockEditorPanel
        block={selectedBlock}
        open={editPanelOpen}
        onClose={() => setEditPanelOpen(false)}
        onSave={() => {
          setEditPanelOpen(false);
          void fetchBlocks();
          void loadPages();
        }}
        pages={pageKeys}
      />

      <PageBackgroundEditor page={activePage} open={backgroundEditorOpen} onOpenChange={setBackgroundEditorOpen} />

      <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider">
              Add Section · {selectedPage ? pageDisplayTitle(selectedPage) : prettyLabel(activePage)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {blockTypes.map(({ value, label, icon: Icon }) => {
              const accentColor = BLOCK_COLORS[value] ?? "";
              return (
                <button
                  key={value}
                  onClick={() => void addBlock(value)}
                  className={`group relative flex h-auto flex-col items-center gap-2.5 rounded-xl border border-border/40 bg-card/60 px-3 py-4 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_40px_-8px_hsl(217_91%_60%/0.2)] ${accentColor ? `border-l-[3px] ${accentColor.split(' ')[0]}` : ''}`}
                  style={{ boxShadow: '0 4px 20px -4px hsl(228 33% 2% / 0.4), inset 0 1px 0 0 hsl(215 25% 95% / 0.04)' }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-foreground/80 group-hover:text-foreground">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">
              {pageDialogMode === "create" ? "Create Page" : "Edit Page"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Page name</Label>
                <Input
                  value={pageForm.name}
                  onChange={(e) => setPageForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Example: Summer Drop"
                />
              </div>
              <div>
                <Label>Page title</Label>
                <Input
                  value={pageForm.title}
                  onChange={(e) => setPageForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Optional display title"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Page type</Label>
                <Select
                  value={pageForm.pageType}
                  onValueChange={(value: "main" | "child") =>
                    setPageForm((prev) => ({
                      ...prev,
                      pageType: value,
                      parentId: value === "main" ? "" : prev.parentId,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main page</SelectItem>
                    <SelectItem value="child">Child / slave page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Slug</Label>
                <Input
                  value={pageForm.slug}
                  onChange={(e) => setPageForm((prev) => ({ ...prev, slug: normalizeSlugSegment(e.target.value) }))}
                  placeholder="summer-drop"
                  disabled={pageForm.isHome}
                />
              </div>
            </div>

            {pageForm.pageType === "child" && (
              <div>
                <Label>Parent page</Label>
                <Select
                  value={pageForm.parentId}
                  onValueChange={(value) => setPageForm((prev) => ({ ...prev, parentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose parent page" />
                  </SelectTrigger>
                  <SelectContent>
                    {childCandidates.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {pageDisplayTitle(page)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">Show on live site</p>
                </div>
                <Switch
                  checked={pageForm.isPublished}
                  onCheckedChange={(checked) => setPageForm((prev) => ({ ...prev, isPublished: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Homepage</p>
                  <p className="text-xs text-muted-foreground">Only one page can be home</p>
                </div>
                <Switch
                  checked={pageForm.isHome}
                  onCheckedChange={(checked) => setPageForm((prev) => ({ ...prev, isHome: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Show in header</p>
                  <p className="text-xs text-muted-foreground">Available for header nav</p>
                </div>
                <Switch
                  checked={pageForm.showInHeader}
                  onCheckedChange={(checked) => setPageForm((prev) => ({ ...prev, showInHeader: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Show in footer</p>
                  <p className="text-xs text-muted-foreground">Available for footer links</p>
                </div>
                <Switch
                  checked={pageForm.showInFooter}
                  onCheckedChange={(checked) => setPageForm((prev) => ({ ...prev, showInFooter: checked }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPageDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => void savePage()} className="flex-1 font-display uppercase tracking-wider">
                {pageDialogMode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePageOpen} onOpenChange={setDeletePageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all blocks on "{selectedPage ? pageDisplayTitle(selectedPage) : activePage}".
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeletePageOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deletePage()} className="flex-1 font-display uppercase">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageEditor;
