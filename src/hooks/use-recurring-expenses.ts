import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecurringExpense {
  id: string;
  title: string;
  vendor_name: string | null;
  category: string;
  subcategory: string | null;
  default_net_amount: number;
  default_vat_amount: number;
  default_gross_amount: number;
  billing_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useRecurringExpenses() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recurring_expenses")
      .select("*")
      .order("category");
    setItems((data ?? []) as RecurringExpense[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (entry: Omit<RecurringExpense, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("recurring_expenses").insert(entry as never);
    if (!error) await load();
    return error;
  };

  const update = async (id: string, entry: Partial<RecurringExpense>) => {
    const { error } = await supabase.from("recurring_expenses").update(entry as never).eq("id", id);
    if (!error) await load();
    return error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
    if (!error) await load();
    return error;
  };

  const applyToMonth = async (year: number, month: number) => {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const active = items.filter(i => i.is_active);
    if (active.length === 0) return { applied: 0, skipped: 0 };

    // Check existing recurring entries for this month
    const { data: existing } = await supabase
      .from("business_expenses")
      .select("description, supplier, category")
      .eq("source", "recurring")
      .eq("month_key", monthKey);

    const existingSet = new Set(
      (existing ?? []).map(e => `${e.category}|${e.supplier}|${e.description}`)
    );

    let applied = 0;
    let skipped = 0;

    for (const rec of active) {
      const key = `${rec.category}|${rec.vendor_name}|${rec.title}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      const expenseDate = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(rec.billing_day, 28)).padStart(2, "0")}`;

      await supabase.from("business_expenses").insert({
        expense_date: expenseDate,
        supplier: rec.vendor_name,
        category: rec.category,
        subcategory: rec.subcategory,
        description: rec.title,
        net_amount: rec.default_net_amount,
        vat_amount: rec.default_vat_amount,
        gross_amount: rec.default_gross_amount,
        is_recurring: true,
        source: "recurring",
      } as Record<string, unknown>);
      applied++;
    }

    return { applied, skipped };
  };

  return { items, loading, add, update, remove, applyToMonth, reload: load };
}
