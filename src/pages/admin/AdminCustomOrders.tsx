import { useEffect, useState } from "react";
import { Eye, FileText, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ModelViewer from "@/components/ModelViewer";

interface CustomOrder {
  id: string;
  name: string;
  email: string;
  description: string;
  model_url: string;
  model_filename: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  { value: "reviewing", label: "Reviewing", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "quoted", label: "Quoted", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "accepted", label: "Accepted", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  { value: "in_production", label: "In Production", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/30" },
];

const AdminCustomOrders = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("custom_orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders((data as CustomOrder[]) ?? []);
  };

  useEffect(() => { fetchOrders(); }, []);

  const openDetail = (order: CustomOrder) => {
    setSelectedOrder(order);
    setAdminNotes(order.admin_notes ?? "");
    setStatusUpdate(order.status);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    const { error } = await supabase
      .from("custom_orders")
      .update({ status: statusUpdate, admin_notes: adminNotes || null })
      .eq("id", selectedOrder.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order updated" });
      setDetailOpen(false);
      fetchOrders();
    }
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find((st) => st.value === status);
    return (
      <Badge variant="outline" className={`font-display text-xs uppercase ${s?.color ?? ""}`}>
        {s?.label ?? status}
      </Badge>
    );
  };

  const filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Custom Orders</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="font-display text-sm font-semibold uppercase">{order.name}</p>
                    <p className="text-xs text-muted-foreground">{order.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Box className="h-4 w-4 text-primary" />
                      <span className="max-w-[150px] truncate text-xs text-muted-foreground">{order.model_filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No custom orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Custom Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <p className="font-medium text-foreground">{selectedOrder.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium text-foreground">{selectedOrder.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted</Label>
                  <p className="text-sm text-foreground">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">File</Label>
                  <p className="text-sm text-foreground">{selectedOrder.model_filename}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-muted-foreground">Customer Description</Label>
                <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm text-foreground">
                  {selectedOrder.description}
                </pre>
              </div>

              {/* 3D Preview */}
              <div>
                <Label className="text-xs text-muted-foreground">3D Model Preview</Label>
                <div className="mt-1">
                  <ModelViewer url={selectedOrder.model_url} className="aspect-video" />
                </div>
              </div>

              {/* Status & Notes */}
              <div className="space-y-4 rounded-md border border-border bg-muted/50 p-4">
                <div>
                  <Label>Status</Label>
                  <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes, pricing details, production notes..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full font-display uppercase tracking-wider">
                  {saving ? "Saving..." : "Update Order"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomOrders;
