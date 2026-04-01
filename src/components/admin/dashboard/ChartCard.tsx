import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const ChartCard = ({ title, icon: Icon, children, className, action }: ChartCardProps) => (
  <Card className={`glass-card border-white/[0.06] ${className ?? ""}`}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default ChartCard;
