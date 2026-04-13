import AdminPageShell from "@/components/admin/AdminPageShell";
import { Wrench, Database, Server, RefreshCw, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const SystemCard = ({ title, description, icon: Icon, to, badge }: {
  title: string;
  description: string;
  icon: typeof Wrench;
  to?: string;
  badge?: string;
}) => (
  <Card className="border-primary/10 bg-card/40 hover:border-primary/25 transition-colors">
    <CardContent className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
            {badge && <Badge variant="outline" className="text-[9px]">{badge}</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          {to && (
            <Link to={to}>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">Open →</Button>
            </Link>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminSystem = () => (
  <AdminPageShell title="System & Maintenance" description="System tools, health checks, and maintenance utilities." icon={Wrench}>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <SystemCard
        title="Activity Log"
        description="View all admin actions and audit trail."
        icon={RefreshCw}
        to="/activity"
      />
      <SystemCard
        title="Email Logs"
        description="Monitor outbound email delivery and errors."
        icon={Server}
        to="/email-logs"
      />
      <SystemCard
        title="Admin Roles"
        description="Manage admin permissions and role assignments."
        icon={Shield}
        to="/admin-roles"
      />
      <SystemCard
        title="Automations"
        description="View and manage automation workflows."
        icon={RefreshCw}
        to="/automations"
      />
      <SystemCard
        title="Financial Workspace"
        description="Expenses, declarations, and financial reports."
        icon={Database}
        to="/financial"
      />
    </div>
  </AdminPageShell>
);

export default AdminSystem;
