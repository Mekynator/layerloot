import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Pencil, Plus, Minus, History } from "lucide-react";

interface Client {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  points_balance: number;
}

interface LoyaltyRow {
  id: string;
  user_id: string;
  points: number;
  reason: string | null;
  created_at: string;
}

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");
  const [history, setHistory] = useState<LoyaltyRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    const [{ data: profiles, error: profilesError }, { data: orders }, { data: points }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, created_at").order("created_at", { ascending: false }),
      supabase.from("orders").select("user_id, total"),
      supabase.from("loyalty_points").select("user_id, points"),
    ]);

    if (profilesError) {
      toast({ title: "Error loading clients", description: profilesError.message, variant: "destructive" });
      return;
    }

    const orderMap = new Map<string, { count: number; spent: number }>();
    (orders ?? []).forEach((o) => {
      if (!o.user_id) return;
      const curr = orderMap.get(o.user_id) ?? { count: 0, spent: 0 };
      orderMap.set(o.user_id, {
        count: curr.count + 1,
        spent: curr.spent + Number(o.total ?? 0),
      });
    });

    const pointsMap = new Map<string, number>();
    (points ?? []).forEach((p) => {
      if (!p.user_id) return;
      pointsMap.set(p.user_id, (pointsMap.get(p.user_id) ?? 0) + Number(p.points ?? 0));
    });

    setClients(
      (profiles ?? []).map((p) => ({
        ...p,
        order_count: orderMap.get(p.user_id)?.count ?? 0,
        total_spent: orderMap.get(p.user_id)?.spent ?? 0,
        points_balance: pointsMap.get(p.user_id) ?? 0,
      })),
    );
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const loadHistory = async (userId: string) => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("loyalty_points")
      .select("id, user_id, points, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    setLoadingHistory(false);

    if (error) {
      toast({ title: "Error loading history", description: error.message, variant: "destructive" });
      setHistory([]);
      return;
    }

    setHistory((data as LoyaltyRow[]) ?? []);
  };

  const openEdit = async (client: Client) => {
    setEditClient(client);
    setEditName(client.full_name ?? "");
    setPointsAmount(0);
    setPointsReason("");
    await loadHistory(client.user_id);
  };

  const saveProfile = async () => {
    if (!editClient) return;
    const { error } = await supabase.from("profiles").update({ full_name: editName }).eq("user_id", editClient.user_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profile updated" });
    fetchClients();
  };

  const adjustPoints = async (positive: boolean) => {
    if (!editClient || pointsAmount <= 0 || !pointsReason.trim()) {
      toast({ title: "Enter amount and reason", variant: "destructive" });
      return;
    }

    const pts = positive ? pointsAmount : -pointsAmount;
    const { error } = await supabase.from("loyalty_points").insert({
      user_id: editClient.user_id,
      points: pts,
      reason: pointsReason.trim(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `${positive ? "Added" : "Removed"} ${pointsAmount} points` });
    setPointsAmount(0);
    setPointsReason("");
    await Promise.all([fetchClients(), loadHistory(editClient.user_id)]);
  };

  const currentBalance = useMemo(() => {
    if (!editClient) return 0;
    const refreshed = clients.find((c) => c.user_id === editClient.user_id);
    return refreshed?.points_balance ?? editClient.points_balance;
  }, [clients, editClient]);

  return (
    <AdminLayout>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase text-foreground">Clients</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-display text-sm font-semibold uppercase">
                    {client.full_name || "—"}
                  </TableCell>
                  <TableCell>{client.order_count}</TableCell>
                  <TableCell className="font-display font-bold text-primary">
                    {client.total_spent.toFixed(2)} kr
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client.points_balance} pts</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No clients yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!editClient}
        onOpenChange={(open) => {
          if (!open) {
            setEditClient(null);
            setHistory([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Edit Client</DialogTitle>
          </DialogHeader>

          {editClient && (
            <div className="space-y-5">
              <div>
                <Label>Full Name</Label>
                <div className="flex gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Button onClick={saveProfile} size="sm">
                    Save
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-2 font-display text-sm font-semibold uppercase">
                  Loyalty Points: <span className="text-primary">{currentBalance} pts</span>
                </p>
                <div className="space-y-2">
                  <Input
                    type="number"
                    min={1}
                    value={pointsAmount || ""}
                    onChange={(e) => setPointsAmount(parseInt(e.target.value, 10) || 0)}
                    placeholder="Amount"
                  />
                  <Input
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    placeholder="Reason (e.g. Manual loyalty adjustment)"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => adjustPoints(true)} className="flex-1" variant="default">
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                    <Button onClick={() => adjustPoints(false)} className="flex-1" variant="destructive">
                      <Minus className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <p className="font-display text-sm font-semibold uppercase">Recent Loyalty Activity</p>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {loadingHistory ? (
                    <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                      Loading history...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                      No loyalty activity yet.
                    </div>
                  ) : (
                    history.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-foreground">{row.reason || "Points update"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                        </div>
                        <span
                          className={row.points >= 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"}
                        >
                          {row.points >= 0 ? `+${row.points}` : row.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                <p>
                  Orders: {editClient.order_count} · Spent: {editClient.total_spent.toFixed(2)} kr
                </p>
                <p>Joined: {new Date(editClient.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminClients;
