import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CartItemCard from "@/components/cart/CartItemCard";
import CartSummary from "@/components/cart/CartSummary";
import RecommendedProducts, { type RecommendedProductCard } from "@/components/cart/RecommendedProducts";
import SavedForLater from "@/components/cart/SavedForLater";
import ShippingNotice from "@/components/cart/ShippingNotice";
import { Button } from "@/components/ui/button";
import { useCartPricing } from "@/hooks/useCartPricing";
import type { CartItem, SavedItem, UserDiscountCode } from "@/types/cart";

const DEMO_CART: CartItem[] = [
  {
    id: "1",
    product_id: "sample-model-1",
    title: "Sample Model",
    slug: "sample-model",
    image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
    price: 1500,
    quantity: 1,
    variant_label: "Collector edition",
    material: "PLA+",
    color: "Black / Red",
    print_time_hours: 12,
    material_grams: 180,
    dispatch_note: "2-4 business days",
  },
];

const DEMO_SAVED: SavedItem[] = [
  {
    id: "2",
    product_id: "base-1",
    title: "Display Base",
    slug: "display-base",
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    price: 149,
    quantity: 1,
    variant_label: "Hex stand",
    material: "PLA",
    color: "Matte Black",
  },
];

const DEMO_CODES: UserDiscountCode[] = [
  {
    id: "d1",
    user_id: "sample",
    code: "WELCOME10",
    title: "WELCOME10",
    discount_type: "percent",
    discount_value: 10,
    is_used: false,
  },
  {
    id: "d2",
    user_id: "sample",
    code: "SAVE50",
    title: "SAVE50",
    discount_type: "fixed",
    discount_value: 50,
    is_used: false,
  },
];

const DEMO_RECOMMENDED: RecommendedProductCard[] = [
  {
    id: "r1",
    title: "LED Display Base",
    slug: "led-display-base",
    image_url: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=600&auto=format&fit=crop",
    price: 229,
    reason: "Sample Model",
  },
  {
    id: "r2",
    title: "Wall Mount Stand",
    slug: "wall-mount-stand",
    image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop",
    price: 189,
    reason: "collector pieces",
  },
];

export default function CartPageUpgrade() {
  const [cartItems, setCartItems] = useState<CartItem[]>(DEMO_CART);
  const [savedItems, setSavedItems] = useState<SavedItem[]>(DEMO_SAVED);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | undefined>();
  const [usePoints, setUsePoints] = useState(false);

  const selectedDiscount = useMemo(
    () => DEMO_CODES.find((code) => code.id === selectedDiscountId) ?? null,
    [selectedDiscountId],
  );

  const pricing = useCartPricing({
    items: cartItems,
    shippingThreshold: 499,
    shippingCost: 39,
    selectedDiscount,
    usePoints,
    availablePoints: 240,
    pointRate: 0.1,
  });

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
  };

  const saveForLater = (id: string) => {
    setCartItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (!item) return current;
      setSavedItems((saved) => [...saved, { ...item }]);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const moveSavedToCart = (id: string) => {
    setSavedItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (!item) return current;
      setCartItems((cart) => [...cart, { ...item }]);
      return current.filter((entry) => entry.id !== id);
    });
  };

  if (!cartItems.length) {
    return (
      <main className="container py-10">
        <section className="rounded-3xl border bg-card px-6 py-12 text-center shadow-sm">
          <h1 className="text-4xl font-black uppercase tracking-wide">Shopping cart</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Your cart is empty. Tiny tragedy. Easy fix.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link to="/shop">Browse products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/collections/new-arrivals">New arrivals</Link>
            </Button>
          </div>
        </section>

        <div className="mt-10">
          <RecommendedProducts items={DEMO_RECOMMENDED} />
        </div>
      </main>
    );
  }

  return (
    <main className="container py-10">
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-black uppercase tracking-wide">Shopping cart</h1>
          <p className="mt-2 text-muted-foreground">
            Review your prints, extras, and discounts before checkout.
          </p>
        </header>

        <ShippingNotice
          qualifies={pricing.qualifiesForFreeShipping}
          amountUntilFreeShipping={pricing.amountUntilFreeShipping}
          threshold={499}
        />

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onIncrease={(id) => updateQuantity(id, 1)}
                onDecrease={(id) => updateQuantity(id, -1)}
                onRemove={removeItem}
                onSaveForLater={saveForLater}
              />
            ))}

            <SavedForLater
              items={savedItems}
              onMoveToCart={moveSavedToCart}
              onRemove={(id) => setSavedItems((current) => current.filter((item) => item.id !== id))}
            />
          </div>

          <CartSummary
            pricing={pricing}
            availableCodes={DEMO_CODES}
            selectedDiscountId={selectedDiscountId}
            onDiscountChange={setSelectedDiscountId}
            availablePoints={240}
            usePoints={usePoints}
            onUsePointsChange={setUsePoints}
            onCheckout={() => {
              // Replace with your checkout action.
              console.log("Proceeding to checkout");
            }}
          />
        </section>

        <RecommendedProducts items={DEMO_RECOMMENDED} />
      </div>
    </main>
  );
}
