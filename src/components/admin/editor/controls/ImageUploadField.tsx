import { useState, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaPickerDialog from "@/components/admin/media/MediaPickerDialog";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const isReplacing = Boolean(value);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("editor-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
      onChange(publicUrl);
      toast.success(isReplacing ? "Image replaced" : "Image uploaded");
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [onChange, value]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }, [upload]);

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>

      {value ? (
        <div className="space-y-1.5">
          <div className="group relative overflow-hidden rounded-lg border border-border/30 transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[0_12px_28px_-16px_rgba(59,130,246,0.45)]">
            <img
              src={value}
              alt="Preview"
              className="h-24 w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPickerOpen(true)}
                className="h-7 text-[10px]"
              >
                <FolderOpen className="h-3 w-3 mr-1" /> Browse
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="h-7 text-[10px]"
              >
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  onChange("");
                  toast.success("Image removed");
                }}
                className="h-7 text-[10px]"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex-1 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
            }`}
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {uploading ? "Uploading..." : "Upload or drag an image"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border/40 px-3 py-4 transition-colors hover:border-primary/30 hover:bg-muted/30 cursor-pointer"
          >
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Library</span>
          </button>
        </div>
      )}

      {uploading && (
        <div className="overflow-hidden rounded-full bg-primary/10">
          <div className="h-1 w-full animate-pulse rounded-full bg-primary/70" />
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Advanced URL input */}
      <button
        type="button"
        onClick={() => setShowUrl(!showUrl)}
        className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {showUrl ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        URL
      </button>
      {showUrl && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs"
          placeholder="https://..."
        />
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => {
          onChange(url);
          toast.success(value ? "Image replaced" : "Image selected");
        }}
        mediaType="image"
      />
    </div>
  );
}
