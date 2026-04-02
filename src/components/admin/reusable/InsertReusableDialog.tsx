import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, Box, Link2, Copy, Check, Loader2 } from "lucide-react";

interface InsertReusableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (block: { block_type: string; content: any; title: string; reusableId?: string }) => void;
}

export default function InsertReusableDialog({ open, onOpenChange, onInsert }: InsertReusableDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"linked" | "copy">("copy");

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["reusable-blocks-picker", search],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("reusable_blocks")
        .select("*")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = blocks.find(b => b.id === selectedId);

  const handleInsert = () => {
    if (!selected) return;
    const content = mode === "linked"
      ? { ...(selected.content as any), _reusableId: selected.id }
      : { ...(selected.content as any) };

    onInsert({
      block_type: selected.block_type,
      content,
      title: `${selected.name}${mode === "linked" ? " (linked)" : " (copy)"}`,
      reusableId: mode === "linked" ? selected.id : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert Reusable Block</DialogTitle>
          <DialogDescription>Choose a saved block and how to insert it</DialogDescription>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 pl-8 text-xs" />
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : blocks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
              <Box className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No reusable blocks found</p>
            </div>
          ) : (
            <div className="space-y-1.5 p-1">
              {blocks.map(block => {
                const isSelected = selectedId === block.id;
                return (
                  <button
                    key={block.id}
                    onClick={() => setSelectedId(isSelected ? null : block.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                    }`}
                  >
                    <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{block.name}</p>
                      <p className="text-[10px] text-muted-foreground">{block.block_type}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedId && (
          <div className="border-t border-border/30 pt-3 space-y-3">
            <Label className="text-xs font-medium">Insert Mode</Label>
            <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="copy" id="mode-copy" />
                <Label htmlFor="mode-copy" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Copy className="h-3 w-3" /> Detached Copy
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="linked" id="mode-linked" />
                <Label htmlFor="mode-linked" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Link2 className="h-3 w-3" /> Linked (stays synced)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-[10px] text-muted-foreground">
              {mode === "copy"
                ? "Creates an independent copy you can edit separately."
                : "Stays synced with the library version. Updates propagate on publish."}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleInsert} disabled={!selectedId} className="h-8 text-xs">Insert</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
