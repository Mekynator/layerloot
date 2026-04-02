import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  loadDraftBlocks, saveDraftBlocks, discardDraftBlocks, publishDraftBlocks,
  type DraftStatus,
} from "@/hooks/use-draft-publish";

type SitePage = Tables<"site_pages">;

type Viewport = "desktop" | "tablet" | "mobile";

type UndoEntry = { blocks: SiteBlock[]; label: string };

/** Identifies a selected element within a block */
export interface SelectedElement {
  blockId: string;
  /** "root" = whole block, or a content key like "heading", "buttons.0.text" */
  nodeKey: string;
  /** Type of element */
  nodeType: "text" | "icon" | "button" | "media" | "layout" | "root";
  /** For repeater items, the item index */
  repeaterIndex?: number;
}

interface EditorState {
  // Pages
  pages: SitePage[];
  activePage: string;
  selectedPage: SitePage | null;
  setActivePage: (page: string) => void;
  loadPages: () => Promise<void>;

  // Blocks (draft state)
  draftBlocks: SiteBlock[];
  savedBlocks: SiteBlock[];
  isDirty: boolean;
  selectedBlockId: string | null;
  selectedBlock: SiteBlock | null;
  hoveredBlockId: string | null;

  // Element-level selection
  selectedElement: SelectedElement | null;
  selectElement: (element: SelectedElement | null) => void;
  /** Currently inline-editing text field key (set on double-click) */
  inlineEditingKey: string | null;
  setInlineEditingKey: (key: string | null) => void;

  // Actions
  selectBlock: (id: string | null) => void;
  hoverBlock: (id: string | null) => void;
  updateBlockContent: (id: string, content: Record<string, any>) => void;
  updateBlockMeta: (id: string, patch: Partial<Pick<SiteBlock, "title" | "is_active">>) => void;
  addBlock: (type: string, atIndex?: number) => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  toggleBlockActive: (id: string) => void;

  // Save (draft)
  save: () => Promise<void>;
  saving: boolean;
  discardChanges: () => void;

  // Publish
  publish: () => Promise<void>;
  publishing: boolean;
  discardDraft: () => Promise<void>;
  draftStatus: DraftStatus;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Viewport
  viewport: Viewport;
  setViewport: (v: Viewport) => void;

  // Page management
  frontendPages: SitePage[];
  globalPages: SitePage[];
}

const EditorContext = createContext<EditorState | null>(null);

export function useVisualEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useVisualEditor must be used within VisualEditorProvider");
  return ctx;
}

const sortBlocks = (list: SiteBlock[]) => [...list].sort((a, b) => a.sort_order - b.sort_order);

const isGlobalPage = (page?: Pick<SitePage, "page_type" | "slug"> | null) =>
  page?.page_type === "global" || page?.slug?.startsWith("global_");

export const pageToEditorKey = (page: Pick<SitePage, "slug" | "full_path" | "is_home" | "page_type">) => {
  if (isGlobalPage(page)) return page.slug;
  if (page.is_home || page.full_path === "/") return "home";
  return page.full_path.replace(/^\/+|\/+$/g, "");
};

export const pageToRealPath = (page?: Pick<SitePage, "slug" | "full_path" | "is_home" | "page_type"> | null) => {
  if (!page) return "/";
  if (isGlobalPage(page)) return "/";
  if (page.is_home || page.full_path === "/") return "/";
  return page.full_path.startsWith("/") ? page.full_path : `/${page.full_path}`;
};

export const pageDisplayTitle = (page?: Pick<SitePage, "name" | "title" | "slug" | "full_path" | "is_home"> | null) => {
  if (!page) return "";
  return page.title || page.name || (page.is_home ? "Home" : page.full_path || page.slug);
};

const BLOCK_TYPES = [
  { value: "hero", label: "Hero Banner" },
  { value: "shipping_banner", label: "Shipping Banner" },
  { value: "entry_cards", label: "Entry Cards" },
  { value: "categories", label: "Categories Grid" },
  { value: "featured_products", label: "Featured Products" },
  { value: "how_it_works", label: "How It Works" },
  { value: "faq", label: "FAQ Section" },
  { value: "trust_badges", label: "Trust Badges" },
  { value: "text", label: "Text Block" },
  { value: "image", label: "Image Block" },
  { value: "carousel", label: "Image Carousel" },
  { value: "video", label: "Video Section" },
  { value: "banner", label: "Promo Banner" },
  { value: "cta", label: "Call to Action" },
  { value: "button", label: "Button with Link" },
  { value: "spacer", label: "Spacer" },
  { value: "html", label: "Custom HTML" },
  { value: "embed", label: "Embed / iFrame" },
  { value: "newsletter", label: "Newsletter Form" },
  { value: "instagram_auto_feed", label: "Instagram Auto Feed" },
];

const createDefaultContent = (type: string): Record<string, any> => {
  switch (type) {
    case "hero":
      return {
        eyebrow: "3D Printing Essentials",
        heading: "New hero title",
        subheading: "Describe the section here",
        alignment: "left",
        buttonAlignment: "left",
        visibility: true,
        buttons: [
          { text: "Explore", icon: "ArrowRight", iconPosition: "right", variant: "default", actionType: "internal_link", actionTarget: "/products", openInNewTab: false, visible: true },
          { text: "Custom Order", icon: "", iconPosition: "left", variant: "outline", actionType: "internal_link", actionTarget: "/create", openInNewTab: false, visible: true },
        ],
      };
    case "shipping_banner":
      return { text: "Free shipping on orders over 500 kr", visibility: true };
    case "entry_cards":
      return {
        cards: [
          { icon: "ShoppingBag", title: "Shop Products", desc: "Card description", link: "/products", cta: "Browse" },
          { icon: "Palette", title: "Customize", desc: "Card description", link: "/create", cta: "Customize" },
          { icon: "Upload", title: "Upload Idea", desc: "Card description", link: "/submit-design", cta: "Upload" },
        ],
      };
    case "categories":
      return { heading: "Shop by Category", subheading: "Find exactly what you need", limit: 6 };
    case "featured_products":
      return { heading: "Best Sellers", subheading: "Our most popular 3D printed items", limit: 8 };
    case "how_it_works":
      return { heading: "How It Works", subheading: "From idea to your doorstep in 4 simple steps" };
    case "faq":
      return { heading: "Frequently Asked Questions" };
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
    case "text":
      return { heading: "Section Title", body: "Your text content here." };
    case "spacer":
      return { height: 40 };
    default:
      return {};
  }
};

const MAX_UNDO = 50;

export function VisualEditorProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [activePage, setActivePageRaw] = useState("home");
  const [draftBlocks, setDraftBlocks] = useState<SiteBlock[]>([]);
  const [savedBlocks, setSavedBlocks] = useState<SiteBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [inlineEditingKey, setInlineEditingKey] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("published");

  const selectElement = useCallback((el: SelectedElement | null) => {
    setSelectedElement(el);
    if (!el) setInlineEditingKey(null);
  }, []);

  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const [undoVersion, setUndoVersion] = useState(0);

  const pushUndo = useCallback((label: string, blocks?: SiteBlock[]) => {
    const snapshot = blocks ?? draftBlocks;
    undoStack.current.push({ blocks: snapshot.map(b => ({ ...b, content: { ...(b.content as any) } })), label });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
    setUndoVersion(v => v + 1);
  }, [draftBlocks]);

  const loadPages = useCallback(async () => {
    const { data, error } = await supabase.from("site_pages").select("*").order("sort_order").order("created_at");
    if (error) { toast.error("Error loading pages"); return; }
    setPages((data ?? []) as SitePage[]);
  }, []);

  const fetchBlocks = useCallback(async (page: string) => {
    const { data, error } = await supabase.from("site_blocks").select("*").eq("page", page).order("sort_order");
    if (error) { toast.error("Error loading blocks"); return; }
    const liveBlocks = sortBlocks((data as SiteBlock[]) ?? []);
    setSavedBlocks(liveBlocks);

    // Check for existing draft
    const draft = await loadDraftBlocks(page);
    if (draft) {
      setDraftBlocks(sortBlocks(draft));
      setDraftStatus("draft");
    } else {
      setDraftBlocks(liveBlocks);
      setDraftStatus("published");
    }

    undoStack.current = [];
    redoStack.current = [];
    setUndoVersion(0);
  }, []);

  const setActivePage = useCallback(async (page: string) => {
    // Auto-create global_header / global_footer pages if they don't exist yet
    if ((page === "global_header" || page === "global_footer") && !pages.find(p => p.slug === page)) {
      const label = page === "global_header" ? "Header" : "Footer";
      const { error } = await supabase.from("site_pages").insert({
        slug: page,
        name: label,
        title: label,
        full_path: `/${page}`,
        page_type: "global",
        is_published: true,
        is_system: true,
        show_in_header: false,
        show_in_footer: false,
      });
      if (!error) await loadPages();
    }
    setActivePageRaw(page);
    setSelectedBlockId(null);
    setHoveredBlockId(null);
  }, [pages, loadPages]);

  useEffect(() => { void loadPages(); }, [loadPages]);
  useEffect(() => { if (activePage) void fetchBlocks(activePage); }, [activePage, fetchBlocks]);

  const selectedPage = useMemo(
    () => pages.find(p => pageToEditorKey(p) === activePage) ?? null,
    [pages, activePage],
  );

  const frontendPages = useMemo(() => pages.filter(p => p.page_type !== "global"), [pages]);
  const globalPages = useMemo(() => pages.filter(p => p.page_type === "global"), [pages]);

  const pageBlocks = useMemo(
    () => sortBlocks(draftBlocks.filter(b => b.page === activePage)),
    [draftBlocks, activePage],
  );

  const selectedBlock = useMemo(
    () => pageBlocks.find(b => b.id === selectedBlockId) ?? null,
    [pageBlocks, selectedBlockId],
  );

  const isDirty = useMemo(() => {
    if (draftBlocks.length !== savedBlocks.length) return true;
    return JSON.stringify(draftBlocks) !== JSON.stringify(savedBlocks);
  }, [draftBlocks, savedBlocks]);

  const updateBlockContent = useCallback((id: string, content: Record<string, any>) => {
    setDraftBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], content };
      return next;
    });
  }, []);

  const updateBlockMeta = useCallback((id: string, patch: Partial<Pick<SiteBlock, "title" | "is_active">>) => {
    pushUndo("Update block");
    setDraftBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, [pushUndo]);

  const addBlock = useCallback((type: string, atIndex?: number) => {
    pushUndo("Add block");
    const label = BLOCK_TYPES.find(bt => bt.value === type)?.label || type;
    const newBlock: SiteBlock = {
      id: `draft-${crypto.randomUUID()}`,
      page: activePage,
      block_type: type,
      title: label,
      content: createDefaultContent(type),
      sort_order: atIndex ?? pageBlocks.length,
      is_active: true,
    };

    setDraftBlocks(prev => {
      const others = prev.filter(b => b.page !== activePage);
      const current = sortBlocks(prev.filter(b => b.page === activePage));
      const insertIdx = atIndex ?? current.length;
      current.splice(insertIdx, 0, newBlock);
      return [...others, ...current.map((b, i) => ({ ...b, sort_order: i }))];
    });

    setSelectedBlockId(newBlock.id);
  }, [activePage, pageBlocks.length, pushUndo]);

  const deleteBlock = useCallback((id: string) => {
    pushUndo("Delete block");
    setDraftBlocks(prev => {
      const filtered = prev.filter(b => b.id !== id);
      const pageFiltered = filtered.filter(b => b.page === activePage).map((b, i) => ({ ...b, sort_order: i }));
      const others = filtered.filter(b => b.page !== activePage);
      return [...others, ...pageFiltered];
    });
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [activePage, selectedBlockId, pushUndo]);

  const duplicateBlock = useCallback((id: string) => {
    pushUndo("Duplicate block");
    setDraftBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const source = prev[idx];
      const clone: SiteBlock = {
        ...source,
        id: `draft-${crypto.randomUUID()}`,
        title: `${source.title || source.block_type} (copy)`,
        content: JSON.parse(JSON.stringify(source.content)),
        sort_order: source.sort_order + 1,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      const pageBlocks = next.filter(b => b.page === activePage).map((b, i) => ({ ...b, sort_order: i }));
      const others = next.filter(b => b.page !== activePage);
      return [...others, ...pageBlocks];
    });
  }, [activePage, pushUndo]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    pushUndo("Move block");
    setDraftBlocks(prev => {
      const current = sortBlocks(prev.filter(b => b.page === activePage));
      const others = prev.filter(b => b.page !== activePage);
      const [moved] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, moved);
      return [...others, ...current.map((b, i) => ({ ...b, sort_order: i }))];
    });
  }, [activePage, pushUndo]);

  const toggleBlockActive = useCallback((id: string) => {
    pushUndo("Toggle visibility");
    setDraftBlocks(prev => prev.map(b => b.id === id ? { ...b, is_active: !(b.is_active ?? true) } : b));
  }, [pushUndo]);

  // Save as draft (to site_settings, not directly to site_blocks)
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const currentPageBlocks = sortBlocks(draftBlocks.filter(b => b.page === activePage));
      const ok = await saveDraftBlocks(activePage, currentPageBlocks);
      if (!ok) throw new Error("Failed to save draft");
      setDraftStatus("draft");
      toast.success("Draft saved!");
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [draftBlocks, activePage]);

  // Publish: apply draft to live site_blocks, then delete draft
  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const currentPageBlocks = sortBlocks(draftBlocks.filter(b => b.page === activePage));
      const ok = await publishDraftBlocks(activePage, currentPageBlocks);
      if (!ok) throw new Error("Publish failed");

      // Refresh from DB to get real IDs
      await fetchBlocks(activePage);
      setDraftStatus("published");
      toast.success("Published successfully!");
    } catch (err: any) {
      toast.error(`Publish failed: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  }, [draftBlocks, activePage, fetchBlocks]);

  // Discard draft: delete draft from site_settings, reload live blocks
  const discardDraft = useCallback(async () => {
    await discardDraftBlocks(activePage);
    await fetchBlocks(activePage);
    toast.info("Draft discarded — reverted to published version");
  }, [activePage, fetchBlocks]);

  const discardChanges = useCallback(() => {
    setDraftBlocks(savedBlocks);
    undoStack.current = [];
    redoStack.current = [];
    setUndoVersion(0);
    toast.info("Changes discarded");
  }, [savedBlocks]);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push({ blocks: draftBlocks.map(b => ({ ...b, content: { ...(b.content as any) } })), label: entry.label });
    setDraftBlocks(entry.blocks);
    setUndoVersion(v => v + 1);
  }, [draftBlocks]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push({ blocks: draftBlocks.map(b => ({ ...b, content: { ...(b.content as any) } })), label: entry.label });
    setDraftBlocks(entry.blocks);
    setUndoVersion(v => v + 1);
  }, [draftBlocks]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  const value: EditorState = useMemo(() => ({
    pages,
    activePage,
    selectedPage,
    setActivePage,
    loadPages,
    draftBlocks: pageBlocks,
    savedBlocks,
    isDirty,
    selectedBlockId,
    selectedBlock,
    hoveredBlockId,
    selectedElement,
    selectElement,
    inlineEditingKey,
    setInlineEditingKey,
    selectBlock: setSelectedBlockId,
    hoverBlock: setHoveredBlockId,
    updateBlockContent,
    updateBlockMeta,
    addBlock,
    deleteBlock,
    duplicateBlock,
    moveBlock,
    toggleBlockActive,
    save,
    saving,
    discardChanges,
    publish,
    publishing,
    discardDraft,
    draftStatus,
    undo,
    redo,
    canUndo,
    canRedo,
    viewport,
    setViewport,
    frontendPages,
    globalPages,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pages, activePage, selectedPage, pageBlocks, savedBlocks, isDirty, selectedBlockId, selectedBlock, hoveredBlockId, saving, publishing, draftStatus, viewport, frontendPages, globalPages, undoVersion, selectedElement, inlineEditingKey]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
