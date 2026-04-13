import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Star, Eye, Trash2, Loader2 } from "lucide-react";

type Showcase = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  visibility_status: string;
  approved_by_admin: boolean;
  featured: boolean;
  reorder_enabled: boolean;
  thumbnail_url: string | null;
  preview_image_urls: string[] | null;
  materials: string | null;
  colors: string | null;
  category: string | null;
  created_at: string;
  owner_user_id: string;
};

type ShowcaseUpdateFields = {
  approved_by_admin?: boolean;
  featured?: boolean;
  reorder_enabled?: boolean;
};

export default function AdminShowcases() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");

  const { data: showcases = [], isLoading } = useQuery({
    queryKey: ["admin-showcases", tab],
    queryFn: async () => {
      let q = supabase.from("custom_order_showcases").select("*").order("created_at", { ascending: false });
      if (tab === "pending") {
        q = q.eq("visibility_status", "shared").eq("approved_by_admin", false);
      } else if (tab === "approved") {
        q = q.eq("approved_by_admin", true);
      } else if (tab === "private") {
        q = q.eq("visibility_status", "private");
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Showcase[];
    },
  });

  const updateShowcase = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: ShowcaseUpdateFields }) => {
      const { error } = await supabase.from("custom_order_showcases").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-showcases"] });
      toast({ title: "Showcase updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteShowcase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_order_showcases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-showcases"] });
      toast({ title: "Showcase deleted" });
    },
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Community Showcases</h1>
        <p className="text-sm text-muted-foreground mt-1">Approve, reject, and manage user-submitted creations</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="private">Private</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {["pending", "approved", "private", "all"].map((t) => (
          <TabsContent key={t} value={t}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : showcases.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No showcases found.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {showcases.map((s) => (
                  <Card key={s.id} className="overflow-hidden">
                    {s.thumbnail_url && (
                      <img src={s.thumbnail_url} alt={s.title} className="h-40 w-full object-cover" />
                    )}
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold text-sm uppercase">{s.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {s.approved_by_admin && <Badge variant="default" className="text-[10px]">Approved</Badge>}
                          {s.featured && <Badge variant="secondary" className="text-[10px]">Featured</Badge>}
                          {!s.approved_by_admin && s.visibility_status === "shared" && (
                            <Badge variant="destructive" className="text-[10px]">Pending</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {s.category && <Badge variant="outline">{s.category}</Badge>}
                        {s.materials && <Badge variant="outline">{s.materials}</Badge>}
                        {s.colors && <Badge variant="outline">{s.colors}</Badge>}
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        Created: {new Date(s.created_at).toLocaleDateString()}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {!s.approved_by_admin && s.visibility_status === "shared" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={() => updateShowcase.mutate({ id: s.id, fields: { approved_by_admin: true } })}
                          >
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                        )}
                        {s.approved_by_admin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => updateShowcase.mutate({ id: s.id, fields: { approved_by_admin: false } })}
                          >
                            <X className="h-3 w-3" /> Revoke
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={s.featured ? "secondary" : "outline"}
                          className="h-7 text-xs gap-1"
                          onClick={() => updateShowcase.mutate({ id: s.id, fields: { featured: !s.featured } })}
                        >
                          <Star className="h-3 w-3" /> {s.featured ? "Unfeature" : "Feature"}
                        </Button>
                        <Button
                          size="sm"
                          variant={s.reorder_enabled ? "secondary" : "outline"}
                          className="h-7 text-xs gap-1"
                          onClick={() => updateShowcase.mutate({ id: s.id, fields: { reorder_enabled: !s.reorder_enabled } })}
                        >
                          {s.reorder_enabled ? "Disable Reorder" : "Enable Reorder"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this showcase?")) deleteShowcase.mutate(s.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
