import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseEntry {
  id: string;
  expense_date: string;
  supplier: string | null;
  category: string;
  description: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  receipt_reference: string | null;
  receipt_file_url: string | null;
  notes: string | null;
  is_recurring: boolean;
  created_at: string;
}

export const EXPENSE_CATEGORIES = [
  "Electricity",
  "Internet/Phone",
  "Software",
  "Marketing",
  "Shipping",
  "Packaging",
  "Materials",
  "Tools/Equipment",
  "Accounting/Legal",
  "Miscellaneous",
] as const;

export interface MonthlyData {
  // Income
  webshopSales: number;
  customOrderSales: number;
  shippingIncome: number;
  refunds: number;
  netSales: number;
  orderCount: number;
  customOrderCount: number;
  // Cost of Goods
  materialCosts: number;
  packagingCosts: number;
  outsourcedCosts: number;
  consumableCosts: number;
  totalCOGS: number;
  // Operating Expenses by category
  shippingExpenses: number;
  paymentFees: number;
  softwareExpenses: number;
  marketingExpenses: number;
  websiteExpenses: number;
  officeExpenses: number;
  electricityExpenses: number;
  equipmentExpenses: number;
  miscExpenses: number;
  totalOperating: number;
  // VAT
  outputVAT: number;
  inputVAT: number;
  vatDifference: number;
  // Summary
  totalIncome: number;
  totalExpenses: number;
  operatingResult: number;
  // Raw data
  expenses: ExpenseEntry[];
  orders: any[];
  customOrders: any[];
  // Comparison
  prevMonthResult?: number;
  sameMonthLastYearResult?: number;
  // YTD
  ytdIncome: number;
  ytdExpenses: number;
  ytdResult: number;
}

const EMPTY: MonthlyData = {
  webshopSales: 0, customOrderSales: 0, shippingIncome: 0, refunds: 0, netSales: 0,
  orderCount: 0, customOrderCount: 0,
  materialCosts: 0, packagingCosts: 0, outsourcedCosts: 0, consumableCosts: 0, totalCOGS: 0,
  shippingExpenses: 0, paymentFees: 0, softwareExpenses: 0, marketingExpenses: 0,
  websiteExpenses: 0, officeExpenses: 0, electricityExpenses: 0, equipmentExpenses: 0,
  miscExpenses: 0, totalOperating: 0,
  outputVAT: 0, inputVAT: 0, vatDifference: 0,
  totalIncome: 0, totalExpenses: 0, operatingResult: 0,
  expenses: [], orders: [], customOrders: [],
  ytdIncome: 0, ytdExpenses: 0, ytdResult: 0,
};

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();
  return { start, end };
}

function mapExpenseToCategory(cat: string) {
  const lower = cat.toLowerCase();
  if (lower === "shipping") return "shippingExpenses";
  if (lower === "materials") return "materialCosts";
  if (lower === "packaging") return "packagingCosts";
  if (lower === "software" || lower.includes("website")) return "softwareExpenses";
  if (lower === "marketing") return "marketingExpenses";
  if (lower === "electricity" || lower.includes("internet")) return "electricityExpenses";
  if (lower.includes("tool") || lower.includes("equipment")) return "equipmentExpenses";
  if (lower.includes("accounting") || lower.includes("legal") || lower.includes("office")) return "officeExpenses";
  return "miscExpenses";
}

export function useMonthlyDeclaration(year: number, month: number) {
  const [data, setData] = useState<MonthlyData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { start, end } = getMonthRange(year, month);
      const ytdStart = new Date(year, 0, 1).toISOString();

      // Previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prev = getMonthRange(prevYear, prevMonth);

      // Same month last year
      const lastYear = getMonthRange(year - 1, month);

      const [
        ordersRes, customOrdersRes, expensesRes,
        ytdOrdersRes, ytdExpensesRes, ytdCustomRes,
        prevOrdersRes, prevExpensesRes, prevCustomRes,
        lyOrdersRes, lyExpensesRes, lyCustomRes,
      ] = await Promise.all([
        supabase.from("orders").select("id, total, status, shipping_cost, created_at").gte("created_at", start).lt("created_at", end),
        supabase.from("custom_orders").select("id, final_agreed_price, quoted_price, status, payment_status, created_at").gte("created_at", start).lt("created_at", end),
        supabase.from("business_expenses").select("*").gte("expense_date", start.slice(0, 10)).lt("expense_date", end.slice(0, 10)),
        // YTD
        supabase.from("orders").select("id, total, status, shipping_cost").gte("created_at", ytdStart).lt("created_at", end),
        supabase.from("business_expenses").select("net_amount, vat_amount, gross_amount, category").gte("expense_date", ytdStart.slice(0, 10)).lt("expense_date", end.slice(0, 10)),
        supabase.from("custom_orders").select("final_agreed_price, quoted_price, payment_status").gte("created_at", ytdStart).lt("created_at", end).eq("payment_status", "paid"),
        // Previous month
        supabase.from("orders").select("total, shipping_cost").gte("created_at", prev.start).lt("created_at", prev.end),
        supabase.from("business_expenses").select("gross_amount").gte("expense_date", prev.start.slice(0, 10)).lt("expense_date", prev.end.slice(0, 10)),
        supabase.from("custom_orders").select("final_agreed_price, quoted_price, payment_status").gte("created_at", prev.start).lt("created_at", prev.end).eq("payment_status", "paid"),
        // Last year same month
        supabase.from("orders").select("total, shipping_cost").gte("created_at", lastYear.start).lt("created_at", lastYear.end),
        supabase.from("business_expenses").select("gross_amount").gte("expense_date", lastYear.start.slice(0, 10)).lt("expense_date", lastYear.end.slice(0, 10)),
        supabase.from("custom_orders").select("final_agreed_price, quoted_price, payment_status").gte("created_at", lastYear.start).lt("created_at", lastYear.end).eq("payment_status", "paid"),
      ]);

      if (!mounted) return;

      const orders = ordersRes.data ?? [];
      const customOrders = customOrdersRes.data ?? [];
      const expenses = (expensesRes.data ?? []) as ExpenseEntry[];

      // Income
      const completedOrders = orders.filter(o => !["cancelled", "refunded"].includes(o.status));
      const refundedOrders = orders.filter(o => o.status === "refunded");
      const webshopSales = completedOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const shippingIncome = completedOrders.reduce((s, o) => s + Number(o.shipping_cost || 0), 0);
      const refunds = refundedOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const paidCustom = customOrders.filter(c => c.payment_status === "paid");
      const customOrderSales = paidCustom.reduce((s, c) => s + Number(c.final_agreed_price || c.quoted_price || 0), 0);
      const netSales = webshopSales + customOrderSales + shippingIncome - refunds;

      // Expenses by category
      const expMap: Record<string, number> = {};
      let totalInputVAT = 0;
      expenses.forEach(e => {
        const key = mapExpenseToCategory(e.category);
        expMap[key] = (expMap[key] || 0) + Number(e.net_amount || 0);
        totalInputVAT += Number(e.vat_amount || 0);
      });

      const materialCosts = expMap.materialCosts || 0;
      const packagingCosts = expMap.packagingCosts || 0;
      const totalCOGS = materialCosts + packagingCosts;

      const shippingExpenses = expMap.shippingExpenses || 0;
      const softwareExpenses = expMap.softwareExpenses || 0;
      const marketingExpenses = expMap.marketingExpenses || 0;
      const electricityExpenses = expMap.electricityExpenses || 0;
      const equipmentExpenses = expMap.equipmentExpenses || 0;
      const officeExpenses = expMap.officeExpenses || 0;
      const miscExpenses = expMap.miscExpenses || 0;
      const totalOperating = shippingExpenses + softwareExpenses + marketingExpenses + electricityExpenses + equipmentExpenses + officeExpenses + miscExpenses;

      // VAT (25% Danish VAT on sales)
      const outputVAT = netSales * 0.2; // 25% included => netSales / 1.25 * 0.25
      const inputVAT = totalInputVAT;
      const vatDifference = outputVAT - inputVAT;

      const totalIncome = netSales;
      const totalExpenses = totalCOGS + totalOperating;
      const operatingResult = totalIncome - totalExpenses;

      // YTD
      const ytdOrders = ytdOrdersRes.data ?? [];
      const ytdCustom = ytdCustomRes.data ?? [];
      const ytdExp = ytdExpensesRes.data ?? [];
      const ytdIncome = ytdOrders.filter(o => true).reduce((s, o) => s + Number(o.total || 0), 0)
        + ytdCustom.reduce((s, c) => s + Number(c.final_agreed_price || c.quoted_price || 0), 0);
      const ytdExpensesTotal = ytdExp.reduce((s, e) => s + Number(e.gross_amount || 0), 0);

      // Previous month
      const prevInc = (prevOrdersRes.data ?? []).reduce((s, o) => s + Number(o.total || 0), 0)
        + (prevCustomRes.data ?? []).reduce((s, c) => s + Number(c.final_agreed_price || c.quoted_price || 0), 0);
      const prevExp = (prevExpensesRes.data ?? []).reduce((s, e) => s + Number(e.gross_amount || 0), 0);

      // Last year same month
      const lyInc = (lyOrdersRes.data ?? []).reduce((s, o) => s + Number(o.total || 0), 0)
        + (lyCustomRes.data ?? []).reduce((s, c) => s + Number(c.final_agreed_price || c.quoted_price || 0), 0);
      const lyExp = (lyExpensesRes.data ?? []).reduce((s, e) => s + Number(e.gross_amount || 0), 0);

      setData({
        webshopSales, customOrderSales, shippingIncome, refunds, netSales,
        orderCount: completedOrders.length, customOrderCount: paidCustom.length,
        materialCosts, packagingCosts, outsourcedCosts: 0, consumableCosts: 0, totalCOGS,
        shippingExpenses, paymentFees: 0, softwareExpenses, marketingExpenses,
        websiteExpenses: 0, officeExpenses, electricityExpenses, equipmentExpenses,
        miscExpenses, totalOperating,
        outputVAT, inputVAT, vatDifference,
        totalIncome, totalExpenses, operatingResult,
        expenses, orders, customOrders,
        prevMonthResult: prevInc - prevExp,
        sameMonthLastYearResult: lyInc - lyExp,
        ytdIncome, ytdExpenses: ytdExpensesTotal, ytdResult: ytdIncome - ytdExpensesTotal,
      });
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [year, month]);

  return { data, loading };
}

export function useBusinessExpenses(year: number, month: number) {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { start, end } = getMonthRange(year, month);
    const { data } = await supabase
      .from("business_expenses")
      .select("*")
      .gte("expense_date", start.slice(0, 10))
      .lt("expense_date", end.slice(0, 10))
      .order("expense_date", { ascending: false });
    setExpenses((data ?? []) as ExpenseEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [year, month]);

  const addExpense = async (entry: Omit<ExpenseEntry, "id" | "created_at">) => {
    const { error } = await supabase.from("business_expenses").insert(entry as any);
    if (!error) await load();
    return error;
  };

  const updateExpense = async (id: string, entry: Partial<ExpenseEntry>) => {
    const { error } = await supabase.from("business_expenses").update(entry as any).eq("id", id);
    if (!error) await load();
    return error;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("business_expenses").delete().eq("id", id);
    if (!error) await load();
    return error;
  };

  return { expenses, loading, addExpense, updateExpense, deleteExpense, reload: load };
}
