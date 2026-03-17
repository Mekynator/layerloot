import { useEffect, useState } from "react";
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
  ChevronDown,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";
import EditableBlockWrapper from "@/components/admin/EditableBlockWrapper";
import BlockEditorPanel from "@/components/admin/BlockEditorPanel";
import NavLinkEditor from "@/components/admin/NavLinkEditor";
import PageBackgroundEditor from "@/components/admin/PageBackgroundEditor";

const pageGroups = [
  {
    label: "Main Pages",
    pages: [
      { value: "home", label: "Home" },
      { value: "products", label: "Products" },
      { value: "about", label: "About" },
      { value: "contact", label: "Contact" },
      { value: "gallery", label: "Gallery" },
      { value: "create-your-own", label: "Create Your Own" },
      { value: "submit-design", label: "Submit Design" },
      { value: "faq", label: "FAQ" },
      { value: "shipping-info", label: "Shipping Info" },
      { value: "returns", label: "Returns" },
    ],
  },
  {
    label: "Global Layout",
    pages: [
      { value: "global_header_top", label: "Global Header Top" },
      { value: "global_header_bottom", label: "Global Header Bottom" },
      { value: "global_before_main", label: "Global Before Main" },
      { value: "global_after_main", label: "Global After Main" },
      { value: "global_footer_top", label: "Global Footer Top" },
      { value: "global_footer_bottom", label: "Global Footer Bottom" },
    ],
  },
];

const defaultPages = pageGroups.flatMap((group) => group.pages.map((page) => page.value));

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
};

const pageLabelMap = new Map(
  pageGroups.flatMap((group) => group.pages.map((page) => [page.value, page.label] as const)),
);

const prettyPageLabel = (slug: string) =>
  pageLabelMap.get(slug) ||
  slug
    .replace(/^global_/, "Global ")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const placementLabel = (page: string, placement?: string) => {
  if (!placement) return "Default";
  const map: Record<string, Record<string, string>> = {
    products: { after_products: "After products" },
    contact: { after_contact: "After contact" },
    gallery: { after_gallery: "After gallery" },
    "create-your-own": { after_create_your_own: "After tools" },
    "submit-design": { after_submit_design: "After submit form" },
  };
  return map[page]?.[placement] || placement;
};

const PageEditor = () => {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activePage, setActivePage] = useState("home");
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [allPages, setAllPages] = useState<string[]>(defaultPages);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPageSlug, setNewPageSlug] = useState("");
  const [deletePageOpen, setDeletePageOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [sDragIndex, setSDragIndex] = useState<number | null>(null);
  const [sDragOverIndex, setSDragOverIndex] = useState<number | null>(null);
  const [backgroundEditorOpen, setBackgroundEditorOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [isAdmin, loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "custom_pages")
      .single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          const customSlugs = (data.value as any[]).map((p: any) => p.slug);
          const merged = Array.from(new Set([...defaultPages, ...customSlugs]));
          setAllPages(merged);
        }
      });
  }, []);

  const fetchBlocks = async () => {
    const { data } = await supabase.from("site_blocks").select("*").eq("page", activePage).order("sort_order");
    setBlocks((data as SiteBlock[]) ?? []);
  };

  useEffect(() => {
    fetchBlocks();
  }, [activePage]);

  const pageBlocks = blocks.filter((b) => b.page === activePage).sort((a, b) => a.sort_order - b.sort_order);
  const selectedBlock = pageBlocks.find((b) => b.id === selectedBlockId) || null;
  const customPages = allPages.filter((p) => !defaultPages.includes(p));

  const addBlock = async (type: string) => {
    const sortOrder =
      insertAtIndex !== null
        ? insertAtIndex
        : pageBlocks.length > 0
          ? Math.max(...pageBlocks.map((b) => b.sort_order)) + 1
          : 0;

    if (insertAtIndex !== null) {
      const toShift = pageBlocks.filter((b) => b.sort_order >= sortOrder);
      await Promise.all(
        toShift.map((b) =>
          supabase
            .from("site_blocks")
            .update({ sort_order: b.sort_order + 1 })
            .eq("id", b.id),
        ),
      );
    }

    let defaultContent: any = {};
    switch (type) {
      case "categories":
        defaultContent = { heading: "Shop by Category", subheading: "Find exactly what you need", limit: 6 };
        break;
      case "featured_products":
        defaultContent = { heading: "Best Sellers", subheading: "Our most popular 3D printed items", limit: 8 };
        break;
      case "how_it_works":
        defaultContent = { heading: "How It Works", subheading: "From idea to your doorstep in 4 simple steps" };
        break;
      case "faq":
        defaultContent = { heading: "Frequently Asked Questions" };
        break;
      case "shipping_banner":
        defaultContent = { text: "Free shipping on orders over 500 kr" };
        break;
      case "hero":
        defaultContent = {
          eyebrow: "3D Printing Essentials",
          heading: "New hero title",
          subheading: "Describe the section here",
          button_text: "Explore",
          button_link: "/products",
          secondary_button_text: "Custom Order",
          secondary_button_link: "/create",
        };
        break;
      case "entry_cards":
        defaultContent = {
          cards: [
            { icon: "ShoppingBag", title: "Shop Products", desc: "Card description", link: "/products", cta: "Browse" },
            { icon: "Palette", title: "Customize", desc: "Card description", link: "/create", cta: "Customize" },
            { icon: "Upload", title: "Upload Idea", desc: "Card description", link: "/submit-design", cta: "Upload" },
          ],
        };
        break;
      case "trust_badges":
        defaultContent = {
          badges: [
            { icon: "Truck", title: "Free Shipping", desc: "On orders over 500 kr" },
            { icon: "Shield", title: "Secure Checkout", desc: "Protected checkout" },
            { icon: "Star", title: "Rewards", desc: "Earn points on purchases" },
          ],
        };
        break;
    }

    const { error } = await supabase.from("site_blocks").insert({
      page: activePage,
      block_type: type,
      title: blockTypes.find((bt) => bt.value === type)?.label || type,
      content: defaultContent,
      sort_order: sortOrder,
      is_active: true,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Block added" });
    setAddBlockOpen(false);
    setInsertAtIndex(null);
    fetchBlocks();
  };

  const deleteBlock = async (id: string) => {
    await supabase.from("site_blocks").delete().eq("id", id);
    setSelectedBlockId(null);
    setEditPanelOpen(false);
    toast({ title: "Block deleted" });
    fetchBlocks();
  };

  const duplicateBlock = async (b: SiteBlock) => {
    const maxOrder = pageBlocks.length > 0 ? Math.max(...pageBlocks.map((bl) => bl.sort_order)) + 1 : 0;
    await supabase.from("site_blocks").insert({
      page: b.page,
      block_type: b.block_type,
      title: (b.title ?? "") + " (copy)",
      content: b.content,
      sort_order: maxOrder,
      is_active: b.is_active ?? true,
    });
    toast({ title: "Block duplicated" });
    fetchBlocks();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("site_blocks").update({ is_active: active }).eq("id", id);
    fetchBlocks();
  };

  const moveBlock = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= pageBlocks.length) return;
    const a = pageBlocks[index];
    const b = pageBlocks[swapIndex];
    await Promise.all([
      supabase.from("site_blocks").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("site_blocks").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchBlocks();
  };

  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...pageBlocks];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);
      await Promise.all(reordered.map((b, i) => supabase.from("site_blocks").update({ sort_order: i }).eq("id", b.id)));
      fetchBlocks();
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleStructureDragEnd = async () => {
    if (sDragIndex !== null && sDragOverIndex !== null && sDragIndex !== sDragOverIndex) {
      const reordered = [...pageBlocks];
      const [moved] = reordered.splice(sDragIndex, 1);
      reordered.splice(sDragOverIndex, 0, moved);
      await Promise.all(reordered.map((b, i) => supabase.from("site_blocks").update({ sort_order: i }).eq("id", b.id)));
      toast({ title: "Layout updated" });
      fetchBlocks();
    }
    setSDragIndex(null);
    setSDragOverIndex(null);
  };

  const createPage = async () => {
    const slug = newPageSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) return;

    const updated = [...customPages.map((s) => ({ slug: s, title: prettyPageLabel(s) })), { slug, title: newPageSlug }];

    await supabase.from("site_settings").upsert({ key: "custom_pages", value: updated as any }, { onConflict: "key" });
    const merged = Array.from(new Set([...defaultPages, ...updated.map((p) => p.slug)]));
    setAllPages(merged);
    setActivePage(slug);
    setNewPageOpen(false);
    setNewPageSlug("");
    toast({ title: "Page created" });
  };

  const deletePage = async () => {
    await supabase.from("site_blocks").delete().eq("page", activePage);
    const remainingCustomPages = customPages.filter((p) => p !== activePage);
    await supabase.from("site_settings").upsert(
      {
        key: "custom_pages",
        value: remainingCustomPages.map((s) => ({ slug: s, title: prettyPageLabel(s) })) as any,
      },
      { onConflict: "key" },
    );
    setAllPages([...defaultPages, ...remainingCustomPages]);
    setActivePage("home");
    setDeletePageOpen(false);
    toast({ title: "Page deleted" });
  };

  const scrollToBlock = (id: string) => {
    const el = document.getElementById(`canvas-block-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-16 z-40 border-b border-border bg-foreground text-background">
        <div className="flex h-12 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-background/70 hover:bg-background/10 hover:text-background"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Admin
            </Button>

            <div className="h-5 w-px bg-background/20" />

            <Select
              value={activePage}
              onValueChange={(v) => {
                if (v === "__new__") setNewPageOpen(true);
                else {
                  setActivePage(v);
                  setSelectedBlockId(null);
                }
              }}
            >
              <SelectTrigger className="w-56 border-background/20 bg-background/10 text-background">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {pageGroups.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </SelectLabel>
                    {group.pages
                      .filter((p) => allPages.includes(p.value))
                      .map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}

                {customPages.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Custom Pages
                    </SelectLabel>
                    {customPages.map((p) => (
                      <SelectItem key={p} value={p}>
                        {prettyPageLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                <SelectItem value="__new__" className="font-semibold text-primary">
                  + Create Page
                </SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="hidden md:inline-flex">
              {prettyPageLabel(activePage)}
            </Badge>

            {!defaultPages.includes(activePage) && (
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
              className="text-background/70 hover:bg-background/10 hover:text-background"
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
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Block
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-background/70 hover:bg-background/10 hover:text-background"
            >
              <X className="mr-1 h-4 w-4" /> Exit
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`shrink-0 overflow-y-auto border-r border-border bg-card transition-all duration-300 ${panelCollapsed ? "w-0 overflow-hidden" : "w-72 lg:w-80"}`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <span className="font-display text-xs font-bold uppercase tracking-widest text-foreground">
                Structure
              </span>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {pageBlocks.length} blocks
            </Badge>
          </div>

          <div className="border-b border-border bg-muted/30 px-4 py-3">
            <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">Editing</p>
            <p className="mt-1 text-sm font-medium text-foreground">{prettyPageLabel(activePage)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activePage.startsWith("global_")
                ? "This area appears across the site."
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
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Block
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {pageBlocks.map((block, index) => {
                const bt = blockTypes.find((b) => b.value === block.block_type);
                const Icon = bt?.icon ?? Square;
                const colorClass = BLOCK_COLORS[block.block_type] ?? "border-l-muted-foreground bg-muted/30";
                const isSelected = selectedBlockId === block.id;
                const placement = block.content?.placement as string | undefined;

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
                      onClick={() => {
                        setSelectedBlockId(isSelected ? null : block.id);
                        if (!isSelected) scrollToBlock(block.id);
                      }}
                      className={`group cursor-pointer rounded-md border-l-[3px] px-2 py-2 text-sm transition-all ${colorClass} ${
                        isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "hover:bg-accent/50"
                      } ${!block.is_active ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground" />
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />

                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[11px] font-semibold uppercase tracking-wider text-foreground">
                            {bt?.label ?? block.block_type}
                          </span>
                          {block.title && block.title !== bt?.label && (
                            <span className="block truncate text-[10px] text-muted-foreground">{block.title}</span>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded bg-background/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                              {placementLabel(activePage, placement)}
                            </span>
                          </div>
                        </div>

                        {!block.is_active && <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground" />}

                        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(block.id, !(block.is_active ?? true));
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            {block.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBlockId(block.id);
                              setEditPanelOpen(true);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <PanelLeft className="h-3 w-3" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBlock(block.id);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
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

              <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
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

        <main className="flex-1 overflow-y-auto bg-background">
          {pageBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32">
              <FileText className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="font-display text-lg uppercase text-muted-foreground">Empty Page</p>
              <p className="mt-1 text-sm text-muted-foreground">Click "Add Block" to start building</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setInsertAtIndex(null);
                  setAddBlockOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add First Block
              </Button>
            </div>
          ) : (
            <div className="pb-16">
              <div className="border-b border-border bg-muted/20 px-6 py-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Select
                    value={activePage}
                    onValueChange={(v) => {
                      setActivePage(v);
                      setSelectedBlockId(null);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[220px] bg-background">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {pageGroups.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {group.label}
                          </SelectLabel>

                          {group.pages
                            .filter((p) => allPages.includes(p.value))
                            .map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      ))}

                      {customPages.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Custom Pages
                          </SelectLabel>

                          {customPages.map((p) => (
                            <SelectItem key={p} value={p}>
                              {prettyPageLabel(p)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>

                  <span>Live canvas preview</span>
                </div>
              </div>

              {pageBlocks.map((block, index) => (
                <div key={block.id} id={`canvas-block-${block.id}`}>
                  <EditableBlockWrapper
                    block={block}
                    index={index}
                    total={pageBlocks.length}
                    isSelected={selectedBlockId === block.id}
                    isDragOver={dragOverIndex === index}
                    onSelect={() => setSelectedBlockId(block.id === selectedBlockId ? null : block.id)}
                    onEdit={() => {
                      setSelectedBlockId(block.id);
                      setEditPanelOpen(true);
                    }}
                    onDelete={() => deleteBlock(block.id)}
                    onDuplicate={() => duplicateBlock(block)}
                    onToggleActive={() => toggleActive(block.id, !(block.is_active ?? true))}
                    onMoveUp={() => moveBlock(index, "up")}
                    onMoveDown={() => moveBlock(index, "down")}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIndex(index);
                    }}
                    onDragEnd={handleDragEnd}
                    onInsertBefore={() => {
                      setInsertAtIndex(index > 0 ? pageBlocks[index - 1].sort_order + 1 : 0);
                      setAddBlockOpen(true);
                    }}
                  >
                    {renderBlock(block, true)}
                  </EditableBlockWrapper>
                </div>
              ))}

              <div
                className="flex h-12 items-center justify-center opacity-0 transition-opacity hover:opacity-100"
                onClick={() => {
                  setInsertAtIndex(null);
                  setAddBlockOpen(true);
                }}
              >
                <div className="flex h-0.5 flex-1 bg-primary/30" />
                <button className="mx-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Plus className="h-4 w-4" />
                </button>
                <div className="flex h-0.5 flex-1 bg-primary/30" />
              </div>
            </div>
          )}
        </main>
      </div>

      <BlockEditorPanel
        block={selectedBlock}
        open={editPanelOpen}
        onClose={() => setEditPanelOpen(false)}
        onSave={() => {
          setEditPanelOpen(false);
          fetchBlocks();
        }}
        pages={allPages}
      />

      <PageBackgroundEditor page={activePage} open={backgroundEditorOpen} onOpenChange={setBackgroundEditorOpen} />

      <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Add Section · {prettyPageLabel(activePage)}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {blockTypes.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant="outline"
                onClick={() => addBlock(value)}
                className="h-auto flex-col gap-2 py-3 font-display text-[10px] uppercase tracking-wider"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newPageOpen} onOpenChange={setNewPageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Create Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Page Name</Label>
              <Input
                value={newPageSlug}
                onChange={(e) => setNewPageSlug(e.target.value)}
                placeholder="e.g. campaigns/summer-drop"
              />
            </div>
            <Button
              onClick={createPage}
              disabled={!newPageSlug.trim()}
              className="w-full font-display uppercase tracking-wider"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePageOpen} onOpenChange={setDeletePageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all blocks on "{prettyPageLabel(activePage)}".
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeletePageOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={deletePage} className="flex-1 font-display uppercase">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageEditor;
