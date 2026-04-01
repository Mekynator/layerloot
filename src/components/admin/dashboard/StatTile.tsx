import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  to?: string | null;
  alert?: number;
  trend?: { value: number; label: string } | null;
  accent?: "primary" | "green" | "amber" | "red" | "purple";
}

const accentMap = {
  primary: "from-primary/20 to-primary/5 text-primary",
  green: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-400",
  red: "from-red-500/20 to-red-500/5 text-red-400",
  purple: "from-purple-500/20 to-purple-500/5 text-purple-400",
};

const StatTile = ({ label, value, icon: Icon, sub, to, alert = 0, trend, accent = "primary" }: StatTileProps) => {
  const content = (
    <div className="glass-card group relative flex flex-col gap-3 rounded-xl border border-white/[0.06] p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)]">
      {alert > 0 && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]">
          {alert > 9 ? "9+" : alert}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="font-display text-3xl font-bold text-foreground">{value}</p>
      <div className="flex items-center justify-between">
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trend && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", trend.value >= 0 ? "text-emerald-400" : "text-red-400")}>
            {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return content;
};

export default StatTile;
