import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isProductSaved, saveProduct, unsaveProduct } from "@/lib/savedItems";
import { useToast } from "@/hooks/use-toast";

const LOCAL_SAVED_KEY = "layerloot-saved-items";

export function useProductSavedState(productId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const check = async () => {
      if (user) {
        const { saved: isSaved } = await isProductSaved(productId, user.id);
        setSaved(isSaved);
      } else {
        try {
          const raw = window.localStorage.getItem(LOCAL_SAVED_KEY);
          if (!raw) return setSaved(false);
          const arr = JSON.parse(raw);
          setSaved(Array.isArray(arr) && arr.includes(productId));
        } catch {
          setSaved(false);
        }
      }
    };
    check();
  }, [user, productId]);

  const toggleSave = async () => {
    if (!productId) return;
    setLoading(true);
    let changed = false;
    if (user) {
      if (!saved) {
        const { error } = await saveProduct(productId, user.id);
        if (!error) {
          setSaved(true);
          toast({ title: "Saved!" });
          changed = true;
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      } else {
        const { error } = await unsaveProduct(productId, user.id);
        if (!error) {
          setSaved(false);
          toast({ title: "Removed from saved" });
          changed = true;
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      }
    } else {
      try {
        const raw = window.localStorage.getItem(LOCAL_SAVED_KEY);
        let arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        if (!saved) {
          if (!arr.includes(productId)) arr.push(productId);
          window.localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(arr));
          setSaved(true);
          toast({ title: "Saved!" });
          changed = true;
        } else {
          arr = arr.filter((id: string) => id !== productId);
          window.localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(arr));
          setSaved(false);
          toast({ title: "Removed from saved" });
          changed = true;
        }
      } catch {
        toast({ title: "Error", description: "Could not save item", variant: "destructive" });
      }
    }
    if (changed) {
      window.dispatchEvent(new Event("layerloot:saved-items-updated"));
    }
    setLoading(false);
  };

  return { saved, loading, toggleSave };
}
