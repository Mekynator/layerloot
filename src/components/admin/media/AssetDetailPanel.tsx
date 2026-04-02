import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Save, RotateCcw, Archive, Image as ImageIcon, Film, FileText, Clock, Copy } from "lucide-react";
import { format } from "date-fns";
import { useUpdateAssetMetadata, useAssetVersions, useArchiveMediaAsset, useRestoreMediaAsset, type MediaAsset } from "@/hooks/use-media-library";
import { toast } from "sonner";

interface AssetDetailPanelProps {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssetDetailPanel({ asset, open, onOpenChange }: AssetDetailPanelProps) {
  const [altText, setAltText] = useState(asset?.alt_text ?? "");
  const [title, setTitle] = useState(asset?.title ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const [folder, setFolder] = useState(asset?.folder ?? "/");

  const updateMeta = useUpdateAssetMetadata();
  const archiveMut = useArchiveMediaAsset();
  const restoreMut = useRestoreMediaAsset();
  const { data: versions = [] } = useAssetVersions(asset?.id ?? null);

  if (!asset) return null;

  const handleSave = () => {
    updateMeta.mutate({ assetId: asset.id, patch: { alt_text: altText, title, description, folder } }, {
      onSuccess: () => toast.success("Metadata saved"),
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(asset.public_url);
    toast.success("URL copied");
  };

  const TypeIcon = asset.media_type === "video" ? Film : asset.media_type === "image" ? ImageIcon : FileText;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/30">
          <SheetTitle className="text-sm">Asset Details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Preview */}
            <div className="overflow-hidden rounded-lg border border-border/30 bg-muted/20">
              {asset.media_type === "image" ? (
                <img src={asset.public_url} alt={asset.alt_text} className="w-full max-h-48 object-contain" />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <TypeIcon className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{asset.media_type}</Badge>
              <Badge variant="secondary" className="text-[10px]">{asset.mime_type}</Badge>
              <Badge variant="secondary" className="text-[10px]">{(asset.file_size_bytes / 1024).toFixed(0)} KB</Badge>
              {asset.width && asset.height && (
                <Badge variant="secondary" className="text-[10px]">{asset.width}×{asset.height}</Badge>
              )}
              <Badge variant="outline" className="text-[10px]">Used {asset.usage_count}×</Badge>
            </div>

            {/* URL */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Public URL</Label>
              <div className="flex gap-1">
                <Input value={asset.public_url} readOnly className="h-7 text-[10px] font-mono" />
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={copyUrl}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Metadata form */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Alt Text</Label>
                <Input value={altText} onChange={e => setAltText(e.target.value)} className="h-7 text-xs" placeholder="Describe the image..." />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-xs min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Folder</Label>
                <Input value={folder} onChange={e => setFolder(e.target.value)} className="h-7 text-xs" />
              </div>

              <Button size="sm" onClick={handleSave} disabled={updateMeta.isPending} className="w-full h-8 text-xs gap-1.5">
                <Save className="h-3 w-3" /> Save Metadata
              </Button>
            </div>

            {/* Version history */}
            {versions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground">Version History</Label>
                <div className="space-y-1.5">
                  {versions.map(v => (
                    <div key={v.id} className="flex items-center justify-between rounded-md border border-border/30 px-2.5 py-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>v{v.version_number}</span>
                        <span className="text-muted-foreground">{format(new Date(v.created_at), "MMM d, HH:mm")}</span>
                      </div>
                      <span className="text-muted-foreground">{(v.file_size_bytes / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Archive / Restore */}
            <div className="pt-2 border-t border-border/30">
              {asset.is_archived ? (
                <Button variant="outline" size="sm" onClick={() => restoreMut.mutate(asset.id)} className="w-full h-8 text-xs gap-1.5">
                  <RotateCcw className="h-3 w-3" /> Restore Asset
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { archiveMut.mutate(asset.id); onOpenChange(false); }} className="w-full h-8 text-xs gap-1.5 text-destructive hover:text-destructive">
                  <Archive className="h-3 w-3" /> Archive Asset
                </Button>
              )}
              <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
                {asset.is_archived ? "This asset is archived and hidden from the library" : "Archived assets are hidden but not deleted"}
              </p>
            </div>

            {/* File info */}
            <div className="text-[9px] text-muted-foreground space-y-0.5">
              <p>Original: {asset.original_name}</p>
              <p>Uploaded: {format(new Date(asset.created_at), "MMM d, yyyy HH:mm")}</p>
              <p>ID: {asset.id}</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
