import { useState } from "react";
import { Link } from "react-router-dom";
import { Truck, Eye, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useReorder } from "@/hooks/use-reorder";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ToolReviewForm from "@/components/reviews/ToolReviewForm";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { formatPrice } from "@/lib/currency";
import type { AccountModuleProps, Order, SeenState } from "./types";
import { statusColors, isAfter } from "./types";

interface Props extends AccountModuleProps {
  orders: Order[];
  seenState: SeenState;
}

interface OrderItemRow {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const OrdersModule = ({ user, tt, orders, seenState, refetchOverview }: Props) => {
  const { reorder, reorderingId } = useReorder();
  const { toast } = useToast();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItemRow[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoice(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data?.invoice_url) {
        window.open(data.invoice_url, "_blank");
      } else {
        toast({ title: "Invoice not available", description: "Could not generate invoice.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to download invoice.", variant: "destructive" });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const toggleExpand = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (!orderItems[orderId]) {
      setLoadingItems(orderId);
      const { data } = await supabase
        .from("order_items")
        .select("id, product_name, quantity, unit_price, total_price")
        .eq("order_id", orderId);
      setOrderItems(prev => ({ ...prev, [orderId]: (data ?? []) as OrderItemRow[] }));
      setLoadingItems(null);
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {tt("account.orders.empty", "No orders yet.")}{" "}
          <Link to="/products" className="text-primary hover:underline">{tt("account.orders.startShopping", "Start shopping!")}</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const isNewOrder = isAfter(order.created_at, seenState.ordersLastSeenAt);
        const isExpanded = expandedOrderId === order.id;
        const items = orderItems[order.id] ?? [];

        return (
          <Card key={order.id} className="glass-card transition-all hover:border-primary/30 hover:shadow-lg">
            <CardContent className="p-4">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => toggleExpand(order.id)} className="flex flex-1 items-center justify-between text-left min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                          {tt("account.orders.order", "Order")} #{order.id.slice(0, 8)}
                        </p>
                        {isNewOrder && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-primary">{formatPrice(Number(order.total))}</p>
                      <p className={`text-xs font-semibold uppercase ${statusColors[order.status] || "text-muted-foreground"}`}>
                        {order.status}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
              </div>

              {/* Always-visible order timeline */}
              <div className="mt-4">
                <OrderTimeline status={order.status} />
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                {order.tool_type && (
                  <Badge variant="outline" className="text-xs uppercase">
                    {order.tool_type === "lithophane" ? "Lithophane" : "Custom Print"}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadInvoice(order.id)}
                  disabled={downloadingInvoice === order.id}
                  className="font-display text-xs uppercase tracking-wider"
                >
                  <FileText className="mr-1 h-3 w-3" />
                  {downloadingInvoice === order.id ? "..." : tt("account.orders.invoice", "Invoice")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewingOrderId(reviewingOrderId === order.id ? null : order.id)}
                  className="font-display text-xs uppercase tracking-wider"
                >
                  <Eye className="mr-1 h-3 w-3" /> {tt("account.orders.review", "Review")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reorderingId === order.id}
                  onClick={() => reorder(order.id)}
                  className="font-display text-xs uppercase tracking-wider"
                >
                  <Truck className="mr-1 h-3 w-3" />
                  {reorderingId === order.id ? tt("common.loading", "Loading...") : tt("account.orders.reorder", "Reorder")}
                </Button>
              </div>

              {/* Expandable detail: items list */}
              {isExpanded && (
                <div className="mt-4 border-t border-border/30 pt-4">
                  {loadingItems === order.id ? (
                    <p className="text-xs text-muted-foreground animate-pulse">{tt("common.loading", "Loading...")}</p>
                  ) : items.length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-display text-xs font-semibold uppercase text-muted-foreground">{tt("account.orders.items", "Items")}</p>
                      <div className="rounded-lg border border-border/20 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/20 bg-muted/30">
                              <th className="px-3 py-2 text-left font-display uppercase text-muted-foreground">{tt("account.orders.product", "Product")}</th>
                              <th className="px-3 py-2 text-center font-display uppercase text-muted-foreground">{tt("account.orders.qty", "Qty")}</th>
                              <th className="px-3 py-2 text-right font-display uppercase text-muted-foreground">{tt("account.orders.price", "Price")}</th>
                              <th className="px-3 py-2 text-right font-display uppercase text-muted-foreground">{tt("account.orders.total", "Total")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.id} className="border-b border-border/10 last:border-0">
                                <td className="px-3 py-2 text-foreground">{item.product_name}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                                <td className="px-3 py-2 text-right text-muted-foreground">{formatPrice(Number(item.unit_price))}</td>
                                <td className="px-3 py-2 text-right font-medium text-foreground">{formatPrice(Number(item.total_price))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{tt("account.orders.noItems", "No item details available.")}</p>
                  )}
                </div>
              )}

              {/* Review form */}
              {reviewingOrderId === order.id && (
                <div className="mt-4 border-t border-border pt-4">
                  <ToolReviewForm orderId={order.id} toolType={order.tool_type || undefined} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OrdersModule;
