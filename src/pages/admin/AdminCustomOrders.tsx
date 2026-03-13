import { useEffect, useState } from "react";
import { Eye, Box, ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import ModelViewer from "@/components/ModelViewer";
import PricingCalculator from "@/components/admin/PricingCalculator";

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
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ name: "", slug: "", price: 0, stock: 1 });
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
    setCalculatedPrice(null);
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

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleConvertToProduct = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      name: convertForm.name,
      slug: convertForm.slug || generateSlug(convertForm.name),
      price: convertForm.price,
      stock: convertForm.stock,
      model_url: selectedOrder.model_url,
      is_active: false,
      description: `Custom order from ${selectedOrder.name}: ${selectedOrder.description}`,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product created!", description: "The product has been created as a draft." });
      setConvertOpen(false);
      // Update custom order status
      await supabase.from("custom_orders").update({ status: "completed" }).eq("id", selectedOrder.id);
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Custom Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="model">3D Model</TabsTrigger>
                <TabsTrigger value="pricing">
                  <Calculator className="mr-1 h-3.5 w-3.5" /> Pricing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
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

                <div>
                  <Label className="text-xs text-muted-foreground">Customer Description</Label>
                  <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm text-foreground">
                    {selectedOrder.description}
                  </pre>
                </div>

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
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving} className="flex-1 font-display uppercase tracking-wider">
                      {saving ? "Saving..." : "Update Order"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setConvertForm({
                          name: `Custom - ${selectedOrder.name}`,
                          slug: generateSlug(`custom-${selectedOrder.name}-${Date.now()}`),
                          price: calculatedPrice || 0,
                          stock: 1,
                        });
                        setConvertOpen(true);
                      }}
                      className="font-display uppercase tracking-wider"
                    >
                      <ArrowRight className="mr-1 h-4 w-4" /> Convert to Product
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="model">
                <ModelViewer url={selectedOrder.model_url} className="aspect-video" />
                <p className="mt-2 text-xs text-muted-foreground">File: {selectedOrder.model_filename}</p>
              </TabsContent>

              <TabsContent value="pricing">
                <PricingCalculator
                  customOrderId={selectedOrder.id}
                  onPriceCalculated={setCalculatedPrice}
                  compact
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Product Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Convert to Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input value={convertForm.name} onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={convertForm.slug} onChange={(e) => setConvertForm({ ...convertForm, slug: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (kr)</Label>
                <Input type="number" step="1" value={convertForm.price}
                  onChange={(e) => setConvertForm({ ...convertForm, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Initial Stock</Label>
                <Input type="number" value={convertForm.stock}
                  onChange={(e) => setConvertForm({ ...convertForm, stock: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The 3D model will be linked automatically. The product will be created as a draft.
            </p>
            <Button onClick={handleConvertToProduct} disabled={saving} className="w-full font-display uppercase tracking-wider">
              {saving ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomOrders;
