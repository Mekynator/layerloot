import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedProducts } from "@/lib/savedItems";

/**
 * Returns the count of saved items for the current user, auto-updating on save/remove events.
 */
export function useSavedItemsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);

  const fetchCount = useCallback(async () => {
    if (!user) return setCount(0);
    const { data, error } = await getSavedProducts(user.id);
    if (!error && Array.isArray(data)) setCount(data.length);
    else setCount(0);
  }, [user]);

  useEffect(() => {
    fetchCount();
    // Listen for custom events dispatched on save/remove
    const handler = () => fetchCount();
    window.addEventListener("layerloot:saved-items-updated", handler);
    return () => window.removeEventListener("layerloot:saved-items-updated", handler);
  }, [fetchCount]);

  return count;
}
