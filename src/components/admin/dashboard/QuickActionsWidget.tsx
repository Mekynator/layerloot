import { Link } from "react-router-dom";
import { Eye, Package, ShoppingCart, Box, FileText, Star, Users, Settings, Truck, BarChart3, Calculator, Megaphone, Wallet, Tags, TicketPercent, Palette, ImageIcon, Globe, LucideIcon } from "lucide-react";
import DashboardWidget from "./DashboardWidget";

interface Shortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  permissions?: string[];
}

const ALL_SHORTCUTS: Shortcut[] = [
  { id: "editor", label: "Page Editor", icon: FileText, to: "/admin/editor", permissions: ["content.manage"] },
  { id: "translations", label: "Translations", icon: Globe, to: "/admin/translations", permissions: ["translations.manage"] },
  { id: "media", label: "Media", icon: ImageIcon, to: "/admin/media", permissions: ["content.manage"] },
  { id: "discounts", label: "Discounts", icon: TicketPercent, to: "/admin/discounts", permissions: ["products.manage"] },
  { id: "categories", label: "Categories", icon: Tags, to: "/admin/categories", permissions: ["products.manage"] },
  { id: "shipping", label: "Shipping", icon: Truck, to: "/admin/shipping" },
  { id: "reviews", label: "Reviews", icon: Star, to: "/admin/reviews" },
  { id: "pricing", label: "Pricing", icon: Calculator, to: "/admin/pricing" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, to: "/admin/campaigns" },
  { id: "backgrounds", label: "Backgrounds", icon: ImageIcon, to: "/admin/backgrounds" },
];

interface Props {
  hasPermission: (p: string) => boolean;
}

const QuickActionsWidget = ({ hasPermission }: Props) => {
  const visible = ALL_SHORTCUTS.filter(s =>
    !s.permissions || s.permissions.every(p => hasPermission(p)) || hasPermission("*")
  );

  return (
    <DashboardWidget title="Quick Actions" icon={Eye}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {visible.map((sc) => {
          const Icon = sc.icon;
          return (
            <Link key={sc.id} to={sc.to}
              className="flex flex-col items-center gap-1.5 rounded-lg bg-background/20 p-3 text-center transition-all duration-200 hover:bg-primary/10 hover:text-primary border border-primary/10 hover:border-primary/30">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">{sc.label}</span>
            </Link>
          );
        })}
      </div>
    </DashboardWidget>
  );
};

export default QuickActionsWidget;
