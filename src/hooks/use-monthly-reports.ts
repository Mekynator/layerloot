import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MonthlyData } from "@/hooks/use-monthly-declaration";

export interface MonthlyReport {
  id: string;
  month_key: string;
  year: number;
  month: number;
  generated_at: string;
  pdf_file_url: string | null;
  csv_file_url: string | null;
  snapshot_json: MonthlyData;
  notes: string | null;
  created_at: string;
}

export function useMonthlyReports() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("monthly_reports")
      .select("*")
      .order("month_key", { ascending: false });
    setReports((data ?? []) as unknown as MonthlyReport[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateSnapshot = async (year: number, month: number, data: MonthlyData) => {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    // Remove circular/large data from snapshot (keep summaries, drop raw arrays)
    const snapshot = {
      ...data,
      orders: [],
      customOrders: [],
      expenses: data.expenses.map(e => ({
        id: e.id,
        expense_date: e.expense_date,
        supplier: e.supplier,
        category: e.category,
        description: e.description,
        net_amount: e.net_amount,
        vat_amount: e.vat_amount,
        gross_amount: e.gross_amount,
        receipt_reference: e.receipt_reference,
        receipt_file_url: e.receipt_file_url,
      })),
    };

    const { error } = await supabase.from("monthly_reports").insert({
      month_key: monthKey,
      year,
      month,
      snapshot_json: snapshot as unknown as Record<string, unknown>,
    } as never);

    if (!error) await load();
    return error;
  };

  const deleteReport = async (id: string) => {
    const { error } = await supabase.from("monthly_reports").delete().eq("id", id);
    if (!error) await load();
    return error;
  };

  return { reports, loading, generateSnapshot, deleteReport, reload: load };
}
