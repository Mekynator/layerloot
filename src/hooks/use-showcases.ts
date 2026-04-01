import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Showcase {
  id: string;
  owner_user_id: string;
  custom_order_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  visibility_status: "private" | "shared";
  approved_by_admin: boolean;
  reorder_enabled: boolean;
  featured: boolean;
  thumbnail_url: string | null;
  preview_image_urls: string[];
  finished_image_urls: string[];
  source_model_url: string | null;
  source_model_filename: string | null;
  quoted_price: number | null;
  final_price: number | null;
  currency: string;
  materials: string | null;
  colors: string | null;
  dimensions: string | null;
  size_notes: string | null;
  production_settings_json: Record<string, any>;
  admin_notes_for_reproduction: string | null;
  tags: string[];
  category: string | null;
  reorder_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export type ShowcaseInsert = Omit<Showcase, "id" | "created_at" | "updated_at" | "reorder_count" | "rating_avg" | "rating_count">;

// ── My showcases ────────────────────────────────────────
export function useMyShowcases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["showcases", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_order_showcases" as any)
        .select("*")
        .eq("owner_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Showcase[];
    },
  });
}

// ── Community (approved + shared) ───────────────────────
export function useCommunityShowcases(filters?: {
  category?: string;
  search?: string;
  sortBy?: string;
}) {
  return useQuery({
    queryKey: ["showcases", "community", filters],
    queryFn: async () => {
      let q = supabase
        .from("custom_order_showcases" as any)
        .select("*")
        .eq("visibility_status", "shared")
        .eq("approved_by_admin", true);

      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

      if (filters?.sortBy === "rating") q = q.order("rating_avg", { ascending: false });
      else if (filters?.sortBy === "popular") q = q.order("reorder_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Showcase[];
    },
  });
}

// ── Single showcase ─────────────────────────────────────
export function useShowcase(slug: string | undefined) {
  return useQuery({
    queryKey: ["showcases", "detail", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_order_showcases" as any)
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Showcase | null;
    },
  });
}

// ── Create / Update / Delete ─────────────────────────────
export function useShowcaseMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (input: Partial<ShowcaseInsert>) => {
      const slug = (input.title ?? "creation")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

      const { data, error } = await supabase
        .from("custom_order_showcases" as any)
        .insert({
          ...input,
          owner_user_id: user!.id,
          slug,
          visibility_status: input.visibility_status ?? "private",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Showcase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["showcases"] });
      toast({ title: "Creation saved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Showcase> & { id: string }) => {
      const { error } = await supabase
        .from("custom_order_showcases" as any)
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["showcases"] });
      toast({ title: "Updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_order_showcases" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["showcases"] });
      toast({ title: "Deleted" });
    },
  });

  return { create, update, remove };
}

// ── Favorites ───────────────────────────────────────────
export function useShowcaseFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["showcase-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_favorites" as any)
        .select("showcase_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((d: any) => d.showcase_id as string);
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ showcaseId, isFav }: { showcaseId: string; isFav: boolean }) => {
      if (isFav) {
        await supabase
          .from("showcase_favorites" as any)
          .delete()
          .eq("user_id", user!.id)
          .eq("showcase_id", showcaseId);
      } else {
        await supabase
          .from("showcase_favorites" as any)
          .insert({ user_id: user!.id, showcase_id: showcaseId } as any);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["showcase-favorites"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Reviews ─────────────────────────────────────────────
export function useShowcaseReviews(showcaseId: string | undefined) {
  return useQuery({
    queryKey: ["showcase-reviews", showcaseId],
    enabled: !!showcaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_reviews" as any)
        .select("*")
        .eq("showcase_id", showcaseId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        showcase_id: string;
        user_id: string;
        rating: number;
        comment: string | null;
        created_at: string;
      }>;
    },
  });
}

export function useSubmitShowcaseReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ showcaseId, rating, comment }: { showcaseId: string; rating: number; comment: string }) => {
      const { error } = await supabase
        .from("showcase_reviews" as any)
        .insert({ showcase_id: showcaseId, user_id: user!.id, rating, comment } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["showcase-reviews"] });
      qc.invalidateQueries({ queryKey: ["showcases"] });
      toast({ title: "Review submitted!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Saved showcases (favorites with full data) ──────────
export function useSavedShowcases() {
  const { user } = useAuth();
  const { data: favIds } = useShowcaseFavorites();

  return useQuery({
    queryKey: ["showcases", "saved", favIds],
    enabled: !!user && !!favIds && favIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_order_showcases" as any)
        .select("*")
        .in("id", favIds!);
      if (error) throw error;
      return (data ?? []) as unknown as Showcase[];
    },
  });
}
