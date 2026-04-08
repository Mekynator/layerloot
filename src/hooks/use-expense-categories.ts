import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setCategories((data ?? []) as ExpenseCategory[]);
      setLoading(false);
    };
    load();
  }, []);

  const categoryNames = categories.map(c => c.name);

  return { categories, categoryNames, loading };
}
