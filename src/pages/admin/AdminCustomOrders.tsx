import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Box, Search, LampDesk, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface CustomOrder {
  id: string;
  name: string;
  email: string;
  description: string;
  model_filename: string;
  status: string;
  created_at: string;
  quoted_price: number | null;
  customer_offer_price: number | null;
  final_agreed_price: number | null;
  payment_status: string;
  production_status: string;
  request_fee_status?: string;
  metadata?: Record<string, any> | null;
}

type ViewGroup = "in-production" | "done";
type ProductionTypeFilter = "all" | "lithophane" | "custom-print";

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  { value: "reviewing", label: "Reviewing", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "quoted", label: "Quoted", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "accepted", label: "Accepted", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  { value: "in_production", label: "In Production", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/30" },
];

function detectOrderType(order: CustomOrder): "lithophane" | "custom-print" {
  const metadataType = (order.metadata as any)?.order_type;
  if (metadataType === "lithophane") return "lithophane";
  if (metadataType === "custom-print") return "custom-print";
  const raw = (order.description || "").toLowerCase();
  if (raw.includes("lithophane")) return "lithophane";
  return "custom-print";
}

const AdminCustomOrders = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [viewGroup, setViewGroup] = useState<ViewGroup>("in-production");
  const [productionTypeFilter, setProductionTypeFilter] = useState<ProductionTypeFilter>("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("custom_orders")
      .select("id, name, email, description, model_filename, status, created_at, quoted_price, customer_offer_price, final_agreed_price, payment_status, production_status, request_fee_status, metadata, unread_by_admin")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as CustomOrder[]) ?? []));
  }, []);

  const enriched = useMemo(() => orders.map((o) => ({ ...o, order_type: detectOrderType(o) })), [orders]);

  const counts = useMemo(() => {
    const active = enriched.filter((o) => o.status !== "completed" && o.status !== "rejected");
    return {
      all: active.length,
      lithophane: active.filter((o) => o.order_type === "lithophane").length,
      customPrint: active.filter((o) => o.order_type === "custom-print").length,
    };
  }, [enriched]);

  let filtered = enriched.filter((o) =>
    viewGroup === "done"
      ? o.status === "completed" || o.status === "rejected"
      : o.status !== "completed" && o.status !== "rejected",
  );

  if (viewGroup === "in-production" && productionTypeFilter !== "all") {
    filtered = filtered.filter((o) => o.order_type === productionTypeFilter);
  }

  if (filterStatus !== "all") filtered = filtered.filter((o) => o.status === filterStatus);

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  }

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find((st) => st.value === status);
    return (
      <Badge variant="outline" className={`font-display text-xs uppercase ${s?.color ?? ""}`}>
        {s?.label ?? status}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase text-foreground">Custom Orders</h1>
            <p className="text-sm text-muted-foreground">
              Manage custom 3D print requests, quoting, and production.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
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
        </div>

        <Tabs
          value={viewGroup}
          onValueChange={(v) => {
            setViewGroup(v as ViewGroup);
            if (v === "done") setProductionTypeFilter("all");
          }}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="in-production" className="font-display uppercase tracking-wider">
              In Production
            </TabsTrigger>
            <TabsTrigger value="done" className="font-display uppercase tracking-wider">
              Done
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewGroup === "in-production" && (
          <Tabs value={productionTypeFilter} onValueChange={(v) => setProductionTypeFilter(v as ProductionTypeFilter)}>
            <TabsList className="grid h-auto w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
              <TabsTrigger value="all" className="font-display uppercase tracking-wider">
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="lithophane" className="font-display uppercase tracking-wider">
                Lithophane ({counts.lithophane})
              </TabsTrigger>
              <TabsTrigger value="custom-print" className="font-display uppercase tracking-wider">
                Custom 3D ({counts.customPrint})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/custom-orders/${order.id}`)}
                >
                  <TableCell>
                    <p className="font-display text-sm font-semibold uppercase">{order.name}</p>
                    <p className="text-xs text-muted-foreground">{order.email}</p>
                  </TableCell>
                  <TableCell>
                    {order.order_type === "lithophane" ? (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                        <LampDesk className="mr-1 h-3.5 w-3.5" />Lithophane
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700">
                        <Package className="mr-1 h-3.5 w-3.5" />Custom 3D
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Box className="h-4 w-4 text-primary" />
                      <span className="max-w-[120px] truncate text-xs text-muted-foreground">{order.model_filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.order_type === "lithophane" ? (
                      <Badge variant="outline" className="text-xs border-muted-foreground/30">No fee</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-xs uppercase ${
                          order.request_fee_status === "paid"
                            ? "border-green-500/30 bg-green-500/10 text-green-600"
                            : "border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                        }`}
                      >
                        {order.request_fee_status === "paid" ? "Paid" : "Unpaid"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                        order.payment_status === "paid"
                          ? "border-green-500/30 text-green-600"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {order.payment_status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/custom-orders/${order.id}`); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No custom orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCustomOrders;
