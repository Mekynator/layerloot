import { useState, useEffect } from "react";
import { GripVertical, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NavItem {
  label: string;
  to: string;
}

const defaultNav: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/products" },
  { label: "Create Your Own", to: "/create" },
  { label: "Gallery", to: "/gallery" },
  { label: "About", to: "/about" },
];

export const useNavLinks = () => {
  const [links, setLinks] = useState<NavItem[]>(defaultNav);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav_links")
      .single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) {
          setLinks(data.value as unknown as NavItem[]);
        }
      });
  }, []);

  return links;
};

const NavLinkEditor = () => {
  const [links, setLinks] = useState<NavItem[]>(defaultNav);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "nav_links")
      .single()
      .then(({ data }) => {
        if (data?.value && Array.isArray(data.value)) setLinks(data.value as unknown as NavItem[]);
      });
  }, []);

  const save = async () => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "nav_links", value: links as any }, { onConflict: "key" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Navigation saved!" });
  };

  const addLink = () => setLinks([...links, { label: "New Page", to: "/new-page" }]);
  const removeLink = (i: number) => setLinks(links.filter((_, j) => j !== i));
  const updateLink = (i: number, field: keyof NavItem, value: string) => {
    const updated = [...links];
    updated[i] = { ...updated[i], [field]: value };
    setLinks(updated);
  };

  const handleDragEnd = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...links];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setLinks(reordered);
    setDragIndex(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-display text-xs uppercase tracking-wider text-foreground hover:text-primary-foreground"
        >
          Edit Nav Links
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-display uppercase">Header Navigation</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {links.map((link, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDragEnd(i)}
              className="flex items-center gap-2 rounded-lg border border-border p-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Label"
                  className="h-7 text-xs"
                />
                <Input
                  value={link.to}
                  onChange={(e) => updateLink(i, "to", e.target.value)}
                  placeholder="/path"
                  className="h-7 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeLink(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLink} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Add Link
          </Button>
          <Button onClick={save} className="w-full font-display uppercase tracking-wider">
            <Save className="mr-1 h-4 w-4" /> Save Navigation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavLinkEditor;
