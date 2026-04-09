import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import AdminClients from "./AdminClients";
import AdminUsers from "./AdminUsers";
import AdminReferrals from "./AdminReferrals";

type UsersSection = "customers" | "admins" | "referrals";

const SECTION_CONFIG = [
  { value: "customers", label: "Customers", permission: "customers.view", component: AdminClients },
  { value: "admins", label: "Admins", permission: "*", component: AdminUsers },
  { value: "referrals", label: "Referrals", permission: "campaigns.manage", component: AdminReferrals },
] as const;

export default function UsersWorkspace() {
  const { hasPermission } = useAdminPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const sections = useMemo(
    () => SECTION_CONFIG.filter((section) => section.permission === "*" || hasPermission(section.permission)),
    [hasPermission],
  );

  const requestedSection = searchParams.get("section") as UsersSection | null;
  const activeSection = sections.some((section) => section.value === requestedSection)
    ? requestedSection!
    : (sections[0]?.value ?? "admins");

  useEffect(() => {
    if (!searchParams.get("section") || requestedSection !== activeSection) {
      const next = new URLSearchParams(searchParams);
      next.set("section", activeSection);
      setSearchParams(next, { replace: true });
    }
  }, [activeSection, requestedSection, searchParams, setSearchParams]);

  const handleSectionChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">Users</h1>
        <p className="text-xs text-muted-foreground">Customers first, admin access second, referrals third.</p>
      </div>

      <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1">
          {sections.map((section) => (
            <TabsTrigger key={section.value} value={section.value}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => {
          const Component = section.component;
          return (
            <TabsContent key={section.value} value={section.value}>
              <Component />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}