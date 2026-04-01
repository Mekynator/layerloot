import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVisualEditor, pageToEditorKey, pageToRealPath, pageDisplayTitle } from "@/contexts/VisualEditorContext";
import type { Tables } from "@/integrations/supabase/types";

type SitePage = Tables<"site_pages">;

type PageForm = {
  name: string;
  title: string;
  slug: string;
  pageType: "main" | "child";
  parentId: string;
  isPublished: boolean;
  showInHeader: boolean;
  showInFooter: boolean;
  isHome: boolean;
};

const emptyForm: PageForm = { name: "", title: "", slug: "", pageType: "main", parentId: "", isPublished: true, showInHeader: false, showInFooter: false, isHome: false };

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9\-_\s]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[-_/]+|[-_/]+$/g, "");

interface PageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
}

export default function PageManagerDialog({ open, onOpenChange, mode }: PageManagerDialogProps) {
  const { selectedPage, pages, loadPages, setActivePage, frontendPages } = useVisualEditor();
  const [form, setForm] = useState<PageForm>(emptyForm);

  const childCandidates = useMemo(() => frontendPages.filter(p => p.id !== selectedPage?.id), [frontendPages, selectedPage]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && selectedPage) {
      setForm({
        name: selectedPage.name || "",
        title: selectedPage.title || "",
        slug: selectedPage.is_home ? "home" : selectedPage.slug || "",
        pageType: selectedPage.page_type === "child" ? "child" : "main",
        parentId: selectedPage.parent_id || "",
        isPublished: selectedPage.is_published,
        showInHeader: selectedPage.show_in_header,
        showInFooter: selectedPage.show_in_footer,
        isHome: selectedPage.is_home,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, selectedPage]);

  const save = async () => {
    const isEditing = mode === "edit" && selectedPage;
    const parent = childCandidates.find(p => p.id === form.parentId);
    const rawSlug = form.isHome ? "home" : normalizeSlug(form.slug || form.name);

    if (!form.name.trim()) { toast.error("Page name required"); return; }
    if (!rawSlug) { toast.error("Slug required"); return; }
    if (form.pageType === "child" && !parent) { toast.error("Parent page required"); return; }

    const fullPath = form.isHome ? "/" : form.pageType === "child" && parent
      ? `${pageToRealPath(parent).replace(/\/+$/, "")}/${rawSlug}`.replace(/\/+/g, "/")
      : `/${rawSlug}`;

    const normalizedFullPath = fullPath.replace(/\/{2,}/g, "/");
    const nextEditorKey = form.isHome ? "home" : normalizedFullPath.replace(/^\/+|\/+$/g, "");

    if (form.isHome) {
      const resetQuery = supabase.from("site_pages").update({ is_home: false }).eq("is_home", true);
      const { error } = isEditing ? await resetQuery.neq("id", selectedPage!.id) : await resetQuery;
      if (error) { toast.error(error.message); return; }
    }

    const payload: any = {
      name: form.name.trim(),
      title: form.title.trim() || form.name.trim(),
      slug: rawSlug,
      full_path: normalizedFullPath,
      parent_id: form.pageType === "child" ? form.parentId : null,
      page_type: form.pageType,
      is_home: form.isHome,
      is_published: form.isPublished,
      show_in_header: form.showInHeader,
      show_in_footer: form.showInFooter,
    };

    const oldPageKey = isEditing ? pageToEditorKey(selectedPage!) : null;
    const { error } = isEditing
      ? await supabase.from("site_pages").update(payload).eq("id", selectedPage!.id)
      : await supabase.from("site_pages").insert(payload);

    if (error) { toast.error(error.message); return; }

    if (isEditing && oldPageKey && oldPageKey !== nextEditorKey) {
      await supabase.from("site_blocks").update({ page: nextEditorKey }).eq("page", oldPageKey);
    }

    await loadPages();
    setActivePage(nextEditorKey);
    onOpenChange(false);
    toast.success(isEditing ? "Page updated" : "Page created");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">{mode === "create" ? "Create Page" : "Edit Page"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Page name</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Page title</Label>
              <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.pageType} onValueChange={(v: "main" | "child") => setForm(p => ({ ...p, pageType: v, parentId: v === "main" ? "" : p.parentId }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main page</SelectItem>
                  <SelectItem value="child">Child page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm(p => ({ ...p, slug: normalizeSlug(e.target.value) }))} className="h-8 text-xs" disabled={form.isHome} />
            </div>
          </div>

          {form.pageType === "child" && (
            <div>
              <Label className="text-xs">Parent page</Label>
              <Select value={form.parentId} onValueChange={(v) => setForm(p => ({ ...p, parentId: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose parent" /></SelectTrigger>
                <SelectContent>
                  {childCandidates.map(p => <SelectItem key={p.id} value={p.id}>{pageDisplayTitle(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {([
              { key: "isPublished", label: "Published", desc: "Show on live site" },
              { key: "isHome", label: "Homepage", desc: "Set as homepage" },
              { key: "showInHeader", label: "In header", desc: "Show in nav" },
              { key: "showInFooter", label: "In footer", desc: "Show in footer" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={form[key]} onCheckedChange={(v) => setForm(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-8 text-xs">Cancel</Button>
            <Button onClick={() => void save()} className="flex-1 h-8 text-xs font-display uppercase tracking-wider">{mode === "create" ? "Create" : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
