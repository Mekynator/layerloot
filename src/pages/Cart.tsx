import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Clock3,
  Package,
  Bookmark,
  ArrowRight,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FREE_SHIPPING_THRESHOLD = 500;
const BASE_SHIPPING_PRICE = 5.99;

type DiscountCode = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
};

type RecommendedProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  href: string;
};

type UserVoucherRow = {
  id: string;
  code: string;
  balance: number | null;
  is_used: boolean;
  vouchers: {
    name: string;
    discount_type: string;
    discount_value: number;
  } | null;
};

type LoyaltyPointRow = {
  points: number;
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, addItem } = useCart();
  const { toast } = useToast();

  type CartItemExt = (typeof items)[number] & {
    material?: string;
    color?: string;
    size?: string;
    printTime?: string;
    materialGrams?: number;
    dispatchEstimate?: string;
    badge?: string;
    savedForLater?: boolean;
    recommendations?: RecommendedProduct[];
  };

  const cartItems = items as CartItemExt[];

  const [savedItems, setSavedItems] = useState<CartItemExt[]>([]);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState<string>("");
  const [manualDiscountCode, setManualDiscountCode] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [availableDiscountCodes, setAvailableDiscountCodes] = useState<DiscountCode[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("layerloot_saved_items");
    if (raw) {
      try {
        setSavedItems(JSON.parse(raw));
      } catch {
        setSavedItems([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("layerloot_saved_items", JSON.stringify(savedItems));
  }, [savedItems]);

  useEffect(() => {
    const loadAccountDiscounts = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        setAvailableDiscountCodes([]);
        setPointsBalance(0);
        return;
      }

      const [loyaltyRes, vouchersRes] = await Promise.all([
        supabase.from("loyalty_points").select("points").eq("user_id", userId),
        supabase
          .from("user_vouchers")
          .select("id, code, balance, is_used, vouchers(name, discount_type, discount_value)")
          .eq("user_id", userId)
          .eq("is_used", false)
          .order("redeemed_at", { ascending: false }),
      ]);

      const balance = ((loyaltyRes.data as LoyaltyPointRow[]) ?? []).reduce(
        (sum, row) => sum + Number(row.points ?? 0),
        0,
      );
      setPointsBalance(balance);

      const mappedCodes: DiscountCode[] = ((vouchersRes.data as UserVoucherRow[]) ?? [])
        .filter((row) => {
          if (row.vouchers?.discount_type === "gift_card") {
            return Number(row.balance ?? 0) > 0;
          }
          return true;
        })
        .map((row) => {
          const voucher = row.vouchers;
          const labelValue =
            voucher?.discount_type === "free_shipping"
              ? "Free delivery"
              : voucher?.discount_type === "gift_card"
                ? `${Number(row.balance ?? voucher?.discount_value ?? 0).toFixed(2)} kr gift card`
                : `${Number(voucher?.discount_value ?? 0).toFixed(2)} kr off`;

          return {
            code: row.code,
            label: `${row.code} - ${labelValue}`,
            type: voucher?.discount_type === "percent_discount" ? "percent" : "fixed",
            value:
              voucher?.discount_type === "gift_card"
                ? Number(row.balance ?? voucher?.discount_value ?? 0)
                : voucher?.discount_type === "free_shipping"
                  ? BASE_SHIPPING_PRICE
                  : Number(voucher?.discount_value ?? 0),
          };
        });

      setAvailableDiscountCodes(mappedCodes);
    };

    loadAccountDiscounts();
  }, []);

  const selectedDiscount = useMemo(() => {
    return availableDiscountCodes.find((d) => d.code === selectedDiscountCode) ?? null;
  }, [selectedDiscountCode, availableDiscountCodes]);

  const shippingProgress = Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - totalPrice, 0);

  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD || totalPrice === 0 ? 0 : BASE_SHIPPING_PRICE;
  const pointsToEarn = Math.floor(totalPrice / 4);

  const discountAmount = useMemo(() => {
    if (!selectedDiscount) return 0;

    if (selectedDiscount.type === "percent") {
      return Number(((totalPrice * selectedDiscount.value) / 100).toFixed(2));
    }

    return Math.min(selectedDiscount.value, totalPrice + shippingCost);
  }, [selectedDiscount, totalPrice, shippingCost]);

  const finalTotal = Math.max(totalPrice + shippingCost - discountAmount, 0);

  const recommendedProducts = useMemo(() => {
    const map = new Map<string, RecommendedProduct>();

    cartItems.forEach((item) => {
      item.recommendations?.forEach((rec) => {
        if (!cartItems.some((cartItem) => String(cartItem.id) === String(rec.id))) {
          map.set(rec.id, rec);
        }
      });
    });

    return Array.from(map.values()).slice(0, 4);
  }, [cartItems]);

  const handleSaveForLater = (item: CartItemExt) => {
    setSavedItems((prev) => {
      const exists = prev.some((saved) => saved.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
    removeItem(item.id);
  };

  const handleMoveToCart = (item: CartItemExt) => {
    if (typeof addItem === "function") {
      addItem(item);
      setSavedItems((prev) => prev.filter((saved) => saved.id !== item.id));
    }
  };

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            id: item.id,
            product_id: item.id,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
            material: item.material || null,
            color: item.color || null,
            size: item.size || null,
          })),
          discountCode: selectedDiscountCode || manualDiscountCode || null,
          shippingCost,
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: `${window.location.origin}/cart`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create Stripe checkout session.");
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No Stripe checkout URL returned.");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout error",
        description: error?.message || "Unable to start Stripe checkout.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="py-10 md:py-14">
        <div className="container max-w-6xl">
          <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>

            <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground md:text-4xl">
              Your Cart Is Empty
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              Looks like the cart is taking a nap. Add some prints and wake the beast.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/products">
                <Button size="lg" className="font-display uppercase tracking-wider">
                  Browse Products
                </Button>
              </Link>
              <Link to="/create">
                <Button size="lg" variant="outline" className="font-display uppercase tracking-wider">
                  Create Your Own
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-10">
      <div className="container max-w-6xl">
        <h1 className="mb-8 font-display text-4xl font-bold uppercase text-foreground">Shopping Cart</h1>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-card-foreground">
                  {remainingForFreeShipping > 0
                    ? `Add ${remainingForFreeShipping.toFixed(2)} kr more for free shipping`
                    : "🎉 You qualify for free shipping!"}
                </span>
              </div>
              <Progress value={shippingProgress} className="h-2" />
            </div>

            <div className="space-y-4">
              {cartItems.map((item) => {
                const lineTotal = item.price * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-bold uppercase text-card-foreground md:text-lg">
                              {item.name}
                            </h3>
                            {item.badge && (
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                {item.badge}
                              </span>
                            )}
                          </div>

                          {(item.material || item.color || item.size) && (
                            <p className="text-sm text-muted-foreground">
                              {[item.material, item.color, item.size].filter(Boolean).join(" • ")}
                            </p>
                          )}

                          {(item.printTime || item.materialGrams || item.dispatchEstimate) && (
                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                              {item.printTime && (
                                <div className="flex items-center gap-2">
                                  <Clock3 className="h-4 w-4 text-primary" />
                                  <span>Print: {item.printTime}</span>
                                </div>
                              )}

                              {item.materialGrams && (
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span>Material: {item.materialGrams}g</span>
                                </div>
                              )}

                              {item.dispatchEstimate && (
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-primary" />
                                  <span>{item.dispatchEstimate}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => handleSaveForLater(item)}
                              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <Bookmark className="h-4 w-4" />
                              Save for later
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 md:ml-auto md:min-w-[250px]">
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>

                          <span className="w-8 text-center font-display text-sm font-semibold">{item.quantity}</span>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} kr each</p>
                          <p className="font-display text-lg font-bold text-foreground">{lineTotal.toFixed(2)} kr</p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {savedItems.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-4 font-display text-xl font-bold uppercase text-foreground">Saved for Later</h2>

                <div className="space-y-3">
                  {savedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
                        <div>
                          <p className="font-display text-sm font-bold uppercase text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} kr</p>
                        </div>
                      </div>

                      <Button variant="outline" onClick={() => handleMoveToCart(item)}>
                        Move to Cart
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendedProducts.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-4 font-display text-xl font-bold uppercase text-foreground">You May Also Like</h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {recommendedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={product.href}
                      className="group rounded-xl border border-border bg-background/50 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-muted">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <p className="font-display text-sm font-bold uppercase text-foreground">{product.name}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">{product.price.toFixed(2)} kr</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="mb-5 font-display text-2xl font-bold uppercase text-foreground">Order Summary</h2>

              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Loyalty rewards</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current balance: <span className="font-semibold text-foreground">{pointsBalance}</span> points
                </p>
                <p className="text-sm text-muted-foreground">
                  This order will earn about <span className="font-semibold text-primary">{pointsToEarn}</span> points
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-display font-bold text-foreground">{totalPrice.toFixed(2)} kr</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-display font-bold text-foreground">
                    {shippingCost === 0 ? "Free" : `${shippingCost.toFixed(2)} kr`}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-background/50 p-3">
                  <label className="mb-2 block text-sm font-medium text-foreground">Discount</label>

                  {availableDiscountCodes.length > 0 ? (
                    <select
                      value={selectedDiscountCode}
                      onChange={(e) => {
                        setSelectedDiscountCode(e.target.value);
                        setManualDiscountCode("");
                      }}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Choose a saved voucher</option>
                      {availableDiscountCodes.map((discount) => (
                        <option key={discount.code} value={discount.code}>
                          {discount.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={manualDiscountCode}
                      onChange={(e) => setManualDiscountCode(e.target.value)}
                      placeholder="Enter discount code"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                    />
                  )}

                  {selectedDiscount && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Applied</span>
                      <span className="font-semibold text-primary">-{discountAmount.toFixed(2)} kr</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  {discountAmount > 0 && (
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-display font-bold text-primary">-{discountAmount.toFixed(2)} kr</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-bold uppercase text-foreground">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">{finalTotal.toFixed(2)} kr</span>
                  </div>
                </div>

                <Button
                  className="mt-2 w-full font-display uppercase tracking-wider"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? "Redirecting..." : "Continue to Secure Checkout"}
                </Button>

                <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>Fast production turnaround</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span>Carefully packed before shipping</span>
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
            >
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
