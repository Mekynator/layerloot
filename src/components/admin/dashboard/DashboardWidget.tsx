import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";

interface DashboardWidgetProps {
  title: string;
  icon?: LucideIcon;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}

const DashboardWidget = ({ title, icon: Icon, linkTo, linkLabel, children, className }: DashboardWidgetProps) => (
  <div className={`rounded-xl border border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)] bg-card/40 p-4 ${className ?? ""}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {linkTo && (
        <Link to={linkTo} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          {linkLabel ?? "View all"} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
    {children}
  </div>
);

export default DashboardWidget;
