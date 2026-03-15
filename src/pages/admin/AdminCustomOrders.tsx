import { useEffect, useMemo, useState } from "react";
import { Eye, Box, ArrowRight, Calculator, Palette, Layers3, Ruler, Hash, Download } from "lucide-react";
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

interface ParsedCustomOrder extends CustomOrder {
  customer_description: string;
  material: string;
  color: string;
  quality: string;
  quantity: string;
  scale: string;
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

function parseCustomOrder(order: CustomOrder): ParsedCustomOrder {
  const raw = order.description || "";
  const marker = "\n--- Options ---";
  const parts = raw.split(marker);

  const customer_description = (parts[0] || "").trim();
  const optionsText = (parts[1] || "").trim();

  const parsed: Record<string, string> = {
    material: "",
    color: "",
    quality: "",
    quantity: "",
    scale: "",
  };

  optionsText.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) return;

    const normalizedKey = key.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (normalizedKey === "material") parsed.material = value;
    if (normalizedKey === "color") parsed.color = value;
    if (normalizedKey === "quality") parsed.quality = value;
    if (normalizedKey === "quantity") parsed.quantity = value;
    if (normalizedKey === "scale") parsed.scale = value;
  });

  return {
    ...order,
    customer_description,
    material: parsed.material || "-",
    color: parsed.color || "-",
    quality: parsed.quality || "-",
    quantity: parsed.quantity || "-",
    scale: parsed.scale || "-",
  };
}

const AdminCustomOrders = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ParsedCustomOrder | null>(null);
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
    const { data, error } = await supabase.from("custom_orders").select("*").order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading custom orders", description: error.message, variant: "destructive" });
      return;
    }

    setOrders((data as CustomOrder[]) ?? []);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const parsedOrders = useMemo(() => orders.map(parseCustomOrder), [orders]);

  const openDetail = (order: ParsedCustomOrder) => {
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

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
      description: `Custom order from ${selectedOrder.name}: ${selectedOrder.customer_description}`,
    });

    setSaving(false);

    if (error) {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product created!", description: "The product has been created as a draft." });
      setConvertOpen(false);
      await supabase.from("custom_orders").update({ status: "completed" }).eq("id", selectedOrder.id);
      setDetailOpen(false);
      fetchOrders();
    }
  };

  const handleDownloadModel = () => {
    if (!selectedOrder?.model_url) return;

    const link = document.createElement("a");
    link.href = selectedOrder.model_url;
    link.download = selectedOrder.model_filename || "custom-model";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find((st) => st.value === status);
    return (
      <Badge variant="outline" className={`font-display text-xs uppercase ${s?.color ?? ""}`}>
        {s?.label ?? status}
      </Badge>
    );
  };

  const filtered = filterStatus === "all" ? parsedOrders : parsedOrders.filter((o) => o.status === filterStatus);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Custom Print Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review uploaded 3D print requests before quoting or converting them into products.
          </p>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
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
                <TableHead>Material</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Scale</TableHead>
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
                      <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                        {order.model_filename}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm">{order.material}</TableCell>
                  <TableCell className="text-sm">{order.color}</TableCell>
                  <TableCell className="text-sm">{order.quality}</TableCell>
                  <TableCell className="text-sm">{order.quantity}</TableCell>
                  <TableCell className="text-sm">{order.scale}</TableCell>
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
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No custom print requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Custom Print Request Details</DialogTitle>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers3 className="h-3.5 w-3.5" />
                      Material
                    </div>
                    <p className="text-sm font-medium text-foreground">{selectedOrder.material}</p>
                  </div>

                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Palette className="h-3.5 w-3.5" />
                      Color
                    </div>
                    <p className="text-sm font-medium text-foreground">{selectedOrder.color}</p>
                  </div>

                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Box className="h-3.5 w-3.5" />
                      Quality
                    </div>
                    <p className="text-sm font-medium text-foreground">{selectedOrder.quality}</p>
                  </div>

                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      Quantity
                    </div>
                    <p className="text-sm font-medium text-foreground">{selectedOrder.quantity}</p>
                  </div>

                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Ruler className="h-3.5 w-3.5" />
                      Scale
                    </div>
                    <p className="text-sm font-medium text-foreground">{selectedOrder.scale}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Customer Description</Label>
                  <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm text-foreground">
                    {selectedOrder.customer_description || "-"}
                  </pre>
                </div>

                <div className="space-y-4 rounded-md border border-border bg-muted/50 p-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
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
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 font-display uppercase tracking-wider"
                    >
                      {saving ? "Saving..." : "Update Request"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleDownloadModel}
                      className="font-display uppercase tracking-wider"
                    >
                      <Download className="mr-1 h-4 w-4" /> Download File
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

              <TabsContent value="model" className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">File: {selectedOrder.model_filename}</p>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadModel}
                    className="font-display uppercase tracking-wider"
                  >
                    <Download className="mr-1 h-4 w-4" /> Download File
                  </Button>
                </div>

                <ModelViewer
                  url={selectedOrder.model_url}
                  fileName={selectedOrder.model_filename}
                  className="aspect-video"
                />
              </TabsContent>

              <TabsContent value="pricing">
                <PricingCalculator customOrderId={selectedOrder.id} onPriceCalculated={setCalculatedPrice} compact />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Convert to Product</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                value={convertForm.name}
                onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Slug</Label>
              <Input
                value={convertForm.slug}
                onChange={(e) => setConvertForm({ ...convertForm, slug: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (DKK)</Label>
                <Input
                  type="number"
                  step="1"
                  value={convertForm.price}
                  onChange={(e) =>
                    setConvertForm({
                      ...convertForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  value={convertForm.stock}
                  onChange={(e) =>
                    setConvertForm({
                      ...convertForm,
                      stock: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              The 3D model will be linked automatically. The product will be created as a draft.
            </p>

            <Button
              onClick={handleConvertToProduct}
              disabled={saving}
              className="w-full font-display uppercase tracking-wider"
            >
              {saving ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomOrders;
