import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!sessionId || !user) return;

      const { data } = await (supabase.from("orders") as any)
        .select("id")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();

      if (data?.id) {
        setOrderId(data.id);
      }
    };

    fetchOrder();
  }, [sessionId, user]);

  return (
    <div className="py-12 md:py-16">
      <div className="container max-w-3xl">
        <Card className="overflow-hidden border-primary/20 shadow-sm">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h1 className="font-display text-3xl font-bold uppercase text-foreground md:text-4xl">
              Payment received
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Your checkout completed successfully. We are preparing your order and your cart has been cleared.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {orderId ? (
                <Link to={`/orders/${orderId}`}>
                  <Button className="font-display uppercase tracking-wider">
                    <Package className="mr-2 h-4 w-4" />
                    Track order
                  </Button>
                </Link>
              ) : (
                <Link to="/account">
                  <Button className="font-display uppercase tracking-wider">
                    <Package className="mr-2 h-4 w-4" />
                    View account
                  </Button>
                </Link>
              )}
              <Link to="/products">
                <Button variant="outline" className="font-display uppercase tracking-wider">
                  Continue shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
