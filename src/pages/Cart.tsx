import { useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCartAccountData } from "@/hooks/use-cart-account-data";
import { CartSummarySkeleton } from "@/components/shared/loading-states";
import { formatPrice } from "@/lib/currency";

const FREE_SHIPPING_THRESHOLD = 500;
const BASE_SHIPPING_PRICE = 5.99;

type RecommendedProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  href: string;
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("common");
  const { data: accountData, isLoading: accountLoading } = useCartAccountData(user?.id, user?.email);

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
  const [recentlyChanged, setRecentlyChanged] = useState<Record<string, "inc" | "dec" | "added">>({});
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [savedToast, setSavedToast] = useState<string>("");

  const checkoutButtonRef = useRef<HTMLButtonElement | null>(null);

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
    if (!savedToast) return;
    const timer = window.setTimeout(() => setSavedToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [savedToast]);

  const selectedDiscount = useMemo(() => {
    return (accountData?.availableDiscountCodes ?? []).find((d) => d.code === selectedDiscountCode) ?? null;
  }, [selectedDiscountCode, accountData?.availableDiscountCodes]);

  const availableDiscountCodes = accountData?.availableDiscountCodes ?? [];
  const pointsBalance = accountData?.pointsBalance ?? 0;

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

  const markItemChanged = (id: string, type: "inc" | "dec" | "added") => {
    setRecentlyChanged((prev) => ({ ...prev, [id]: type }));
    window.setTimeout(() => {
      setRecentlyChanged((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 700);
  };

  const handleSaveForLater = (item: CartItemExt) => {
    setSavedItems((prev) => {
      const exists = prev.some((saved) => saved.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
    setSavedToast(t("cart.savedToast", { name: item.name }));
    removeItem(item.id);
  };

  const handleMoveToCart = (item: CartItemExt) => {
    if (typeof addItem === "function") {
      addItem(item);
      markItemChanged(item.id, "added");
      setSavedItems((prev) => prev.filter((saved) => saved.id !== item.id));
    }
  };

  const handleRemove = (id: string) => {
    setRemovingIds((prev) => [...prev, id]);
    window.setTimeout(() => {
      removeItem(id);
      setRemovingIds((prev) => prev.filter((itemId) => itemId !== id));
    }, 220);
  };

  const handleCheckout = async () => {
    try {
      if (!user && (selectedDiscountCode || manualDiscountCode.trim())) {
        toast({
          title: t("cart.signInRequired"),
          description: t("cart.signInForVoucher"),
          variant: "destructive",
        });
        return;
      }

      setIsCheckingOut(true);

      if (checkoutButtonRef.current) {
        checkoutButtonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
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
        },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        throw new Error(error.message || "Failed to create Stripe checkout session.");
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No Stripe checkout URL returned.");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: t("cart.checkoutError"),
        description: error?.message || t("cart.checkoutErrorDesc"),
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm"
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>

            <h1 className="mb-2 font-display text-3xl font-bold uppercase text-foreground md:text-4xl">
              {t("cart.empty")}
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              {t("cart.emptyHint")}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/products">
                <Button size="lg" className="font-display uppercase tracking-wider">
                  {t("cart.browseProducts")}
                </Button>
              </Link>
              <Link to="/create">
                <Button size="lg" variant="outline" className="font-display uppercase tracking-wider">
                  {t("cart.createYourOwn")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-10">
      <div className="container max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-display text-4xl font-bold uppercase text-foreground">{t("cart.title")}</h1>

          <AnimatePresence>
            {savedToast && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="hidden rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-medium text-primary shadow-sm md:block"
              >
                {savedToast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <motion.div layout className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-card-foreground">
                {remainingForFreeShipping > 0
                    ? t("cart.freeShippingRemaining", { amount: formatPrice(remainingForFreeShipping) })
                    : t("cart.freeShippingQualified")}
                </span>
              </div>
              <Progress value={shippingProgress} className="h-2" />
            </motion.div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {cartItems.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  const changedState = recentlyChanged[item.id];
                  const isRemoving = removingIds.includes(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{
                        opacity: isRemoving ? 0 : 1,
                        y: 0,
                        scale: changedState ? [1, 1.015, 1] : 1,
                      }}
                      exit={{ opacity: 0, y: -10, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className={`rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
                        changedState === "added" ? "ring-1 ring-primary/30" : ""
                      }`}
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
                              {changedState === "added" && (
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                                  {t("cart.addedBack")}
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
                          <motion.div
                            animate={changedState ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-1"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => {
                                updateQuantity(item.id, Math.max(1, item.quantity - 1));
                                markItemChanged(item.id, "dec");
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>

                            <span className="w-8 text-center font-display text-sm font-semibold">{item.quantity}</span>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => {
                                updateQuantity(item.id, item.quantity + 1);
                                markItemChanged(item.id, "inc");
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </motion.div>

                          <motion.div
                            animate={changedState ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                            transition={{ duration: 0.35 }}
                            className="text-right"
                          >
                            <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} kr each</p>
                            <p className="font-display text-lg font-bold text-foreground">{lineTotal.toFixed(2)} kr</p>
                          </motion.div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(item.id)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {savedItems.length > 0 && (
              <motion.div layout className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="mb-4 font-display text-xl font-bold uppercase text-foreground">Saved for Later</h2>

                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {savedItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
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
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
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
            {accountLoading && user ? <CartSummarySkeleton /> : null}
            <motion.div layout className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
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
                    <motion.span
                      key={finalTotal}
                      initial={{ scale: 0.96, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="font-display text-2xl font-bold text-primary"
                    >
                      {finalTotal.toFixed(2)} kr
                    </motion.span>
                  </div>
                </div>

                <div className="relative">
                  <Button
                    ref={checkoutButtonRef}
                    className="mt-2 w-full font-display uppercase tracking-wider"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      "Continue to Secure Checkout"
                    )}
                  </Button>

                  <AnimatePresence>
                    {isCheckingOut && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Preparing secure Stripe checkout...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
            </motion.div>

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
