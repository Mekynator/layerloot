import { useEffect, useMemo, useState } from "react";
import { Layers3, Link2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import { upsertReusableFromBlock, REUSABLE_SECTION_CATEGORIES } from "@/lib/reusable-blocks";
import type { SiteBlock } from "@/components/blocks/BlockRenderer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SaveReusableSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: SiteBlock | null;
  onSaved?: (result: { id: string; name: string; kind: "section" | "component" }) => void;
}

export default function SaveReusableSectionDialog({ open, onOpenChange, block, onSaved }: SaveReusableSectionDialogProps) {
  const { user } = useAuth();
  const { track } = useAnalyticsSafe();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!block || !open) return;
    const content = (block.content || {}) as Record<string, any>;
    setName(typeof block.title === "string" ? block.title : content._reusableName || block.block_type.replace(/_/g, " "));
    setDescription(typeof content._library?.description === "string" ? content._library.description : "");
    setCategory(String(content._reusableCategory || content._library?.category || "General"));
    setIsGlobal(String(content._reusableKind || content._library?.kind || "section") === "component");
  }, [block, open]);

  const blockLabel = useMemo(() => block?.block_type.replace(/_/g, " ") || "section", [block]);

  const handleSave = async () => {
    if (!block) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please name this reusable section");
      return;
    }

    setSaving(true);
    try {
      const result = await upsertReusableFromBlock({
        block,
        name: trimmedName,
        description: description.trim(),
        category,
        kind: isGlobal ? "component" : "section",
        userId: user?.id ?? null,
      });

      toast.success(isGlobal ? "Global component saved" : "Reusable section saved");
      track("reusable_section_saved", { id: result.id, name: result.name, kind: isGlobal ? "component" : "section", category, block_type: block.block_type });
      onSaved?.({ id: result.id, name: result.name, kind: isGlobal ? "component" : "section" });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Could not save reusable section");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-primary" />
            Save as reusable
          </DialogTitle>
          <DialogDescription>
            Turn this {blockLabel} into a reusable section or a synced global component.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[11px] text-muted-foreground">Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Holiday hero, Shipping bar, Footer CTA…" className="mt-1" />
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this section is for and where it should be reused." className="mt-1 min-h-24" />
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REUSABLE_SECTION_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/30 bg-card/50 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Make this a synced global component</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edit once and let the latest version stay available across multiple pages.
                </p>
              </div>
              <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
            </div>
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{isGlobal ? "Global component" : "Reusable preset"}</span>
              {isGlobal ? " · Insert as a synced block with global edit / override / detach controls." : " · Insert as a reusable starting point that stays easy to customize per page."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {isGlobal ? <Link2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : isGlobal ? "Save global component" : "Save reusable section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
