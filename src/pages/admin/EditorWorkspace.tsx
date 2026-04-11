import { Suspense, lazy, useCallback, useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileText, Layers, Settings, Shield, Sparkles } from "lucide-react";

const AdminPolicies = lazy(() => import("@/pages/admin/AdminPolicies"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

function PageEditorLaunchpad() {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden border-border/40 bg-card/70">
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Dedicated visual workspace
          </div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">Full Canva-style Page Editor</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Open the spacious standalone editor to work on page layouts, block internals, header/footer sections, responsive previews, presets, and publish-safe draft changes without the normal admin shell around it.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/30 px-3 py-1">Drag & drop sections</span>
            <span className="rounded-full border border-border/30 px-3 py-1">Deep element editing</span>
            <span className="rounded-full border border-border/30 px-3 py-1">Desktop / tablet / mobile preview</span>
            <span className="rounded-full border border-border/30 px-3 py-1">Safe draft + publish workflow</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate("/admin/visual-editor")} className="font-display uppercase tracking-wider">
              Open Page Editor <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/visual-editor")}>Edit Header / Footer</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/30 bg-background/60 p-4 shadow-sm">
          <div className="rounded-xl border border-border/30 bg-slate-950 p-3 text-white">
            <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-300">
              <span>Editor shell</span>
              <span>Live preview</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-[120px_1fr_120px]">
              <div className="rounded-lg bg-white/10 p-2 text-[10px]">Structure<br />Elements<br />Layers</div>
              <div className="rounded-lg bg-white/5 p-2 text-[10px]">Canvas preview<br />Blocks · header · footer<br />Responsive modes</div>
              <div className="rounded-lg bg-white/10 p-2 text-[10px]">Properties<br />Styles<br />Presets</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Use this workspace when you want maximum layout freedom while keeping the storefront data model and rendering stable.</p>
        </div>
      </CardContent>
    </Card>
  );
}

const tabConfig = [
  { value: "pages", label: "Page Editor", icon: FileText },
  { value: "blocks", label: "Blocks & Content", icon: Layers, component: AdminContent },
  { value: "policies", label: "Policies", icon: Shield, component: AdminPolicies },
  { value: "settings", label: "Site Settings", icon: Settings, component: AdminSettings },
];

export default function EditorWorkspace() {
  const [activeTab, setActiveTab] = useState("pages");
  const [, startTransition] = useTransition();
  const handleTabChange = useCallback((value: string) => startTransition(() => setActiveTab(value)), []);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase text-foreground">
            Content & Layout
          </h1>
          <p className="text-xs text-muted-foreground">Unified workspace for editing pages, blocks, policies, and site content</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pages">
          <PageEditorLaunchpad />
        </TabsContent>

        {tabConfig.filter((tab) => tab.value !== "pages").map(({ value, component: Comp }) => (
          <TabsContent key={value} value={value}>
            <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>}>
              {Comp ? <Comp /> : null}
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
}
