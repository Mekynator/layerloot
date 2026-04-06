import { useEffect, useState, useCallback } from "react";
import { Save, Plus, Trash2, Eye, EyeOff, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Policy {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  body: string;
  is_visible: boolean;
  sort_order: number;
  meta_title: string;
  meta_description: string;
  updated_at: string;
}

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AdminPolicies = () => {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchPolicies = useCallback(async () => {
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setPolicies(data as Policy[]);
      // Re-select if we had one selected
      if (selected) {
        const updated = data.find((p) => p.id === selected.id);
        if (updated) {
          setSelected(updated as Policy);
          setDirty(false);
        }
      }
    }
    setLoading(false);
  }, [selected?.id]);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSelect = (policy: Policy) => {
    setSelected({ ...policy });
    setDirty(false);
  };

  const updateField = <K extends keyof Policy>(field: K, value: Policy[K]) => {
    if (!selected) return;
    setSelected((prev) => (prev ? { ...prev, [field]: value } : prev));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    const payload = {
      title: selected.title.trim(),
      slug: selected.slug.trim() || generateSlug(selected.title),
      short_description: selected.short_description,
      body: selected.body,
      is_visible: selected.is_visible,
      sort_order: selected.sort_order,
      meta_title: selected.meta_title,
      meta_description: selected.meta_description,
    };

    const { error } = await supabase
      .from("policies")
      .update(payload)
      .eq("id", selected.id);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Policy saved" });
    setDirty(false);
    await fetchPolicies();
  };

  const handleCreate = async () => {
    const newSort = policies.length;
    const { data, error } = await supabase
      .from("policies")
      .insert({
        title: "New Policy",
        slug: `new-policy-${Date.now()}`,
        sort_order: newSort,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Policy created" });
    await fetchPolicies();
    if (data) {
      setSelected(data as Policy);
      setDirty(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("policies").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Policy deleted" });
      if (selected?.id === deleteTarget.id) {
        setSelected(null);
        setDirty(false);
      }
      await fetchPolicies();
    }
    setDeleteTarget(null);
  };

  const movePolicy = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= policies.length) return;
    const updated = [...policies];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    const reordered = updated.map((p, i) => ({ ...p, sort_order: i }));
    setPolicies(reordered);

    await Promise.all(
      reordered.map((p) =>
        supabase.from("policies").update({ sort_order: p.sort_order }).eq("id", p.id)
      )
    );
  };

  const toggleVisibility = async (policy: Policy) => {
    const newVal = !policy.is_visible;
    await supabase.from("policies").update({ is_visible: newVal }).eq("id", policy.id);
    await fetchPolicies();
    if (selected?.id === policy.id) {
      setSelected((prev) => (prev ? { ...prev, is_visible: newVal } : prev));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading policies...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground">Policies</h1>
          <p className="text-xs text-muted-foreground">Manage store policies — content, visibility, and SEO</p>
        </div>
        <Button onClick={handleCreate} className="font-display text-xs uppercase tracking-wider">
          <Plus className="mr-1 h-4 w-4" /> Create Policy
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ─── Policy List ─── */}
        <div className="space-y-2">
          {policies.map((policy, idx) => (
            <Card
              key={policy.id}
              className={`cursor-pointer transition-all ${
                selected?.id === policy.id
                  ? "border-primary/50 bg-primary/5"
                  : "hover:border-border/60"
              }`}
              onClick={() => handleSelect(policy)}
            >
              <CardContent className="flex items-center gap-2 p-3">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{policy.title}</p>
                  <p className="truncate text-[10px] font-mono text-muted-foreground">/policies/{policy.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={policy.is_visible ? "default" : "secondary"} className="text-[9px]">
                    {policy.is_visible ? "Visible" : "Hidden"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(policy); }}
                  >
                    {policy.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); movePolicy(idx, -1); }}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); movePolicy(idx, 1); }}
                    disabled={idx === policies.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {policies.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No policies yet. Click "Create Policy" to add one.</p>
          )}
        </div>

        {/* ─── Policy Editor ─── */}
        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-sm uppercase">Edit Policy</CardTitle>
                <div className="flex items-center gap-2">
                  {dirty && <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">Unsaved</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive text-xs"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    size="sm"
                    className="font-display text-xs uppercase tracking-wider"
                  >
                    <Save className="mr-1 h-3 w-3" /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={selected.title}
                      onChange={(e) => updateField("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slug</Label>
                    <Input
                      value={selected.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">/policies/{selected.slug}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Short Description</Label>
                  <Input
                    value={selected.short_description}
                    onChange={(e) => updateField("short_description", e.target.value)}
                    placeholder="Brief summary for admin reference"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={selected.is_visible}
                    onCheckedChange={(v) => updateField("is_visible", v)}
                  />
                  <Label className="text-xs">Visible on site</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm uppercase">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-xs">Full Content (Markdown)</Label>
                <Textarea
                  value={selected.body}
                  onChange={(e) => updateField("body", e.target.value)}
                  rows={20}
                  className="mt-1 font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-sm uppercase">SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Meta Title</Label>
                  <Input
                    value={selected.meta_title}
                    onChange={(e) => updateField("meta_title", e.target.value)}
                    placeholder={selected.title}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {(selected.meta_title || selected.title).length}/60 characters
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Meta Description</Label>
                  <Textarea
                    value={selected.meta_description}
                    onChange={(e) => updateField("meta_description", e.target.value)}
                    rows={2}
                    placeholder="Brief description for search engines"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {selected.meta_description.length}/160 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="text-[10px] text-muted-foreground">
              Last updated: {new Date(selected.updated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border/40 py-20">
            <p className="text-sm text-muted-foreground">Select a policy from the list to edit it</p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this policy page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPolicies;
