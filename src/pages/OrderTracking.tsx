import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/lib/currency";

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_address: any;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface StatusEntry {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  completed: CheckCircle,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-500",
  processing: "text-blue-500",
  shipped: "text-purple-500",
  completed: "text-green-500",
  cancelled: "text-destructive",
};

const OrderTracking = () => {
  const { t } = useTranslation("common");
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<StatusEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user) return;
    const fetch = async () => {
      const [orderRes, itemsRes, historyRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      ]);
      setOrder(orderRes.data as OrderDetail | null);
      setItems((itemsRes.data as OrderItem[]) ?? []);
      setHistory((historyRes.data as StatusEntry[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [orderId, user]);

  if (loading) return <div className="flex items-center justify-center py-24 text-muted-foreground">{t("common.loading")}</div>;
  if (!order) return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="mb-4 font-display text-2xl font-bold uppercase text-foreground">{t("orderTracking.notFound", "Order Not Found")}</h1>
      <Link to="/account"><Button>{t("orderTracking.backToAccount", "Back to Account")}</Button></Link>
    </div>
  );

  const StatusIcon = statusIcons[order.status] || Clock;
  const allStatuses = ["pending", "processing", "shipped", "completed"];
  const currentIdx = allStatuses.indexOf(order.status);

  const statusLabel = (s: string) => t(`orderTracking.status.${s}`, s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <Link to="/account" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> {t("orderTracking.backToAccount")}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold uppercase text-foreground">
                {t("orderTracking.orderNumber", "Order #{{id}}", { id: order.id.slice(0, 8) })}
              </h1>
              <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <Badge className={`font-display uppercase ${statusColors[order.status]}`}>
              <StatusIcon className="mr-1 h-4 w-4" /> {statusLabel(order.status)}
            </Badge>
          </div>

          {order.status !== "cancelled" && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {allStatuses.map((s, i) => {
                    const Icon = statusIcons[s] || Clock;
                    const reached = i <= currentIdx;
                    return (
                      <div key={s} className="flex flex-1 items-center">
                        <div className={`flex flex-col items-center ${reached ? "text-primary" : "text-muted-foreground"}`}>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${reached ? "border-primary bg-primary/10" : "border-border"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="mt-1 font-display text-xs uppercase">{statusLabel(s)}</span>
                        </div>
                        {i < allStatuses.length - 1 && (
                          <div className={`mx-2 h-0.5 flex-1 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {order.tracking_number && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("orderTracking.trackingNumber", "Tracking Number")}</p>
                  <p className="font-mono font-bold text-foreground">{order.tracking_number}</p>
                </div>
                {order.tracking_url && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="font-display uppercase tracking-wider">
                      {t("orderTracking.trackPackage", "Track Package")}
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle className="font-display uppercase">{t("orderTracking.items", "Items")}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-display text-sm font-semibold uppercase text-card-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("orderTracking.qty", "Qty")}: {item.quantity} × {formatPrice(Number(item.unit_price))}
                      </p>
                    </div>
                    <span className="font-display font-bold text-primary">{formatPrice(Number(item.total_price))}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.shipping")}</span>
                  <span>{formatPrice(Number(order.shipping_cost))}</span>
                </div>
                <div className="flex justify-between font-display text-lg font-bold">
                  <span>{t("cart.total")}</span>
                  <span className="text-primary">{formatPrice(Number(order.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display uppercase">{t("orderTracking.statusHistory", "Status History")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        {i < history.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                      </div>
                      <div className="pb-4">
                        <p className="font-display text-sm font-semibold uppercase text-card-foreground">{statusLabel(h.status)}</p>
                        {h.note && <p className="text-sm text-muted-foreground">{h.note}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTracking;
