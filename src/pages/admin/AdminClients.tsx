import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface Client {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
}

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, user_id, full_name, created_at");
      if (!profiles) return;

      const { data: orders } = await supabase.from("orders").select("user_id, total");

      const clientMap = new Map<string, { count: number; spent: number }>();
      (orders ?? []).forEach((o) => {
        if (!o.user_id) return;
        const curr = clientMap.get(o.user_id) ?? { count: 0, spent: 0 };
        clientMap.set(o.user_id, { count: curr.count + 1, spent: curr.spent + Number(o.total) });
      });

      setClients(
        profiles.map((p) => ({
          ...p,
          order_count: clientMap.get(p.user_id)?.count ?? 0,
          total_spent: clientMap.get(p.user_id)?.spent ?? 0,
        }))
      );
    };
    fetchClients();
  }, []);

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
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-display text-sm font-semibold uppercase">{c.full_name || "—"}</TableCell>
                  <TableCell>{c.order_count}</TableCell>
                  <TableCell className="font-display font-bold text-primary">${c.total_spent.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No clients yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminClients;
