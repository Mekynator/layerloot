import { Bell, ShoppingCart, MessageSquareMore, Star, Palette, Package, PauseCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DashboardWidget from "./DashboardWidget";
import type { DashboardData } from "@/hooks/use-admin-dashboard";

interface Props { data: DashboardData }

const QueueItem = ({ icon: Icon, label, count, to, severity }: {
  icon: typeof ShoppingCart; label: string; count: number; to: string;
  severity: "urgent" | "warning" | "info";
}) => {
  if (count === 0) return null;
  const colors = {
    urgent: "bg-red-500/10 text-red-400 hover:bg-red-500/15",
    warning: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/15",
    info: "bg-primary/10 text-primary hover:bg-primary/15",
  };
  return (
    <Link to={to} className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 border border-primary/10 ${colors[severity]}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs font-bold">{count}</span>
      <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
};

const ActionCenterWidget = ({ data }: Props) => {
  const hasItems = data.pendingOrders > 0 || data.quotesAwaiting > 0 ||
    data.pendingReviews > 0 || data.pendingShowcases > 0 ||
    data.lowStockProducts.length > 0 || (data.ordersOnHold ?? 0) > 0;

  if (!hasItems) return null;

  return (
    <DashboardWidget title="Needs Your Attention" icon={Bell}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <QueueItem icon={ShoppingCart} label="Pending orders" count={data.pendingOrders} to="/orders" severity={data.pendingOrders > 3 ? "urgent" : "warning"} />
        <QueueItem icon={MessageSquareMore} label="Quotes awaiting reply" count={data.quotesAwaiting} to="/custom-orders" severity="warning" />
        <QueueItem icon={Star} label="Reviews pending" count={data.pendingReviews} to="/reviews" severity="info" />
        <QueueItem icon={Palette} label="Showcases pending" count={data.pendingShowcases} to="/showcases" severity="info" />
        <QueueItem icon={Package} label="Low stock products" count={data.lowStockProducts.length} to="/products" severity="warning" />
        <QueueItem icon={PauseCircle} label="Orders on hold" count={data.ordersOnHold ?? 0} to="/orders" severity="urgent" />
      </div>
    </DashboardWidget>
  );
};

export default ActionCenterWidget;
