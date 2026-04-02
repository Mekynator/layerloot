import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogIn, Plus, Users, Paintbrush, Heart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ShowcaseGallery from "@/components/creations/ShowcaseGallery";
import MyShowcases from "@/components/creations/MyShowcases";
import SavedShowcases from "@/components/creations/SavedShowcases";
import CreateShowcaseForm from "@/components/creations/CreateShowcaseForm";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/admin/BlockRenderer";

export default function Creations() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("community");
  const [showForm, setShowForm] = useState(false);
  const [pageBlocks, setPageBlocks] = useState<SiteBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);

  useEffect(() => {
    const fetchBlocks = async () => {
      setBlocksLoading(true);
      const { data } = await supabase
        .from("site_blocks")
        .select("*")
        .eq("page", "creations")
        .eq("is_active", true)
        .order("sort_order");
      setPageBlocks((data as SiteBlock[]) ?? []);
      setBlocksLoading(false);
    };
    void fetchBlocks();
  }, []);

  const topBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement !== "after_creations"
  );
  const bottomBlocks = pageBlocks.filter(
    (block) => (block.content as Record<string, unknown> | null)?.placement === "after_creations"
  );

  if (loading) return null;

  if (!user) {
    return (
      <div>
        {!blocksLoading && topBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}
        <div className="container mx-auto flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Community Creations</h1>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              Discover custom 3D printed creations from the community. Sign in to explore, share your own, and reorder designs you love.
            </p>
            <Button asChild size="lg" className="rounded-xl gap-2">
              <Link to="/auth">
                <LogIn className="h-4 w-4" /> Sign in to access
              </Link>
            </Button>
          </motion.div>
        </div>
        {!blocksLoading && bottomBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}
      </div>
    );
  }

  return (
    <div>
      {!blocksLoading && topBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-[11px] font-display uppercase tracking-[0.24em] text-primary font-semibold">Creator Gallery</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Community Creations</h1>
            <p className="text-sm text-muted-foreground">
              Explore, share, and reorder custom 3D printed creations
            </p>
          </div>
          <Button
            onClick={() => { setTab("create"); setShowForm(true); }}
            className="gap-2 rounded-xl shrink-0"
          >
            <Plus className="h-4 w-4" /> New Creation
          </Button>
        </motion.div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "create") setShowForm(false); }}>
          <TabsList className="w-full sm:w-auto rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="community" className="gap-1.5 rounded-lg text-xs">
              <Users className="h-3.5 w-3.5" /> Community
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5 rounded-lg text-xs">
              <Paintbrush className="h-3.5 w-3.5" /> My Creations
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 rounded-lg text-xs">
              <Heart className="h-3.5 w-3.5" /> Saved
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5 rounded-lg text-xs">
              <Plus className="h-3.5 w-3.5" /> Create
            </TabsTrigger>
          </TabsList>

          <TabsContent value="community" className="mt-6">
            <ShowcaseGallery />
          </TabsContent>
          <TabsContent value="mine" className="mt-6">
            <MyShowcases onCreateClick={() => { setTab("create"); setShowForm(true); }} />
          </TabsContent>
          <TabsContent value="saved" className="mt-6">
            <SavedShowcases />
          </TabsContent>
          <TabsContent value="create" className="mt-6">
            <CreateShowcaseForm onCreated={() => setTab("mine")} />
          </TabsContent>
        </Tabs>
      </div>

      {!blocksLoading && bottomBlocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}
    </div>
  );
}