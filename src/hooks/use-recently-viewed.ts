import { useCallback, useEffect, useState } from "react";

const PRODUCTS_KEY = "layerloot_recently_viewed_products";
const CATEGORIES_KEY = "layerloot_recently_viewed_categories";
const MAX_ITEMS = 20;

export interface ViewedProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  viewedAt: number;
}

export interface ViewedCategory {
  id: string;
  name: string;
  slug: string;
  viewedAt: number;
}

function readStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

export function useRecentlyViewedProducts() {
  const [items, setItems] = useState<ViewedProduct[]>(() => readStorage<ViewedProduct>(PRODUCTS_KEY));

  const trackProduct = useCallback((product: Omit<ViewedProduct, "viewedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      writeStorage(PRODUCTS_KEY, next);
      return next;
    });
  }, []);

  return { recentProducts: items, trackProduct };
}

export function useRecentlyViewedCategories() {
  const [items, setItems] = useState<ViewedCategory[]>(() => readStorage<ViewedCategory>(CATEGORIES_KEY));

  const trackCategory = useCallback((category: Omit<ViewedCategory, "viewedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((c) => c.id !== category.id);
      const next = [{ ...category, viewedAt: Date.now() }, ...filtered].slice(0, 10);
      writeStorage(CATEGORIES_KEY, next);
      return next;
    });
  }, []);

  return { recentCategories: items, trackCategory };
}
