import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploadPlaceholderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
  placeholder?: string;
}

export default function ImageUploadPlaceholder({
  label,
  value,
  onChange,
  bucket = "site-assets",
  folder = "chat",
  accept = "image/*",
  placeholder = "https://...",
}: ImageUploadPlaceholderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
    toast.success("Image uploaded");
  }, [bucket, folder, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) upload(file);
  }, [upload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }, [upload]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {value ? (
        <div className="relative group">
          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/50 p-2">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/30 bg-muted">
              <img src={value} alt={label} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <Input
              value={value}
              onChange={e => onChange(e.target.value)}
              className="h-8 flex-1 text-xs font-mono"
              placeholder={placeholder}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onChange("")}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Uploading...</p>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Click or drag & drop</p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileSelect} />
      {!value && (
        <Input
          value=""
          onChange={e => onChange(e.target.value)}
          className="h-7 text-[11px] font-mono"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
