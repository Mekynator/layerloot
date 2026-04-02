import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/activity-log";

export type ProductStatus = "draft" | "published" | "unpublished" | "archived" | "scheduled";

export interface ProductDraftData {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  images: string[];
  stock: number;
  is_featured: boolean;
  model_url: string | null;
  print_time_hours: number | null;
  dimensions_cm: any;
  weight_grams: number | null;
  finish_type: string | null;
  material_type: string | null;
}

const DRAFT_FIELDS: (keyof ProductDraftData)[] = [
  "name", "slug", "description", "price", "compare_at_price",
  "category_id", "images", "stock", "is_featured", "model_url",
  "print_time_hours", "dimensions_cm", "weight_grams", "finish_type", "material_type",
];

function snapshotProduct(product: any): ProductDraftData {
  const snap: any = {};
  for (const key of DRAFT_FIELDS) {
    snap[key] = product[key] ?? null;
  }
  snap.images = product.images ?? [];
  snap.stock = product.stock ?? 0;
  snap.price = product.price ?? 0;
  snap.is_featured = product.is_featured ?? false;
  return snap as ProductDraftData;
}

export function useProductAdmin() {
  const { toast } = useToast();

  const saveDraftProduct = async (
    productId: string,
    draftData: ProductDraftData,
    userId: string,
  ) => {
    const { error } = await supabase
      .from("products")
      .update({
        draft_data: draftData as any,
        has_draft: true,
        updated_by: userId,
      } as any)
      .eq("id", productId);

    if (error) {
      toast({ title: "Error saving draft", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Draft saved" });
    return true;
  };

  const createDraftProduct = async (draftData: ProductDraftData, userId: string) => {
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: draftData.name,
        slug: draftData.slug,
        description: draftData.description,
        price: draftData.price,
        compare_at_price: draftData.compare_at_price,
        category_id: draftData.category_id,
        images: draftData.images,
        stock: draftData.stock,
        is_featured: draftData.is_featured,
        model_url: draftData.model_url,
        print_time_hours: draftData.print_time_hours,
        dimensions_cm: draftData.dimensions_cm,
        weight_grams: draftData.weight_grams,
        finish_type: draftData.finish_type,
        material_type: draftData.material_type,
        is_active: false,
        status: "draft",
        updated_by: userId,
      } as any)
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Product created as draft" });
    return data?.id ?? null;
  };

  const publishProduct = async (productId: string, userId: string) => {
    // Fetch current product
    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (fetchErr || !product) {
      toast({ title: "Error", description: fetchErr?.message ?? "Product not found", variant: "destructive" });
      return false;
    }

    const current = product as any;
    const draft: ProductDraftData | null = current.draft_data;

    // Log revision of current live state
    const revNum = await getNextRevNum(productId);
    await supabase.from("content_revisions").insert({
      content_type: "product",
      content_id: productId,
      revision_data: snapshotProduct(current),
      revision_number: revNum,
      action: "publish",
      change_summary: draft ? "Published draft changes" : "Initial publish",
      created_by: userId,
    });

    // Promote draft_data if exists, otherwise just mark as published
    const updatePayload: any = {
      has_draft: false,
      draft_data: null,
      published_at: new Date().toISOString(),
      published_by: userId,
      scheduled_publish_at: null,
      status: "published",
      is_active: true,
    };

    if (draft) {
      for (const key of DRAFT_FIELDS) {
        updatePayload[key] = draft[key];
      }
    }

    const { error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", productId);

    if (error) {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
      return false;
    }

    await logAdminActivity({
      userId,
      action: "product_published",
      entityType: "product",
      entityId: productId,
      summary: `Published product: ${draft?.name ?? current.name}`,
    });

    toast({ title: "Product published" });
    return true;
  };

  const unpublishProduct = async (productId: string, userId: string) => {
    const { error } = await supabase
      .from("products")
      .update({ status: "unpublished", is_active: false } as any)
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    await logAdminActivity({
      userId,
      action: "product_unpublished",
      entityType: "product",
      entityId: productId,
      summary: "Product unpublished",
    });

    toast({ title: "Product unpublished" });
    return true;
  };

  const archiveProduct = async (productId: string, userId: string) => {
    const { error } = await supabase
      .from("products")
      .update({
        status: "archived",
        is_active: false,
        archived_at: new Date().toISOString(),
      } as any)
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    await logAdminActivity({
      userId,
      action: "product_archived",
      entityType: "product",
      entityId: productId,
      summary: "Product archived",
    });

    toast({ title: "Product archived" });
    return true;
  };

  const scheduleProductPublish = async (productId: string, date: string, userId: string) => {
    const { error } = await supabase
      .from("products")
      .update({
        scheduled_publish_at: date,
        status: "scheduled",
      } as any)
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    await logAdminActivity({
      userId,
      action: "product_scheduled",
      entityType: "product",
      entityId: productId,
      summary: `Scheduled product publish for ${date}`,
    });

    toast({ title: "Publish scheduled" });
    return true;
  };

  const loadProductRevisions = async (productId: string) => {
    const { data, error } = await supabase
      .from("content_revisions")
      .select("*")
      .eq("content_type", "product")
      .eq("content_id", productId)
      .order("revision_number", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return [];
    }
    return data ?? [];
  };

  const restoreProductRevision = async (productId: string, revisionId: string, userId: string) => {
    const { data: revision } = await supabase
      .from("content_revisions")
      .select("*")
      .eq("id", revisionId)
      .single();

    if (!revision) {
      toast({ title: "Revision not found", variant: "destructive" });
      return false;
    }

    const revisionData = revision.revision_data as any;

    // Save restored version as draft
    const { error } = await supabase
      .from("products")
      .update({
        draft_data: revisionData,
        has_draft: true,
        updated_by: userId,
      } as any)
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    // Log restoration
    const revNum = await getNextRevNum(productId);
    await supabase.from("content_revisions").insert({
      content_type: "product",
      content_id: productId,
      revision_data: revisionData,
      revision_number: revNum,
      action: "restore",
      change_summary: `Restored from revision #${revision.revision_number}`,
      restored_from_revision_id: revisionId,
      created_by: userId,
    });

    toast({ title: "Revision restored as draft" });
    return true;
  };

  return {
    saveDraftProduct,
    createDraftProduct,
    publishProduct,
    unpublishProduct,
    archiveProduct,
    scheduleProductPublish,
    loadProductRevisions,
    restoreProductRevision,
  };
}

async function getNextRevNum(productId: string): Promise<number> {
  const { data } = await supabase
    .from("content_revisions")
    .select("revision_number")
    .eq("content_type", "product")
    .eq("content_id", productId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.revision_number ?? 0) + 1;
}
