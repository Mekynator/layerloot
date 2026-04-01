import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AlertItemProps {
  icon: LucideIcon;
  label: string;
  count: number;
  to: string;
  severity?: "warning" | "info" | "urgent";
}

const severityStyles = {
  urgent: "border-red-500/20 bg-red-500/5 text-red-400",
  warning: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  info: "border-primary/20 bg-primary/5 text-primary",
};

const AlertItem = ({ icon: Icon, label, count, to, severity = "info" }: AlertItemProps) => {
  if (count === 0) return null;
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all hover:scale-[1.01] hover:shadow-md",
        severityStyles[severity]
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">{count}</span>
    </Link>
  );
};

export default AlertItem;
