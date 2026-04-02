import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SlaRecord {
  id: string;
  stage: string;
  entered_at: string;
  deadline_at: string | null;
  resolved_at: string | null;
  sla_status: string;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export default function CustomOrderSlaCard({ orderId }: { orderId: string }) {
  const [records, setRecords] = useState<SlaRecord[]>([]);

  useEffect(() => {
    supabase
      .from("custom_order_sla_tracking" as any)
      .select("*")
      .eq("custom_order_id", orderId)
      .order("entered_at", { ascending: false })
      .then(({ data }) => setRecords((data as any as SlaRecord[]) ?? []));
  }, [orderId]);

  if (records.length === 0) return null;

  const current = records.find(r => !r.resolved_at);
  const totalMs = records.reduce((sum, r) => {
    const end = r.resolved_at ? new Date(r.resolved_at).getTime() : Date.now();
    return sum + (end - new Date(r.entered_at).getTime());
  }, 0);

  const statusIcon = (s: string) => {
    if (s === "overdue") return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    if (s === "warning") return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  };

  const statusColor = (s: string) => {
    if (s === "overdue") return "border-red-500/30 bg-red-500/10 text-red-600";
    if (s === "warning") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-600";
    return "border-green-500/30 bg-green-500/10 text-green-600";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm uppercase flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> SLA Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {current && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Current Stage</p>
              <p className="text-sm font-semibold capitalize">{current.stage.replace(/_/g, " ")}</p>
            </div>
            <Badge variant="outline" className={`flex items-center gap-1 ${statusColor(current.sla_status)}`}>
              {statusIcon(current.sla_status)}
              {current.sla_status === "on_track" ? "On Track" : current.sla_status === "warning" ? "Needs Attention" : "Overdue"}
            </Badge>
          </div>
        )}

        {current && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Time in Stage</p>
              <p className="font-medium">{formatDuration(Date.now() - new Date(current.entered_at).getTime())}</p>
            </div>
            {current.deadline_at && (
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="font-medium">{new Date(current.deadline_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Turnaround</span>
          <span className="font-semibold">{formatDuration(totalMs)}</span>
        </div>

        {/* Completed stages */}
        {records.filter(r => r.resolved_at).length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground">Stage History</p>
            {records.filter(r => r.resolved_at).map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="capitalize">{r.stage.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">
                  {formatDuration(new Date(r.resolved_at!).getTime() - new Date(r.entered_at).getTime())}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
