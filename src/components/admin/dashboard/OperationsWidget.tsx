import { Truck, PauseCircle, MessageSquareMore, Package } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import type { DashboardData } from "@/hooks/use-admin-dashboard";

interface Props { data: DashboardData }

const Row = ({ icon: Icon, label, count, to, accent }: { icon: typeof Truck; label: string; count: number; to: string; accent?: string }) => (
  <Link to={to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background/40">
    <Icon className={`h-4 w-4 shrink-0 ${accent ?? "text-primary"}`} />
    <span className="flex-1 text-sm text-foreground">{label}</span>
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${count > 0 ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"}`}>{count}</span>
  </Link>
);

const OperationsWidget = ({ data }: Props) => (
  <DashboardWidget title="Operations Queue" icon={Truck} linkTo="/admin/orders" linkLabel="Orders">
    <div className="space-y-1">
      <Row icon={Truck} label="Awaiting shipment" count={data.ordersAwaitingShipment ?? 0} to="/orders" />
      <Row icon={PauseCircle} label="On hold" count={data.ordersOnHold ?? 0} to="/orders" accent="text-red-400" />
      <Row icon={Package} label="Custom orders needing quote" count={data.quotesAwaiting} to="/custom-orders" />
      <Row icon={MessageSquareMore} label="Unanswered messages" count={data.unansweredCustomMessages ?? 0} to="/custom-orders" />
    </div>
  </DashboardWidget>
);

export default OperationsWidget;
