import { FileText, Clock, Calendar, Package } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardWidget from "./DashboardWidget";
import type { DashboardData } from "@/hooks/use-admin-dashboard";

interface Props { data: DashboardData }

const Row = ({ icon: Icon, label, count, to }: { icon: typeof FileText; label: string; count: number; to: string }) => (
  <Link to={to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background/40">
    <Icon className="h-4 w-4 text-primary shrink-0" />
    <span className="flex-1 text-sm text-foreground">{label}</span>
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{count}</span>
  </Link>
);

const ContentStatusWidget = ({ data }: Props) => (
  <DashboardWidget title="Content & Publishing" icon={FileText} linkTo="/admin/editor" linkLabel="Content & Layout">
    <div className="space-y-1">
      <Row icon={Clock} label="Drafts pending publish" count={data.draftBlocksCount ?? 0} to="/editor" />
      <Row icon={Calendar} label="Scheduled publishes" count={data.scheduledPublishCount ?? 0} to="/editor" />
      <Row icon={Package} label="Draft products" count={data.draftProductsCount ?? 0} to="/products" />
    </div>
  </DashboardWidget>
);

export default ContentStatusWidget;
