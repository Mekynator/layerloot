import { useEffect, useState } from "react";
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
import { Pencil, Plus, Minus } from "lucide-react";

interface Client {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  points_balance: number;
}

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsReason, setPointsReason] = useState("");
  const { toast } = useToast();

  const fetchClients = async () => {
    const { data: profiles } = await supabase.from("profiles").select("id, user_id, full_name, created_at");
    if (!profiles) return;

    const { data: orders } = await supabase.from("orders").select("user_id, total");
    const { data: points } = await supabase.from("loyalty_points").select("user_id, points");

    const orderMap = new Map<string, { count: number; spent: number }>();
    (orders ?? []).forEach((o) => {
      if (!o.user_id) return;
      const curr = orderMap.get(o.user_id) ?? { count: 0, spent: 0 };
      orderMap.set(o.user_id, { count: curr.count + 1, spent: curr.spent + Number(o.total) });
    });

    const pointsMap = new Map<string, number>();
    (points ?? []).forEach((p) => {
      pointsMap.set(p.user_id, (pointsMap.get(p.user_id) ?? 0) + p.points);
    });

    setClients(
      profiles.map((p) => ({
        ...p,
        order_count: orderMap.get(p.user_id)?.count ?? 0,
        total_spent: orderMap.get(p.user_id)?.spent ?? 0,
        points_balance: pointsMap.get(p.user_id) ?? 0,
      }))
    );
  };

  useEffect(() => { fetchClients(); }, []);

  const openEdit = (c: Client) => {
    setEditClient(c);
    setEditName(c.full_name ?? "");
    setPointsAmount(0);
    setPointsReason("");
  };

  const saveProfile = async () => {
    if (!editClient) return;
    await supabase.from("profiles").update({ full_name: editName }).eq("user_id", editClient.user_id);
    toast({ title: "Profile updated" });
    fetchClients();
  };

  const adjustPoints = async (positive: boolean) => {
    if (!editClient || pointsAmount <= 0 || !pointsReason) {
      toast({ title: "Enter amount and reason", variant: "destructive" });
      return;
    }
    const pts = positive ? pointsAmount : -pointsAmount;
    const { error } = await supabase.from("loyalty_points").insert({
      user_id: editClient.user_id,
      points: pts,
      reason: pointsReason,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${positive ? "Added" : "Removed"} ${pointsAmount} points` });
    setPointsAmount(0);
    setPointsReason("");
    fetchClients();
  };

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
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-display text-sm font-semibold uppercase">{c.full_name || "—"}</TableCell>
                  <TableCell>{c.order_count}</TableCell>
                  <TableCell className="font-display font-bold text-primary">{c.total_spent.toFixed(2)} kr</TableCell>
                  <TableCell><Badge variant="secondary">{c.points_balance} pts</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No clients yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editClient} onOpenChange={(v) => !v && setEditClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display uppercase">Edit Client</DialogTitle></DialogHeader>
          {editClient && (
            <div className="space-y-5">
              <div>
                <Label>Full Name</Label>
                <div className="flex gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Button onClick={saveProfile} size="sm">Save</Button>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-2 font-display text-sm font-semibold uppercase">Loyalty Points: <span className="text-primary">{editClient.points_balance} pts</span></p>
                <div className="space-y-2">
                  <Input type="number" min={1} value={pointsAmount || ""} onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)} placeholder="Amount" />
                  <Input value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder="Reason (e.g. Manual adjustment)" />
                  <div className="flex gap-2">
                    <Button onClick={() => adjustPoints(true)} className="flex-1" variant="default"><Plus className="mr-1 h-4 w-4" /> Add</Button>
                    <Button onClick={() => adjustPoints(false)} className="flex-1" variant="destructive"><Minus className="mr-1 h-4 w-4" /> Remove</Button>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                <p>Orders: {editClient.order_count} · Spent: {editClient.total_spent.toFixed(2)} kr</p>
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
