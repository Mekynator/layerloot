import React, { Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import { TrendingUp, DollarSign, FileText, Calendar, Settings, Shield } from "lucide-react";

const Growth = React.lazy(() => import("./AdminGrowth"));
const Revenue = React.lazy(() => import("./AdminRevenue"));
const Reports = React.lazy(() => import("./AdminReports"));
const Declaration = React.lazy(() => import("./AdminDeclaration"));
const Policies = React.lazy(() => import("./AdminPolicies"));
const SettingsPage = React.lazy(() => import("./AdminSettings"));

const tabConfig = [
  { value: "growth", label: "Growth", icon: TrendingUp, component: Growth },
  { value: "revenue", label: "Revenue Engine", icon: DollarSign, component: Revenue },
  { value: "reports", label: "Reports", icon: FileText, component: Reports },
  { value: "declaration", label: "Monthly Declaration", icon: Calendar, component: Declaration },
  { value: "policies", label: "Policies", icon: Shield, component: Policies },
  { value: "settings", label: "Settings", icon: Settings, component: SettingsPage },
];

const FinancialWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("growth");
  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-foreground flex items-center gap-2">
            Adjustments / Financial
          </h1>
          <p className="text-xs text-muted-foreground">Centralized workspace for growth, revenue, reporting, policies, and settings</p>
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
};

export default FinancialWorkspace;
