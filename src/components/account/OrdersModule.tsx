import { useState } from "react";
import { Link } from "react-router-dom";
import { Truck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReorder } from "@/hooks/use-reorder";
import { useToast } from "@/hooks/use-toast";
import ToolReviewForm from "@/components/reviews/ToolReviewForm";
import OrderTimeline from "@/components/orders/OrderTimeline";
import type { AccountModuleProps, Order, SeenState } from "./types";
import { statusColors, isAfter } from "./types";

interface Props extends AccountModuleProps {
  orders: Order[];
  seenState: SeenState;
}

const OrdersModule = ({ user, tt, orders, seenState, refetchOverview }: Props) => {
  const { reorder, reorderingId } = useReorder();
  const { toast } = useToast();
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);

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
        return (
          <Card key={order.id} className="glass-card transition-all hover:border-primary/30 hover:shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Link to={`/orders/${order.id}`} className="flex flex-1 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                          {tt("account.orders.order", "Order")} #{order.id.slice(0, 8)}
                        </p>
                        {isNewOrder && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-primary">{Number(order.total).toFixed(2)} kr</p>
                      <p className={`text-xs font-semibold uppercase ${statusColors[order.status] || "text-muted-foreground"}`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="ml-3 flex gap-2">
                  {order.tool_type && (
                    <Badge variant="outline" className="text-xs uppercase">
                      {order.tool_type === "lithophane" ? "Lithophane" : "Custom Print"}
                    </Badge>
                  )}
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
              </div>
              {reviewingOrderId === order.id && (
                <div className="mt-4 border-t border-border pt-4 space-y-4">
                  <OrderTimeline orderId={order.id} />
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
