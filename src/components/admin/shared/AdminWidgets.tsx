import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  sub?: string;
  accent?: "primary" | "green" | "amber" | "purple" | "red";
}

const ACCENT_MAP = {
  primary: "text-primary bg-primary/10",
  green: "text-emerald-400 bg-emerald-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  purple: "text-purple-400 bg-purple-500/10",
  red: "text-red-400 bg-red-500/10",
};

export const StatCard = ({ label, value, icon: Icon, sub, accent = "primary" }: StatCardProps) => (
  <Card className="border-primary/10 bg-card/40">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENT_MAP[accent]}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <span className="font-display text-2xl font-bold text-foreground">{value}</span>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
);

interface AdminDataTableShellProps {
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export const AdminDataTableShell = ({ children, emptyMessage = "No data found.", isEmpty }: AdminDataTableShellProps) => (
  <Card>
    <CardContent className="p-0">
      {isEmpty ? (
        <div className="py-12 text-center text-muted-foreground">{emptyMessage}</div>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);

interface AdminModulePlaceholderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export const AdminModulePlaceholder = ({ title, description, icon: Icon }: AdminModulePlaceholderProps) => (
  <Card className="border-dashed border-primary/20">
    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="mb-4 h-10 w-10 text-muted-foreground/40" />}
      <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
