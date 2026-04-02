import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MediaAsset {
  id: string;
  file_name: string;
  original_name: string;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  title: string;
  description: string;
  tags: string[];
  media_type: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size_bytes: number;
  folder: string;
  uploaded_by: string | null;
  is_archived: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetVersion {
  id: string;
  asset_id: string;
  version_number: number;
  storage_path: string;
  public_url: string;
  file_size_bytes: number;
  replaced_by: string | null;
  created_at: string;
}

export interface MediaFilters {
  search?: string;
  folder?: string;
  media_type?: string;
  is_archived?: boolean;
  limit?: number;
  offset?: number;
}

export function useMediaAssets(filters: MediaFilters = {}) {
  return useQuery({
    queryKey: ["media-assets", filters],
    queryFn: async () => {
      let q = supabase
        .from("media_assets")
        .select("*")
        .eq("is_archived", filters.is_archived ?? false)
        .order("created_at", { ascending: false });

      if (filters.search) {
        q = q.or(`original_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,alt_text.ilike.%${filters.search}%`);
      }
      if (filters.folder && filters.folder !== "/") {
        q = q.eq("folder", filters.folder);
      }
      if (filters.media_type) {
        q = q.eq("media_type", filters.media_type);
      }
      if (filters.limit) q = q.limit(filters.limit);
      if (filters.offset) q = q.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MediaAsset[];
    },
  });
}

export function useAssetVersions(assetId: string | null) {
  return useQuery({
    queryKey: ["media-asset-versions", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_asset_versions")
        .select("*")
        .eq("asset_id", assetId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MediaAssetVersion[];
    },
  });
}

function getMediaType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

export function useUploadMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folder, userId }: { file: File; folder?: string; userId?: string }) => {
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("editor-images").upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(storagePath);

      const record = {
        file_name: storagePath,
        original_name: file.name,
        storage_bucket: "editor-images",
        storage_path: storagePath,
        public_url: publicUrl,
        media_type: getMediaType(file.type),
        mime_type: file.type,
        file_size_bytes: file.size,
        folder: folder || "/",
        uploaded_by: userId || null,
        title: file.name.replace(/\.[^.]+$/, ""),
      };

      const { data, error } = await supabase.from("media_assets").insert(record).select().single();
      if (error) throw error;
      return data as MediaAsset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-assets"] });
    },
  });
}

export function useReplaceMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, file, userId }: { assetId: string; file: File; userId?: string }) => {
      // Get current asset
      const { data: current, error: fetchErr } = await supabase
        .from("media_assets")
        .select("*")
        .eq("id", assetId)
        .single();
      if (fetchErr || !current) throw fetchErr || new Error("Asset not found");

      // Get max version number
      const { data: versions } = await supabase
        .from("media_asset_versions")
        .select("version_number")
        .eq("asset_id", assetId)
        .order("version_number", { ascending: false })
        .limit(1);
      const nextVersion = ((versions?.[0] as any)?.version_number ?? 0) + 1;

      // Archive current version
      await supabase.from("media_asset_versions").insert({
        asset_id: assetId,
        version_number: nextVersion,
        storage_path: (current as any).storage_path,
        public_url: (current as any).public_url,
        file_size_bytes: (current as any).file_size_bytes,
        replaced_by: userId || null,
      });

      // Upload new file
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("editor-images").upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(storagePath);

      // Update asset record
      const { data, error } = await supabase.from("media_assets").update({
        file_name: storagePath,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: file.type,
        file_size_bytes: file.size,
        media_type: getMediaType(file.type),
      }).eq("id", assetId).select().single();
      if (error) throw error;
      return data as MediaAsset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-assets"] });
      qc.invalidateQueries({ queryKey: ["media-asset-versions"] });
    },
  });
}

export function useArchiveMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase.from("media_assets").update({ is_archived: true }).eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-assets"] });
      toast.success("Asset archived");
    },
  });
}

export function useRestoreMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase.from("media_assets").update({ is_archived: false }).eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-assets"] });
      toast.success("Asset restored");
    },
  });
}

export function useUpdateAssetMetadata() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, patch }: { assetId: string; patch: Partial<Pick<MediaAsset, "alt_text" | "title" | "description" | "tags" | "folder">> }) => {
      const { error } = await supabase.from("media_assets").update(patch).eq("id", assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-assets"] });
    },
  });
}

/** Increment usage_count when an asset is selected */
export async function incrementUsageCount(assetId: string) {
  try {
    // Simple increment via select + update
    const { data } = await supabase.from("media_assets").select("usage_count").eq("id", assetId).single();
    if (data) {
      await supabase.from("media_assets").update({ usage_count: ((data as any).usage_count ?? 0) + 1 }).eq("id", assetId);
    }
  } catch {
    // Non-critical, ignore
  }
}
