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
    <div className="py-8 md:py-12">
      <div className="container max-w-3xl">
        <Link to="/account" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> {t("orderTracking.backToAccount")}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h1 className="font-display text-3xl font-bold uppercase text-foreground">
                {t("orderTracking.orderNumber", "Order #{{id}}", { id: order.id.slice(0, 8) })}
              </h1>
              <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <Badge className={`rounded-full px-4 py-1.5 font-display text-sm uppercase ${statusColors[order.status]}`}>
              <StatusIcon className="mr-1.5 h-4 w-4" /> {statusLabel(order.status)}
            </Badge>
          </div>

          {/* Progress Timeline */}
          {order.status !== "cancelled" && (
            <div className="glass-card overflow-hidden p-6">
              <div className="flex items-center justify-between">
                {allStatuses.map((s, i) => {
                  const Icon = statusIcons[s] || Clock;
                  const reached = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={s} className="flex flex-1 items-center">
                      <motion.div
                        className="flex flex-col items-center"
                        initial={false}
                        animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.6, repeat: isCurrent ? Infinity : 0, repeatDelay: 2 }}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                          reached
                            ? "border-primary bg-primary/15 shadow-[0_0_16px_hsl(var(--primary)/0.3)]"
                            : "border-border bg-muted/30"
                        }`}>
                          <Icon className={`h-5 w-5 transition-colors ${reached ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`mt-2 font-display text-[11px] uppercase tracking-wider ${
                          reached ? "text-primary font-semibold" : "text-muted-foreground"
                        }`}>
                          {statusLabel(s)}
                        </span>
                      </motion.div>
                      {i < allStatuses.length - 1 && (
                        <div className="relative mx-2 h-1 flex-1 overflow-hidden rounded-full bg-border/40">
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: i < currentIdx ? "100%" : "0%" }}
                            transition={{ duration: 0.8, delay: i * 0.15 }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tracking Number */}
          {order.tracking_number && (
            <div className="glass-card flex items-center justify-between border-primary/20 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{t("orderTracking.trackingNumber", "Tracking Number")}</p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">{order.tracking_number}</p>
              </div>
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="font-display uppercase tracking-wider glow-primary">
                    <Truck className="mr-1.5 h-4 w-4" />
                    {t("orderTracking.trackPackage", "Track Package")}
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Items */}
          <div className="glass-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold uppercase text-foreground">{t("orderTracking.items", "Items")}</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/20"
                >
                  <div>
                    <p className="font-display text-sm font-semibold uppercase text-card-foreground">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("orderTracking.qty", "Qty")}: {item.quantity} × {formatPrice(Number(item.unit_price))}
                    </p>
                  </div>
                  <span className="font-display text-base font-bold text-primary">{formatPrice(Number(item.total_price))}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t border-border/40 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span className="text-foreground">{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span className="text-foreground">{formatPrice(Number(order.shipping_cost))}</span>
              </div>
              <div className="flex justify-between pt-2 font-display text-xl font-bold">
                <span className="text-foreground">{t("cart.total")}</span>
                <span className="text-primary">{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          {history.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="mb-5 font-display text-lg font-bold uppercase text-foreground">{t("orderTracking.statusHistory", "Status History")}</h2>
              <div className="space-y-0">
                {history.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
                      {i < history.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/40 to-border/30" />}
                    </div>
                    <div className="pb-5">
                      <p className="font-display text-sm font-semibold uppercase text-card-foreground">{statusLabel(h.status)}</p>
                      {h.note && <p className="mt-0.5 text-sm text-muted-foreground">{h.note}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTracking;
