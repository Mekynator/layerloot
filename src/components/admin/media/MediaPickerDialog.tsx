import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Upload, Check, Image as ImageIcon, Film, FileText, Loader2 } from "lucide-react";
import { useMediaAssets, useUploadMediaAsset, type MediaAsset } from "@/hooks/use-media-library";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  mediaType?: string;
}

const TYPE_ICONS: Record<string, any> = { image: ImageIcon, video: Film, document: FileText };

export default function MediaPickerDialog({ open, onOpenChange, onSelect, mediaType }: MediaPickerDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(mediaType || "");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: assets = [], isLoading } = useMediaAssets({
    search: search || undefined,
    media_type: typeFilter || undefined,
    limit: 100,
  });

  const uploadMutation = useUploadMediaAsset();

  const handleUpload = useCallback(async (file: File) => {
    try {
      const asset = await uploadMutation.mutateAsync({ file, userId: user?.id });
      toast.success("Uploaded!");
      onSelect(asset.public_url);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    }
  }, [uploadMutation, user, onSelect, onOpenChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleConfirm = () => {
    if (selectedAsset) {
      onSelect(selectedAsset.public_url);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 mt-3">
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex gap-1">
                {["", "image", "video", "document"].map(t => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-[10px]"
                    onClick={() => setTypeFilter(t)}
                  >
                    {t || "All"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No assets found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 p-1">
                  {assets.map(asset => {
                    const isSelected = selectedAsset?.id === asset.id;
                    const Icon = TYPE_ICONS[asset.media_type] || FileText;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAsset(isSelected ? null : asset)}
                        onDoubleClick={() => { onSelect(asset.public_url); onOpenChange(false); }}
                        className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border/30 hover:border-border/60"
                        }`}
                      >
                        <div className="aspect-square bg-muted/30">
                          {asset.media_type === "image" ? (
                            <img
                              src={asset.public_url}
                              alt={asset.alt_text || asset.original_name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Icon className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="truncate text-[10px] text-foreground">{asset.title || asset.original_name}</p>
                          <p className="text-[9px] text-muted-foreground">{(asset.file_size_bytes / 1024).toFixed(0)} KB</p>
                        </div>
                        {isSelected && (
                          <div className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-3">
              <p className="text-[10px] text-muted-foreground">
                {selectedAsset ? `Selected: ${selectedAsset.original_name}` : "Click to select, double-click to insert"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirm} disabled={!selectedAsset} className="h-8 text-xs">
                  Insert
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 mt-3">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*,video/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleUpload(file);
                };
                input.click();
              }}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"
              }`}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {uploadMutation.isPending ? "Uploading..." : "Drop file here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Images, videos, and documents supported</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
