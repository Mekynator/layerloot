import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SiteBlock } from "@/components/admin/BlockRenderer";

export type ReusableLibraryKind = "section" | "component" | "template";
export type ReusableSyncMode = "copy" | "global" | "override" | "detached";
export type ReusableSectionCategory =
  | "Hero"
  | "CTA"
  | "FAQ"
  | "Product Grid"
  | "Features"
  | "Testimonials"
  | "Newsletter"
  | "Trust"
  | "Media"
  | "Announcement"
  | "General";

export type ReusableBlockRow = Tables<"reusable_blocks">;

export interface StarterSectionTemplate {
  id: string;
  name: string;
  description: string;
  category: ReusableSectionCategory;
  block_type: string;
  kind: "template";
  content: Record<string, any>;
}

export interface ReusableUsageSummary {
  instanceCount: number;
  pageUsages: Array<{ id: string; page: string; title: string | null }>;
  productUsages: Array<{ id: string; product_id: string | null; title: string | null }>;
}

const META_KEYS = new Set([
  "_reusableId",
  "_reusableKind",
  "_reusableSyncMode",
  "_reusableName",
  "_reusableCategory",
  "_reusableVersion",
  "_reusableBaseContent",
  "_reusableOverrides",
  "_library",
]);

export const REUSABLE_SECTION_CATEGORIES: ReusableSectionCategory[] = [
  "Hero",
  "CTA",
  "FAQ",
  "Product Grid",
  "Features",
  "Testimonials",
  "Newsletter",
  "Trust",
  "Media",
  "Announcement",
  "General",
];

export const STARTER_SECTION_TEMPLATES: StarterSectionTemplate[] = [
  {
    id: "starter-hero-premium",
    name: "Premium Hero",
    description: "A bold, token-friendly hero with strong CTA focus.",
    category: "Hero",
    block_type: "hero",
    kind: "template",
    content: {
      eyebrow: "LayerLoot Originals",
      heading: "Turn your next idea into a premium print",
      subheading: "Launch with a hero section that already feels polished, branded, and ready for conversion.",
      alignment: "left",
      buttonAlignment: "left",
      paddingTop: 80,
      paddingBottom: 80,
      sectionWidth: "wide",
      buttons: [
        { text: "Explore Products", icon: "ArrowRight", iconPosition: "right", variant: "default", actionType: "internal_link", actionTarget: "/products", openInNewTab: false, visible: true },
        { text: "Create Your Own", icon: "Sparkles", iconPosition: "left", variant: "outline", actionType: "internal_link", actionTarget: "/create", openInNewTab: false, visible: true },
      ],
    },
  },
  {
    id: "starter-cta-conversion",
    name: "Conversion CTA",
    description: "A clean conversion section for promos, launches, and end-of-page pushes.",
    category: "CTA",
    block_type: "cta",
    kind: "template",
    content: {
      heading: "Ready to build something memorable?",
      subheading: "Use this CTA to drive shoppers from browsing into action.",
      buttonText: "Start Shopping",
      buttonLink: "/products",
      paddingTop: 56,
      paddingBottom: 56,
      sectionWidth: "narrow",
      shadow: "soft",
      borderRadius: 24,
    },
  },
  {
    id: "starter-faq-layout",
    name: "FAQ Layout",
    description: "Starter FAQ with layered questions and clear support prompts.",
    category: "FAQ",
    block_type: "faq",
    kind: "template",
    content: {
      heading: "Frequently asked questions",
      items: [
        { question: "How fast is production?", answer: "Most custom orders are started within 1–2 business days.", visible: true },
        { question: "Can I request a custom model?", answer: "Yes — use the custom order flow or upload your concept directly.", visible: true },
        { question: "Do you ship internationally?", answer: "Shipping options are shown at checkout based on your region.", visible: true },
      ],
      paddingTop: 48,
      paddingBottom: 48,
    },
  },
  {
    id: "starter-product-grid",
    name: "Featured Product Grid",
    description: "A ready-to-use featured products layout for storefront highlights.",
    category: "Product Grid",
    block_type: "featured_products",
    kind: "template",
    content: {
      heading: "Featured collections",
      subheading: "Showcase your bestsellers with a polished product section.",
      limit: 8,
      paddingTop: 48,
      paddingBottom: 48,
    },
  },
  {
    id: "starter-features",
    name: "Features Grid",
    description: "Highlight product or brand benefits in a clear visual grid.",
    category: "Features",
    block_type: "entry_cards",
    kind: "template",
    content: {
      cards: [
        { icon: "Sparkles", title: "Premium finish", desc: "Highlight the quality of your materials and printing workflow.", cta: "Learn more", visible: true },
        { icon: "Shield", title: "Trusted process", desc: "Build confidence around shipping, support, and production.", cta: "See details", visible: true },
        { icon: "Package", title: "Fast delivery", desc: "Show how quickly shoppers can receive their order.", cta: "View shipping", visible: true },
      ],
      paddingTop: 40,
      paddingBottom: 40,
    },
  },
  {
    id: "starter-testimonials",
    name: "Testimonials Starter",
    description: "A customer-proof section ready for ratings and quotes.",
    category: "Testimonials",
    block_type: "testimonials",
    kind: "template",
    content: {
      heading: "Loved by makers and gift buyers",
      items: [
        { name: "Sara", quote: "The final result felt premium from unboxing to display.", rating: 5 },
        { name: "Mark", quote: "Fast turnaround and the quality was even better than expected.", rating: 5 },
      ],
      paddingTop: 48,
      paddingBottom: 48,
    },
  },
  {
    id: "starter-newsletter",
    name: "Newsletter Signup",
    description: "A starter newsletter section for launches, offers, and updates.",
    category: "Newsletter",
    block_type: "newsletter",
    kind: "template",
    content: {
      heading: "Get the next launch first",
      subheading: "Invite your audience to subscribe for offers, drops, and new creations.",
      buttonText: "Join the list",
      paddingTop: 48,
      paddingBottom: 48,
      borderRadius: 24,
    },
  },
  {
    id: "starter-trust-bar",
    name: "Trust Badge Bar",
    description: "A synced-ready announcement or trust section for repeated use.",
    category: "Trust",
    block_type: "trust_badges",
    kind: "template",
    content: {
      badges: [
        { icon: "Truck", title: "Fast shipping", desc: "Tracked delivery on eligible orders", visible: true },
        { icon: "Shield", title: "Secure checkout", desc: "Protected and reliable payment flow", visible: true },
        { icon: "Star", title: "Top rated", desc: "Loved by returning customers", visible: true },
      ],
      columns: 3,
      paddingTop: 28,
      paddingBottom: 28,
    },
  },
];

const clone = <T,>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEmptyObject = (value: unknown) => isObject(value) && Object.keys(value).length === 0;

export const stripReusableMeta = <T extends Record<string, any>>(content: T | null | undefined): T => {
  if (!isObject(content)) return {} as T;
  const next: Record<string, any> = {};
  Object.entries(content).forEach(([key, value]) => {
    if (META_KEYS.has(key) || key === "__deleted") return;
    if (Array.isArray(value)) {
      next[key] = value.map((item) => (isObject(item) ? stripReusableMeta(item) : item));
      return;
    }
    next[key] = isObject(value) ? stripReusableMeta(value) : value;
  });
  return next as T;
};

export const deepMerge = <T extends Record<string, any>>(base: T, patch: Record<string, any> | null | undefined): T => {
  if (!isObject(base)) return clone((patch ?? base) as T);
  if (!isObject(patch)) return clone(base);

  const next: Record<string, any> = { ...base };

  Object.entries(patch).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      next[key] = clone(value);
      return;
    }
    if (isObject(value) && isObject(base[key])) {
      next[key] = deepMerge(base[key], value);
      return;
    }
    next[key] = clone(value);
  });

  return next as T;
};

export const diffReusableContent = (base: unknown, current: unknown): Record<string, any> => {
  if (Array.isArray(base) || Array.isArray(current)) {
    return JSON.stringify(base ?? null) === JSON.stringify(current ?? null) ? {} : clone((current ?? []) as any);
  }

  if (!isObject(base) || !isObject(current)) {
    return JSON.stringify(base ?? null) === JSON.stringify(current ?? null) ? {} : clone((current ?? null) as any);
  }

  const diff: Record<string, any> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(current)]);

  keys.forEach((key) => {
    if (META_KEYS.has(key)) return;
    const baseValue = base[key];
    const currentValue = current[key];

    if (Array.isArray(baseValue) || Array.isArray(currentValue)) {
      if (JSON.stringify(baseValue ?? null) !== JSON.stringify(currentValue ?? null)) {
        diff[key] = clone(currentValue ?? null);
      }
      return;
    }

    if (isObject(baseValue) && isObject(currentValue)) {
      const nested = diffReusableContent(baseValue, currentValue);
      if (!isEmptyObject(nested)) diff[key] = nested;
      return;
    }

    if (JSON.stringify(baseValue ?? null) !== JSON.stringify(currentValue ?? null)) {
      diff[key] = clone(currentValue ?? null);
    }
  });

  return diff;
};

export const getReusableKind = (row?: Partial<ReusableBlockRow> | null, fallbackContent?: Record<string, any> | null): ReusableLibraryKind => {
  const content = (row?.content as Record<string, any> | undefined) || fallbackContent || {};
  const metaKind = content?._library?.kind;
  if (metaKind === "component" || metaKind === "template" || metaKind === "section") return metaKind;
  if (row?.tags?.includes("component")) return "component";
  if (row?.tags?.includes("template")) return "template";
  return "section";
};

export const getReusableCategory = (row?: Partial<ReusableBlockRow> | null, fallbackContent?: Record<string, any> | null): string => {
  const content = (row?.content as Record<string, any> | undefined) || fallbackContent || {};
  const fromMeta = content?._library?.category;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta;
  const firstTag = row?.tags?.find((tag) => tag && !["component", "section", "template"].includes(tag));
  if (firstTag) return firstTag;

  switch (row?.block_type || content?.block_type) {
    case "hero":
      return "Hero";
    case "cta":
    case "button":
    case "banner":
      return "CTA";
    case "faq":
      return "FAQ";
    case "featured_products":
    case "categories":
      return "Product Grid";
    case "testimonials":
    case "social_proof":
      return "Testimonials";
    case "newsletter":
      return "Newsletter";
    case "trust_badges":
    case "shipping_banner":
      return "Trust";
    case "image":
    case "gallery":
    case "carousel":
    case "video":
      return "Media";
    default:
      return "General";
  }
};

export const getReusableVersion = (row?: Partial<ReusableBlockRow> | null, fallbackContent?: Record<string, any> | null) => {
  const content = (row?.content as Record<string, any> | undefined) || fallbackContent || {};
  return Number(content?._library?.version) || Number(content?._reusableVersion) || 1;
};

export const buildReusableInstanceContent = (
  reusable: Pick<ReusableBlockRow, "id" | "name" | "block_type" | "content" | "tags">,
  syncMode: ReusableSyncMode,
  kind?: ReusableLibraryKind,
) => {
  const baseContent = stripReusableMeta((reusable.content as Record<string, any>) || {});
  if (syncMode === "copy") return clone(baseContent);

  const resolvedKind = kind || getReusableKind(reusable, baseContent);
  const category = getReusableCategory(reusable, baseContent);
  const version = getReusableVersion(reusable, baseContent);

  return {
    ...clone(baseContent),
    _reusableId: reusable.id,
    _reusableKind: resolvedKind,
    _reusableSyncMode: syncMode,
    _reusableName: reusable.name,
    _reusableCategory: category,
    _reusableVersion: version,
    _reusableBaseContent: clone(baseContent),
    _reusableOverrides: {},
  };
};

export const detachReusableContent = (content: Record<string, any>) => stripReusableMeta(content);

export const prepareReusableContentForSave = (content: Record<string, any>) => {
  if (!isObject(content) || !content._reusableId) return content;

  const requestedMode = (content._reusableSyncMode || "global") as ReusableSyncMode;
  if (requestedMode === "detached") {
    return detachReusableContent(content);
  }

  const baseContent = stripReusableMeta((content._reusableBaseContent as Record<string, any>) || {});
  const plainContent = stripReusableMeta(content);
  const overrides = diffReusableContent(baseContent, plainContent);
  const hasOverrides = !isEmptyObject(overrides);
  const effectiveMode: ReusableSyncMode = requestedMode === "override"
    ? "override"
    : hasOverrides
      ? "override"
      : "global";

  return {
    ...clone(plainContent),
    _reusableId: String(content._reusableId),
    _reusableKind: String(content._reusableKind || "section"),
    _reusableSyncMode: effectiveMode,
    _reusableName: String(content._reusableName || ""),
    _reusableCategory: String(content._reusableCategory || "General"),
    _reusableVersion: Number(content._reusableVersion) || 1,
    _reusableBaseContent: clone(baseContent),
    _reusableOverrides: effectiveMode === "override" ? overrides : {},
  };
};

export const hydrateReusableContent = (
  currentContent: Record<string, any>,
  reusable?: Pick<ReusableBlockRow, "id" | "name" | "content" | "tags" | "block_type"> | null,
) => {
  if (!isObject(currentContent) || !currentContent._reusableId || !reusable) return currentContent;

  const requestedMode = (currentContent._reusableSyncMode || "global") as ReusableSyncMode;
  if (requestedMode === "detached") return detachReusableContent(currentContent);

  const baseContent = stripReusableMeta((reusable.content as Record<string, any>) || {});
  const overrides = requestedMode === "override"
    ? (isObject(currentContent._reusableOverrides) ? currentContent._reusableOverrides : diffReusableContent(currentContent._reusableBaseContent, stripReusableMeta(currentContent)))
    : {};

  const resolvedContent = requestedMode === "override"
    ? deepMerge(baseContent, overrides)
    : clone(baseContent);

  return {
    ...resolvedContent,
    _reusableId: reusable.id,
    _reusableKind: currentContent._reusableKind || getReusableKind(reusable, baseContent),
    _reusableSyncMode: requestedMode,
    _reusableName: currentContent._reusableName || reusable.name,
    _reusableCategory: currentContent._reusableCategory || getReusableCategory(reusable, baseContent),
    _reusableVersion: getReusableVersion(reusable, baseContent),
    _reusableBaseContent: clone(baseContent),
    _reusableOverrides: requestedMode === "override" ? overrides : {},
  };
};

export async function resolveReusableSiteBlocks(blocks: SiteBlock[]): Promise<SiteBlock[]> {
  const reusableIds = Array.from(new Set(
    blocks
      .map((block) => isObject(block.content) ? String(block.content._reusableId || "") : "")
      .filter(Boolean),
  ));

  if (reusableIds.length === 0) return blocks;

  const { data, error } = await supabase
    .from("reusable_blocks")
    .select("id, name, block_type, content, tags")
    .in("id", reusableIds);

  if (error || !data) return blocks;

  const byId = new Map((data as any[]).map((row) => [row.id, row]));

  return blocks.map((block) => {
    const content = isObject(block.content) ? block.content : {};
    const reusableId = String(content._reusableId || "");
    if (!reusableId) return block;
    const source = byId.get(reusableId);
    return source
      ? { ...block, content: hydrateReusableContent(content, source) }
      : block;
  });
}

async function getNextRevisionNumber(contentType: string, contentId: string) {
  const { data } = await supabase
    .from("content_revisions")
    .select("revision_number")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.revision_number ?? 0) + 1;
}

async function insertReusableRevision(reusableId: string, revisionData: any, action: string, userId?: string) {
  const revisionNumber = await getNextRevisionNumber("reusable_block", reusableId);
  await supabase.from("content_revisions").insert({
    content_type: "reusable_block",
    content_id: reusableId,
    revision_data: revisionData,
    revision_number: revisionNumber,
    action,
    created_by: userId ?? null,
  } as any);
}

export async function upsertReusableFromBlock(options: {
  block: SiteBlock;
  name: string;
  description?: string;
  category?: string;
  kind?: ReusableLibraryKind;
  reusableId?: string | null;
  userId?: string | null;
  thumbnailUrl?: string | null;
}) {
  const {
    block,
    name,
    description,
    category = "General",
    kind = "section",
    reusableId,
    userId,
    thumbnailUrl,
  } = options;

  const cleanContent = stripReusableMeta((block.content as Record<string, any>) || {});
  const versionSeed = Number((block.content as any)?._reusableVersion) || 0;

  const payloadContent = {
    ...clone(cleanContent),
    _library: {
      kind,
      category,
      version: Math.max(1, versionSeed + (reusableId ? 1 : 0)),
      block_type: block.block_type,
      updated_at: new Date().toISOString(),
    },
  };

  const tags = Array.from(new Set([category, kind].filter(Boolean)));

  if (reusableId) {
    const { data: existing } = await supabase.from("reusable_blocks").select("content").eq("id", reusableId).maybeSingle();
    if (existing?.content) {
      await insertReusableRevision(reusableId, existing.content, "update_component", userId ?? undefined);
    }

    const { data, error } = await supabase
      .from("reusable_blocks")
      .update({
        name,
        description: description || null,
        block_type: block.block_type,
        content: payloadContent as any,
        tags,
        thumbnail_url: thumbnailUrl || null,
        updated_by: userId ?? null,
      } as any)
      .eq("id", reusableId)
      .select("*")
      .single();

    if (error) throw error;
    return data as ReusableBlockRow;
  }

  const { data, error } = await supabase
    .from("reusable_blocks")
    .insert({
      name,
      description: description || null,
      block_type: block.block_type,
      content: payloadContent as any,
      tags,
      thumbnail_url: thumbnailUrl || null,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  await insertReusableRevision(data.id, payloadContent, kind === "component" ? "create_component" : "create_section", userId ?? undefined);
  return data as ReusableBlockRow;
}

export async function fetchReusableUsage(reusableId: string): Promise<ReusableUsageSummary> {
  const [{ data: siteBlocks }, { data: productSections }] = await Promise.all([
    supabase.from("site_blocks").select("id, page, title, content, draft_content, has_draft"),
    supabase.from("product_detail_sections").select("id, product_id, title, reusable_block_id").eq("reusable_block_id", reusableId),
  ]);

  const pageUsages = ((siteBlocks ?? []) as any[])
    .filter((row) => {
      const liveContent = row.has_draft && row.draft_content ? row.draft_content : row.content;
      return isObject(liveContent) && String(liveContent._reusableId || "") === reusableId;
    })
    .map((row) => ({ id: row.id, page: row.page, title: row.title ?? null }));

  const productUsages = ((productSections ?? []) as any[]).map((row) => ({
    id: row.id,
    product_id: row.product_id ?? null,
    title: row.title ?? null,
  }));

  return {
    instanceCount: pageUsages.length + productUsages.length,
    pageUsages,
    productUsages,
  };
}

export async function restoreReusableRevision(reusableId: string, revisionNumber: number, userId?: string | null) {
  const { data, error } = await supabase
    .from("content_revisions")
    .select("revision_data")
    .eq("content_type", "reusable_block")
    .eq("content_id", reusableId)
    .eq("revision_number", revisionNumber)
    .single();

  if (error || !data) throw error || new Error("Revision not found");

  const { data: current } = await supabase.from("reusable_blocks").select("content").eq("id", reusableId).single();
  if (current?.content) {
    await insertReusableRevision(reusableId, current.content, "restore_component", userId ?? undefined);
  }

  const { error: updateError } = await supabase
    .from("reusable_blocks")
    .update({ content: data.revision_data as any, updated_by: userId ?? null } as any)
    .eq("id", reusableId);

  if (updateError) throw updateError;
}
