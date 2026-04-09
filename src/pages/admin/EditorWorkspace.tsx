import React, { Suspense, lazy } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, LayoutGrid, Shield, Settings, Layers } from "lucide-react";

const PageEditor = lazy(() => import("@/pages/admin/PageEditor"));
const AdminPolicies = lazy(() => import("@/pages/admin/AdminPolicies"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

const tabConfig = [
  { value: "pages", label: "Pages", icon: FileText, component: PageEditor },
  { value: "blocks", label: "Blocks & Content", icon: Layers, component: AdminContent },
  { value: "policies", label: "Policies", icon: Shield, component: AdminPolicies },
  { value: "settings", label: "Site Settings", icon: Settings, component: AdminSettings },
];

export default function EditorWorkspace() {
  const [activeTab, setActiveTab] = React.useState("pages");
  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground flex items-center gap-2">
            Content & Layout
          </h1>
          <p className="text-xs text-muted-foreground">Unified workspace for editing pages, blocks, policies, and site content</p>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5">
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabConfig.map(({ value, component: Comp }) => (
          <TabsContent key={value} value={value}>
            <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>}>
              <Comp />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </AdminLayout>
  );
}
