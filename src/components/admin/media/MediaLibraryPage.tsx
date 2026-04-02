import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Upload, Grid3X3, List, Image as ImageIcon, Film, FileText, Info,
  Loader2, Archive,
} from "lucide-react";
import { useMediaAssets, useUploadMediaAsset, type MediaAsset } from "@/hooks/use-media-library";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AssetDetailPanel from "./AssetDetailPanel";

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: assets = [], isLoading } = useMediaAssets({
    search: search || undefined,
    media_type: typeFilter || undefined,
    is_archived: showArchived,
    limit: 200,
  });

  const uploadMutation = useUploadMediaAsset();

  const handleUpload = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await uploadMutation.mutateAsync({ file, userId: user?.id });
      } catch (err: any) {
        toast.error(`Failed: ${file.name} — ${err.message}`);
      }
    }
    toast.success(`${files.length} file(s) uploaded`);
  }, [uploadMutation, user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const openDetail = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  const TYPE_ICONS: Record<string, any> = { image: ImageIcon, video: Film, document: FileText };

  return (
    <div
      className="space-y-4"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground">Manage images, videos, and assets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="h-8 gap-1.5 text-xs">
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 pl-8 text-xs" />
        </div>
        <div className="flex gap-1">
          {["", "image", "video", "document"].map(t => (
            <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" className="h-8 text-[10px]" onClick={() => setTypeFilter(t)}>
              {t || "All"}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 border border-border/30 rounded-md p-0.5">
          <button onClick={() => setViewMode("grid")} className={`rounded p-1 ${viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode("list")} className={`rounded p-1 ${viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <Badge variant="secondary" className="text-[10px]">{assets.length} assets</Badge>
      </div>

      {/* Drop overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-primary bg-primary/5 px-12 py-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-primary mb-2" />
            <p className="text-sm font-medium text-foreground">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">{showArchived ? "No archived assets" : "No assets yet"}</p>
          {!showArchived && (
            <Button size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload your first asset
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {assets.map(asset => {
            const Icon = TYPE_ICONS[asset.media_type] || FileText;
            return (
              <button
                key={asset.id}
                onClick={() => openDetail(asset)}
                className="group relative overflow-hidden rounded-lg border border-border/30 bg-card/50 transition-all hover:border-border/60 hover:shadow-md text-left"
              >
                <div className="aspect-square bg-muted/20">
                  {asset.media_type === "image" ? (
                    <img src={asset.public_url} alt={asset.alt_text || asset.original_name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Icon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-[10px] font-medium text-foreground">{asset.title || asset.original_name}</p>
                  <p className="text-[9px] text-muted-foreground">{(asset.file_size_bytes / 1024).toFixed(0)} KB</p>
                </div>
                <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="rounded-full bg-background/80 p-1">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {assets.map(asset => {
            const Icon = TYPE_ICONS[asset.media_type] || FileText;
            return (
              <button
                key={asset.id}
                onClick={() => openDetail(asset)}
                className="flex w-full items-center gap-3 rounded-lg border border-border/30 bg-card/50 px-3 py-2 transition-all hover:border-border/60 text-left"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted/20">
                  {asset.media_type === "image" ? (
                    <img src={asset.public_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Icon className="h-4 w-4 text-muted-foreground/40" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{asset.title || asset.original_name}</p>
                  <p className="text-[10px] text-muted-foreground">{asset.mime_type} · {(asset.file_size_bytes / 1024).toFixed(0)} KB</p>
                </div>
                <Badge variant="secondary" className="text-[9px]">{asset.folder}</Badge>
              </button>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ""; }}
      />

      <AssetDetailPanel asset={selectedAsset} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
