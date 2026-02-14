import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCart } from "@/contexts/CartContext";

const FREE_SHIPPING_THRESHOLD = 75;

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const shippingProgress = Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - totalPrice;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="mb-2 font-display text-2xl font-bold uppercase text-foreground">Your Cart is Empty</h1>
        <p className="mb-6 text-muted-foreground">Looks like you haven't added anything yet.</p>
        <Link to="/products">
          <Button className="font-display uppercase tracking-wider">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <h1 className="mb-8 font-display text-4xl font-bold uppercase text-foreground">Shopping Cart</h1>

        {/* Free Shipping Progress */}
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-card-foreground">
                {remaining > 0
                  ? `Add $${remaining.toFixed(2)} more for free shipping`
                  : "🎉 You qualify for free shipping!"}
              </span>
            </div>
          </div>
          <Progress value={shippingProgress} className="h-2" />
        </div>

        {/* Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <img src={item.image} alt={item.name} className="h-16 w-16 rounded bg-muted object-cover" />
              <div className="flex-1">
                <h3 className="font-display text-sm font-semibold uppercase text-card-foreground">{item.name}</h3>
                <p className="text-sm text-primary font-bold">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-display text-sm">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="w-20 text-right font-display font-bold text-foreground">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-display font-bold text-foreground">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-display font-bold text-foreground">{totalPrice >= FREE_SHIPPING_THRESHOLD ? "Free" : "$5.99"}</span>
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between">
            <span className="font-display text-lg font-bold uppercase text-foreground">Total</span>
            <span className="font-display text-xl font-bold text-primary">
              ${(totalPrice + (totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : 5.99)).toFixed(2)}
            </span>
          </div>
          <Button className="mt-4 w-full font-display uppercase tracking-wider" size="lg">
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
