import React, { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("section");
  const activeTab = tabConfig.some((tab) => tab.value === requestedTab) ? requestedTab! : "growth";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "growth") next.delete("section");
    else next.set("section", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">Adjustments / Financial</h1>
        <p className="text-xs text-muted-foreground">Growth, revenue, reporting, declaration, policies, and settings in one workspace.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
    </div>
  );
};

export default FinancialWorkspace;
