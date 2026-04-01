import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogIn, Plus, Users, Paintbrush, Heart } from "lucide-react";
import { motion } from "framer-motion";
import ShowcaseGallery from "@/components/creations/ShowcaseGallery";
import MyShowcases from "@/components/creations/MyShowcases";
import SavedShowcases from "@/components/creations/SavedShowcases";
import CreateShowcaseForm from "@/components/creations/CreateShowcaseForm";

export default function Creations() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("community");
  const [showForm, setShowForm] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Community Creations</h1>
          <p className="text-muted-foreground max-w-md">
            Sign in to explore custom creations from the community, share your own, and reorder designs you love.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">
              <LogIn className="mr-2 h-4 w-4" /> Sign in to access
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Creations</h1>
          <p className="text-sm text-muted-foreground">Explore, share, and reorder custom 3D printed creations</p>
        </div>
        <Button onClick={() => { setTab("create"); setShowForm(true); }} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Creation
        </Button>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "create") setShowForm(false); }}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="community" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Community
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-1.5">
            <Paintbrush className="h-3.5 w-3.5" /> My Creations
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5">
            <Heart className="h-3.5 w-3.5" /> Saved
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Create
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community">
          <ShowcaseGallery />
        </TabsContent>
        <TabsContent value="mine">
          <MyShowcases />
        </TabsContent>
        <TabsContent value="saved">
          <SavedShowcases />
        </TabsContent>
        <TabsContent value="create">
          <CreateShowcaseForm onCreated={() => setTab("mine")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
