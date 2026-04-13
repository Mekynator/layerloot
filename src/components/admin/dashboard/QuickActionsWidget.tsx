import { Link } from "react-router-dom";
import { Eye, FileText, Star, Truck, Calculator, Megaphone, Tags, TicketPercent, ImageIcon, Globe, LucideIcon } from "lucide-react";
import DashboardWidget from "./DashboardWidget";

interface Shortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  permissions?: string[];
}

const ALL_SHORTCUTS: Shortcut[] = [
  { id: "editor", label: "Page Editor", icon: FileText, to: "/visual-editor", permissions: ["content.edit"] },
  { id: "translations", label: "Translations", icon: Globe, to: "/translations", permissions: ["translations.manage"] },
  { id: "media", label: "Media", icon: ImageIcon, to: "/media", permissions: ["media.manage"] },
  { id: "discounts", label: "Discounts", icon: TicketPercent, to: "/discounts", permissions: ["products.manage"] },
  { id: "categories", label: "Categories", icon: Tags, to: "/categories", permissions: ["products.manage"] },
  { id: "shipping", label: "Shipping", icon: Truck, to: "/shipping" },
  { id: "reviews", label: "Reviews", icon: Star, to: "/reviews" },
  { id: "pricing", label: "Pricing", icon: Calculator, to: "/pricing" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, to: "/campaigns" },
  { id: "backgrounds", label: "Backgrounds", icon: ImageIcon, to: "/backgrounds" },
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
