import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  slug?: string;
  quantity: number;
}

type AddItemOptions = {
  sourceRect?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  sourceImage?: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, options?: AddItemOptions) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CART_STORAGE_KEY = "layerloot-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

const readStoredCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        typeof item.quantity === "number",
    );
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, "quantity">, options?: AddItemOptions) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);

      const nextItems = existing
        ? prev.map((i) =>
            i.id === newItem.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                }
              : i,
          )
        : [
            ...prev,
            {
              ...newItem,
              quantity: 1,
            },
          ];

      if (typeof window !== "undefined") {
        const nextTotalItems = nextItems.reduce((sum, item) => sum + item.quantity, 0);
        const nextQuantity = nextItems.find((item) => item.id === newItem.id)?.quantity ?? 1;

        window.dispatchEvent(
          new CustomEvent("layerloot:add-to-cart", {
            detail: {
              id: newItem.id,
              name: newItem.name,
              image: options?.sourceImage ?? newItem.image ?? null,
              sourceRect: options?.sourceRect ?? null,
              totalItems: nextTotalItems,
              quantity: nextQuantity,
              timestamp: Date.now(),
            },
          }),
        );
      }

      return nextItems;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity,
            }
          : i,
      ),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }

  return ctx;
};
