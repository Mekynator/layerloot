import { useEffect, useState } from "react";
import { Activity, FileText, Package, ShoppingCart, Box, Users, Globe, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "./DashboardWidget";

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  user_email: string | null;
  created_at: string;
}

const ENTITY_ICONS: Record<string, typeof Activity> = {
  order: ShoppingCart,
  custom_order: Box,
  product: Package,
  block: FileText,
  translation: Globe,
  user: Users,
  review: Star,
};

const ENTITY_LINKS: Record<string, string> = {
  order: "/admin/orders",
  custom_order: "/admin/custom-orders",
  product: "/admin/products",
  block: "/admin/editor",
  translation: "/admin/translations",
  user: "/admin/users?section=customers",
  review: "/admin/reviews",
};

const RecentActivityWidget = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("admin_activity_log")
      .select("id, action, entity_type, entity_id, summary, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (mounted && data) setEntries(data);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardWidget title="Recent Activity" icon={Activity} linkTo="/admin/activity" linkLabel="Full log">
      {entries.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No recent activity logged.</p>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {entries.map((evt) => {
            const Icon = ENTITY_ICONS[evt.entity_type ?? ""] ?? Activity;
            const to = ENTITY_LINKS[evt.entity_type ?? ""] ?? "/admin/activity";
            return (
              <Link key={evt.id} to={to} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-card/60">
                <Icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground/80">{evt.summary ?? evt.action}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {evt.user_email?.split("@")[0] ?? "System"} · {new Date(evt.created_at).toLocaleString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardWidget>
  );
};

export default RecentActivityWidget;
