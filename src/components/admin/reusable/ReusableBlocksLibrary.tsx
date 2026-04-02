import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Box, Archive, RotateCcw, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ReusableBlock {
  id: string;
  name: string;
  description: string;
  block_type: string;
  content: any;
  thumbnail_url: string | null;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function ReusableBlocksLibrary() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const qc = useQueryClient();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["reusable-blocks", search, showArchived],
    queryFn: async () => {
      let q = supabase
        .from("reusable_blocks")
        .select("*")
        .eq("is_archived", showArchived)
        .order("updated_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ReusableBlock[];
    },
  });

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reusable_blocks").update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reusable-blocks"] }); toast.success("Block archived"); },
  });

  const restoreMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reusable_blocks").update({ is_archived: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reusable-blocks"] }); toast.success("Block restored"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Reusable Blocks</h1>
          <p className="text-sm text-muted-foreground">Save and reuse content sections across pages</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="h-8 gap-1.5 text-xs">
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? "Show Active" : "Show Archived"}
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search blocks..." className="h-8 pl-8 text-xs" />
        </div>
        <Badge variant="secondary" className="text-[10px]">{blocks.length} blocks</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Box className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            {showArchived ? "No archived blocks" : "No reusable blocks yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Save a block from the Page Editor to create a reusable template
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {blocks.map(block => (
            <div key={block.id} className="rounded-lg border border-border/30 bg-card/50 p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">{block.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{block.block_type}</p>
                </div>
                <Badge variant="secondary" className="text-[9px]">{block.block_type}</Badge>
              </div>
              {block.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{block.description}</p>
              )}
              {block.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {block.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {block.is_archived ? (
                  <Button variant="outline" size="sm" onClick={() => restoreMut.mutate(block.id)} className="h-7 text-[10px] gap-1">
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => archiveMut.mutate(block.id)} className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive">
                    <Archive className="h-3 w-3" /> Archive
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
